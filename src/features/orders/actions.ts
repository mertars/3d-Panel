import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import {
  createOrder,
  db,
  listChannels,
  listFailures,
  listOrders,
  listProducts,
  ORDER_STATUSES,
  setOrderStatus,
  type Order,
  type OrderStatus,
  type Quote,
} from '@/db'
import { useCatalog } from '@/features/calculator/useCalculation'
import { formatGram } from '@/lib/format'
import { filamentNeeds, realWastePercent, type PricingSettings } from '@/lib/pricing'
import type { Catalog } from '@/features/calculator/draft'
import { useSettings } from '@/store/settings'
import { toast } from '@/store/toast'
import { customOrderItem, itemFromProduct, totalsFor } from './items'

export const STATUS_LABEL = Object.fromEntries(ORDER_STATUSES.map((s) => [s.value, s.label])) as Record<OrderStatus, string>

export const STATUS_TONE: Record<OrderStatus, 'neutral' | 'info' | 'warning' | 'brand' | 'success' | 'danger'> = {
  new: 'neutral',
  printing: 'brand',
  ready: 'info',
  shipped: 'warning',
  delivered: 'success',
  cancelled: 'danger',
}

/** Kanban sütunları (iptal ayrı gösterilir) */
export const BOARD_STATUSES: OrderStatus[] = ['new', 'printing', 'ready', 'shipped', 'delivered']

/** Durumu değiştirir; stok düştüyse / iade edildiyse bildirir, "Geri al" eski duruma döndürür */
export async function changeStatus(order: Pick<Order, 'id' | 'number'>, status: OrderStatus) {
  const res = await setOrderStatus(order.id, status)
  if (!res || res.previous === status) return
  const extra = res.consumed
    ? ' · filament stoktan düşüldü, yazıcı saatine eklendi'
    : res.restored
      ? ' · filament stoğa iade edildi'
      : ''
  const missing = res.consumed ? res.order.consumption?.missing.reduce((s, m) => s + m.grams, 0) ?? 0 : 0
  toast(`${order.number} → ${STATUS_LABEL[status]}${extra}${missing > 0 ? ` (stokta ${formatGram(missing)} eksik)` : ''}`, {
    tone: missing > 0 ? 'danger' : 'success',
    duration: 6000,
    action: { label: 'Geri al', onClick: () => void setOrderStatus(order.id, res.previous) },
  })
}

/** Kabul edilen tekliften sipariş: ürün kalemleri güncel ürün hesabıyla, teklif fiyatıyla */
export async function createOrderFromQuote(q: Quote, catalog: Catalog, settings: PricingSettings): Promise<Order> {
  const products = await listProducts()
  const items = q.items
    .filter((i) => i.name.trim())
    .map((i) => {
      const p = i.productId ? products.find((x) => x.id === i.productId) : undefined
      if (!p) return { ...customOrderItem(), name: i.name, quantity: i.quantity, unitPrice: i.unitPrice }
      const v = i.variantId ? (p.variants.find((x) => x.id === i.variantId) ?? null) : null
      return { ...itemFromProduct(p, v, i.quantity, catalog, settings, i.unitPrice), name: i.name }
    })
  return createOrder({ customer: q.customer, items, note: q.note, quoteId: q.id })
}

export const orderForQuote = (quoteId: string) => db.orders.filter((o) => o.quoteId === quoteId).first()

/** Siparişler + kanallar + fireler + hesaplanmış toplamlar */
export function useOrdersData() {
  const orders = useLiveQuery(listOrders, [])
  const failures = useLiveQuery(listFailures, [])
  const channels = useLiveQuery(listChannels, [], [])
  const catalog = useCatalog()
  const settings = useSettings()
  const withTotals = useMemo(
    () => (orders ?? []).map((order) => ({ order, totals: totalsFor(order, channels, settings) })),
    [orders, channels, settings],
  )
  const waste = useMemo(() => {
    const failedGrams = (failures ?? []).reduce((s, f) => s + f.grams, 0)
    let usedGrams = 0
    for (const o of orders ?? []) if (o.consumption) for (const g of filamentNeeds(o.items).values()) usedGrams += g
    return { failedGrams, usedGrams, real: realWastePercent(failedGrams, usedGrams), count: failures?.length ?? 0 }
  }, [orders, failures])
  return { orders: withTotals, failures: failures ?? [], channels, catalog, settings, waste, loaded: !!orders && !!failures && catalog.loaded }
}
