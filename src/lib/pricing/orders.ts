/**
 * Sipariş hesapları (SAF): ciro, kanal kesintisi, net kâr, filament ihtiyacı,
 * stok yeterliliği, stoktan düşme planı, gerçek fire oranı.
 */
import { channelDeduction } from './engine'
import type { ChannelFeeInput } from './types'

export interface OrderItemLike {
  quantity: number
  unitPrice: number
  unitCost: number
  hoursPerUnit: number
  depreciationPerUnit: number
  printerId: string | null
  filaments: { filamentId: string; grams: number }[]
}

export interface OrderLike {
  items: OrderItemLike[]
  discount: number
  shippingPayer: 'customer' | 'seller'
  shippingCost: number
}

export interface OrderTotals {
  /** Σ adet × birim fiyat */
  gross: number
  discount: number
  /** Ciro = brüt − indirim (müşterinin ödediği kargo hariç) */
  revenue: number
  channelFee: number
  /** Ürün maliyeti (snapshot) */
  cost: number
  /** Satıcının ödediği kargo */
  sellerShipping: number
  netProfit: number
  /** % — ciro 0 ise null */
  margin: number | null
  hours: number
  units: number
  depreciation: number
}

const pos = (x: number) => (Number.isFinite(x) && x > 0 ? x : 0)

/**
 * Kanal kesintisi sipariş cirosu üzerinden hesaplanır. Kanalın kendi "satıcı kargo" değeri
 * kullanılmaz (siparişin kargo alanı geçerlidir) — çağıran taraf sellerShipping=0 vermeli.
 */
export function orderTotals(o: OrderLike, fee: ChannelFeeInput | null): OrderTotals {
  let gross = 0
  let cost = 0
  let hours = 0
  let units = 0
  let depreciation = 0
  for (const i of o.items) {
    const q = pos(i.quantity)
    gross += q * pos(i.unitPrice)
    cost += q * pos(i.unitCost)
    hours += q * pos(i.hoursPerUnit)
    depreciation += q * pos(i.depreciationPerUnit)
    units += q
  }
  const discount = Math.min(pos(o.discount), gross)
  const revenue = gross - discount
  const channelFee = fee && revenue > 0 ? channelDeduction(revenue, { ...fee, sellerShipping: 0 }) : 0
  const sellerShipping = o.shippingPayer === 'seller' ? pos(o.shippingCost) : 0
  const netProfit = revenue - channelFee - cost - sellerShipping
  return {
    gross,
    discount,
    revenue,
    channelFee,
    cost,
    sellerShipping,
    netProfit,
    margin: revenue > 0 ? (netProfit / revenue) * 100 : null,
    hours,
    units,
    depreciation,
  }
}

/** Toplam filament ihtiyacı (filamentId → gram) */
export function filamentNeeds(items: OrderItemLike[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const i of items) for (const f of i.filaments) m.set(f.filamentId, (m.get(f.filamentId) ?? 0) + pos(i.quantity) * pos(f.grams))
  return m
}

/** Yazıcı başına saat ve amortisman payı */
export function printerLoad(items: OrderItemLike[]): { printerId: string; hours: number; depreciation: number }[] {
  const m = new Map<string, { hours: number; depreciation: number }>()
  for (const i of items) {
    if (!i.printerId) continue
    const cur = m.get(i.printerId) ?? { hours: 0, depreciation: 0 }
    cur.hours += pos(i.quantity) * pos(i.hoursPerUnit)
    cur.depreciation += pos(i.quantity) * pos(i.depreciationPerUnit)
    m.set(i.printerId, cur)
  }
  return [...m].map(([printerId, v]) => ({ printerId, ...v }))
}

/* ───────────── Stok ───────────── */

export interface StockSpool {
  id: string
  filamentTypeId: string
  remainingGrams: number
}

/** Bir filament referansının stok kaynağı: belirli makara veya türün tüm makaraları */
export type StockRef = { kind: 'spool'; spoolId: string } | { kind: 'type'; typeId: string } | { kind: 'none' }

export interface StockLine {
  filamentId: string
  need: number
  available: number
  ok: boolean
}

function candidates(ref: StockRef, spools: StockSpool[]): StockSpool[] {
  if (ref.kind === 'spool') return spools.filter((s) => s.id === ref.spoolId)
  if (ref.kind === 'type') return spools.filter((s) => s.filamentTypeId === ref.typeId)
  return []
}

/**
 * "Filament yeter mi?" — aynı stok kaynağını kullanan ihtiyaçlar birlikte değerlendirilir
 * (iki kalem aynı makarayı kullanıyorsa ihtiyaçları toplanır).
 */
export function stockCheck(needs: Map<string, number>, spools: StockSpool[], resolve: (filamentId: string) => StockRef): StockLine[] {
  const keyOf = (ref: StockRef) => (ref.kind === 'spool' ? `s:${ref.spoolId}` : ref.kind === 'type' ? `t:${ref.typeId}` : 'none')
  const groupNeed = new Map<string, number>()
  for (const [id, g] of needs) {
    const k = keyOf(resolve(id))
    groupNeed.set(k, (groupNeed.get(k) ?? 0) + g)
  }
  return [...needs].map(([filamentId, need]) => {
    const ref = resolve(filamentId)
    const available = candidates(ref, spools).reduce((s, x) => s + pos(x.remainingGrams), 0)
    const total = groupNeed.get(keyOf(ref)) ?? need
    return { filamentId, need, available, ok: ref.kind !== 'none' && total <= available + 1e-9 }
  })
}

export interface ConsumptionPlan {
  spools: { spoolId: string; grams: number }[]
  missing: { filamentId: string; grams: number }[]
}

/**
 * Stoktan düşme planı. Belirli makara → o makaradan; tür / stok ortalaması → o türün
 * makaralarından, en az kalandan başlayarak (yarım makaralar önce biter). Yetmeyen kısım "missing".
 */
export function planConsumption(needs: Map<string, number>, spools: StockSpool[], resolve: (filamentId: string) => StockRef): ConsumptionPlan {
  const left = new Map(spools.map((s) => [s.id, pos(s.remainingGrams)]))
  const used = new Map<string, number>()
  const missing: ConsumptionPlan['missing'] = []
  for (const [filamentId, need] of needs) {
    let rest = need
    const pool = candidates(resolve(filamentId), spools).sort((a, b) => (left.get(a.id) ?? 0) - (left.get(b.id) ?? 0))
    for (const s of pool) {
      if (rest <= 1e-9) break
      const take = Math.min(rest, left.get(s.id) ?? 0)
      if (take <= 0) continue
      left.set(s.id, (left.get(s.id) ?? 0) - take)
      used.set(s.id, (used.get(s.id) ?? 0) + take)
      rest -= take
    }
    if (rest > 1e-9) missing.push({ filamentId, grams: rest })
  }
  return { spools: [...used].map(([spoolId, grams]) => ({ spoolId, grams })), missing }
}

/** Gerçek fire oranı (%) = başarısız gram / (başarısız + başarılı kullanılan gram) */
export function realWastePercent(failedGrams: number, usedGrams: number): number | null {
  const total = pos(failedGrams) + pos(usedGrams)
  return total > 0 ? (pos(failedGrams) / total) * 100 : null
}

/* ───────────── Başa baş & kapasite ───────────── */

/** Yatırımı çıkarmak için gereken ek satış sayısı (yukarı yuvarlanır); kâr ≤ 0 ise null */
export function salesToBreakEven(investment: number, recovered: number, avgProfitPerSale: number): number | null {
  const remaining = investment - recovered
  if (remaining <= 0) return 0
  if (!(avgProfitPerSale > 0)) return null
  return Math.ceil(remaining / avgProfitPerSale - 1e-9)
}

/** Aylık kapasite (saat) = yazıcı sayısı × günlük saat × gün */
export function monthlyCapacityHours(printers: number, hoursPerDay: number, days = 30): number {
  return pos(printers) * pos(hoursPerDay) * pos(days)
}
