/**
 * Siparişler ve fire kayıtları: stoktan düşme / geri alma tek transaction içinde yapılır.
 */
import { filamentNeeds, planConsumption, printerLoad, type StockRef } from '@/lib/pricing'
import { db, newId } from './db'
import { getSettings } from './repository'
import type { AppSettings, Consumption, Failure, Order, OrderItem, OrderStatus, Spool } from './types'

const AVG = 'avg:'

/** Filament referansının stok kaynağı (makara / tür / stok ortalaması → tür) */
export async function stockResolver(): Promise<(id: string) => StockRef> {
  const [spools, types] = await Promise.all([db.spools.toArray(), db.filamentTypes.toArray()])
  const spoolIds = new Set(spools.map((s) => s.id))
  const typeIds = new Set(types.map((t) => t.id))
  return (id) => {
    if (spoolIds.has(id)) return { kind: 'spool', spoolId: id }
    const typeId = id.startsWith(AVG) ? id.slice(AVG.length) : id
    return typeIds.has(typeId) ? { kind: 'type', typeId } : { kind: 'none' }
  }
}

/** Stok düşme hangi durumlarda geçerli */
export function consumesStock(status: OrderStatus, consumeOn: AppSettings['consumeOn']): boolean {
  if (status === 'cancelled' || status === 'new') return false
  if (consumeOn === 'delivered') return status === 'delivered'
  return true // Baskıda, Hazır, Kargoda, Teslim edildi
}

async function applyConsumption(items: OrderItem[] | { filamentId: string; grams: number }[], printers: Consumption['printers']): Promise<Consumption> {
  const needs =
    items.length && 'quantity' in items[0]
      ? filamentNeeds(items as OrderItem[])
      : new Map((items as { filamentId: string; grams: number }[]).map((x) => [x.filamentId, x.grams]))
  const spools = await db.spools.toArray()
  const plan = planConsumption(needs, spools, await stockResolver())
  for (const u of plan.spools) {
    const s = spools.find((x) => x.id === u.spoolId)
    if (s) await db.spools.update(s.id, { remainingGrams: Math.max(0, s.remainingGrams - u.grams) })
  }
  return { at: Date.now(), spools: plan.spools, missing: plan.missing, printers }
}

async function revertConsumption(c: Consumption) {
  for (const u of c.spools) {
    const s: Spool | undefined = await db.spools.get(u.spoolId)
    // Makara silinmişse geri eklenecek yer yok — sessizce atla
    if (s) await db.spools.update(s.id, { remainingGrams: s.remainingGrams + u.grams })
  }
}

/* ───────────── Siparişler ───────────── */

export const listOrders = () => db.orders.orderBy('createdAt').reverse().toArray()
export const getOrder = (id: string) => db.orders.get(id)

export async function nextOrderNumber(): Promise<string> {
  const prefix = `S-${new Date().getFullYear()}-`
  const same = await db.orders.where('number').startsWith(prefix).toArray()
  const seq = same.reduce((m, o) => Math.max(m, Number(o.number.slice(prefix.length)) || 0), 0) + 1
  return `${prefix}${String(seq).padStart(3, '0')}`
}

export function emptyOrder(number: string, patch: Partial<Order> = {}): Order {
  const now = Date.now()
  return {
    id: newId(),
    number,
    customer: '',
    contact: '',
    channelId: null,
    items: [],
    discount: 0,
    shippingPayer: 'customer',
    shippingCost: 0,
    paid: false,
    dueDate: null,
    note: '',
    status: 'new',
    quoteId: null,
    consumption: null,
    createdAt: now,
    updatedAt: now,
    ...patch,
  }
}

export async function createOrder(patch: Partial<Order> = {}): Promise<Order> {
  const o = emptyOrder(await nextOrderNumber(), patch)
  await db.orders.add(o)
  return o
}

const TX_TABLES = () => [db.orders, db.spools, db.filamentTypes, db.settings] as const

/**
 * Siparişi kaydeder. Stok düşülmüşse kalemler değişmiş olabileceği için
 * önce geri alınır, sonra yeni kalemlerle yeniden düşülür.
 */
export async function saveOrder(o: Order): Promise<Order> {
  return db.transaction('rw', TX_TABLES(), async () => {
    let next = { ...o, updatedAt: Date.now() }
    const stored = await db.orders.get(o.id)
    const consumption = stored?.consumption ?? null
    if (consumption) {
      await revertConsumption(consumption)
      next = { ...next, consumption: await applyConsumption(next.items, printerLoad(next.items)) }
    }
    await db.orders.put(next)
    return next
  })
}

export interface StatusChange {
  order: Order
  /** Bu değişiklikte stok düşüldü mü / geri alındı mı */
  consumed: boolean
  restored: boolean
  previous: OrderStatus
}

/** Durumu değiştirir; ayara göre stoğu düşer veya geri alır (yazıcı saatleri de birlikte) */
export async function setOrderStatus(id: string, status: OrderStatus): Promise<StatusChange | undefined> {
  return db.transaction('rw', TX_TABLES(), async () => {
    const o = await db.orders.get(id)
    if (!o) return
    const settings = await getSettings()
    const should = consumesStock(status, settings.consumeOn)
    let consumption = o.consumption
    let consumed = false
    let restored = false
    if (should && !consumption) {
      consumption = await applyConsumption(o.items, printerLoad(o.items))
      consumed = true
    } else if (!should && consumption) {
      await revertConsumption(consumption)
      consumption = null
      restored = true
    }
    const order: Order = { ...o, status, consumption, updatedAt: Date.now() }
    await db.orders.put(order)
    return { order, consumed, restored, previous: o.status }
  })
}

export async function deleteOrder(id: string): Promise<Order | undefined> {
  return db.transaction('rw', TX_TABLES(), async () => {
    const o = await db.orders.get(id)
    if (!o) return
    if (o.consumption) await revertConsumption(o.consumption)
    await db.orders.delete(id)
    return o
  })
}

/** Silinen siparişi geri getirir (stok düşülmüşse yeniden düşer) */
export async function restoreOrder(o: Order) {
  await db.transaction('rw', TX_TABLES(), async () => {
    const consumption = o.consumption ? await applyConsumption(o.items, printerLoad(o.items)) : null
    await db.orders.put({ ...o, consumption })
  })
}

/* ───────────── Fire kayıtları ───────────── */

export const listFailures = () => db.failures.orderBy('at').reverse().toArray()

export async function addFailure(input: Omit<Failure, 'id' | 'consumption' | 'at'> & { at?: number }): Promise<Failure> {
  return db.transaction('rw', [db.failures, db.spools, db.filamentTypes], async () => {
    const consumption = await applyConsumption(
      [{ filamentId: input.filamentId, grams: input.grams }],
      input.printerId ? [{ printerId: input.printerId, hours: input.hours, depreciation: 0 }] : [],
    )
    const f: Failure = { ...input, id: newId(), at: input.at ?? Date.now(), consumption }
    await db.failures.add(f)
    return f
  })
}

export async function deleteFailure(id: string): Promise<Failure | undefined> {
  return db.transaction('rw', [db.failures, db.spools], async () => {
    const f = await db.failures.get(id)
    if (!f) return
    if (f.consumption) await revertConsumption(f.consumption)
    await db.failures.delete(id)
    return f
  })
}

export async function restoreFailure(f: Failure) {
  await db.transaction('rw', [db.failures, db.spools, db.filamentTypes], async () => {
    const consumption = await applyConsumption([{ filamentId: f.filamentId, grams: f.grams }], f.consumption?.printers ?? [])
    await db.failures.put({ ...f, consumption })
  })
}
