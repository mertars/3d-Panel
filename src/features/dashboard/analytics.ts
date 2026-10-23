/**
 * Kâr panosu hesapları (SAF). Siparişler toplamlarıyla birlikte gelir; iptaller hariç tutulur.
 */
import type { Order } from '@/db'
import { filamentNeeds, type OrderTotals } from '@/lib/pricing'

export type RangeKey = 'thisMonth' | 'lastMonth' | 'last90' | 'thisYear' | 'custom'

export interface DateRange {
  /** dahil */
  start: number
  /** hariç */
  end: number
}

export interface OrderWithTotals {
  order: Order
  totals: OrderTotals
}

const DAY = 86400000

/** Yerel gece yarısı */
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

export function rangeFor(key: RangeKey, now: Date, custom?: { from: string; to: string }): DateRange {
  const y = now.getFullYear()
  const m = now.getMonth()
  const tomorrow = startOfDay(now).getTime() + DAY
  switch (key) {
    case 'thisMonth':
      return { start: new Date(y, m, 1).getTime(), end: tomorrow }
    case 'lastMonth':
      return { start: new Date(y, m - 1, 1).getTime(), end: new Date(y, m, 1).getTime() }
    case 'last90':
      return { start: tomorrow - 90 * DAY, end: tomorrow }
    case 'thisYear':
      return { start: new Date(y, 0, 1).getTime(), end: tomorrow }
    case 'custom': {
      const from = custom?.from ? new Date(`${custom.from}T00:00:00`).getTime() : tomorrow - 30 * DAY
      const to = custom?.to ? new Date(`${custom.to}T00:00:00`).getTime() + DAY : tomorrow
      return from < to ? { start: from, end: to } : { start: to - DAY, end: from + DAY }
    }
  }
}

/** Karşılaştırma dönemi: takvim aralıklarında bir önceki ay/yıl (aynı gün sayısı), diğerlerinde eşit uzunlukta önceki dönem */
export function previousRange(key: RangeKey, r: DateRange): DateRange {
  const s = new Date(r.start)
  if (key === 'thisMonth' || key === 'lastMonth') {
    const start = new Date(s.getFullYear(), s.getMonth() - 1, 1).getTime()
    const monthEnd = new Date(s.getFullYear(), s.getMonth(), 1).getTime()
    return { start, end: Math.min(monthEnd, start + (r.end - r.start)) }
  }
  if (key === 'thisYear') {
    const start = new Date(s.getFullYear() - 1, 0, 1).getTime()
    return { start, end: start + (r.end - r.start) }
  }
  return { start: r.start - (r.end - r.start), end: r.start }
}

export const inRange = (t: number, r: DateRange) => t >= r.start && t < r.end
const active = (o: Order) => o.status !== 'cancelled'

export interface PeriodStats {
  revenue: number
  netProfit: number
  /** % — ciro 0 ise null */
  margin: number | null
  hours: number
  orders: number
  units: number
}

export function periodStats(list: OrderWithTotals[], r: DateRange): PeriodStats {
  let revenue = 0
  let netProfit = 0
  let hours = 0
  let orders = 0
  let units = 0
  for (const { order, totals } of list) {
    if (!active(order) || !inRange(order.createdAt, r)) continue
    revenue += totals.revenue
    netProfit += totals.netProfit
    hours += totals.hours
    units += totals.units
    orders++
  }
  return { revenue, netProfit, margin: revenue > 0 ? (netProfit / revenue) * 100 : null, hours, orders, units }
}

/** Yüzde değişim; önceki 0 ise null */
export function changePercent(cur: number, prev: number): number | null {
  if (prev === 0) return cur === 0 ? 0 : null
  return ((cur - prev) / Math.abs(prev)) * 100
}

export interface MonthPoint {
  /** YYYY-MM */
  key: string
  label: string
  revenue: number
  netProfit: number
}

const monthLabel = new Intl.DateTimeFormat('tr-TR', { month: 'short', year: '2-digit' })

/** Aralığın bittiği aydan geriye en az `minMonths` ay */
export function monthlySeries(list: OrderWithTotals[], r: DateRange, minMonths = 6): MonthPoint[] {
  const last = new Date(r.end - 1)
  const first = new Date(r.start)
  const spanMonths = (last.getFullYear() - first.getFullYear()) * 12 + last.getMonth() - first.getMonth() + 1
  const count = Math.max(minMonths, Math.min(24, spanMonths))
  const points: MonthPoint[] = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(last.getFullYear(), last.getMonth() - i, 1)
    points.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: monthLabel.format(d), revenue: 0, netProfit: 0 })
  }
  const byKey = new Map(points.map((p) => [p.key, p]))
  for (const { order, totals } of list) {
    if (!active(order)) continue
    const d = new Date(order.createdAt)
    const p = byKey.get(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    if (!p) continue
    p.revenue += totals.revenue
    p.netProfit += totals.netProfit
  }
  return points
}

export interface Share {
  key: string
  label: string
  value: number
}

export function channelShares(list: OrderWithTotals[], r: DateRange, channelName: (id: string | null) => string): Share[] {
  const m = new Map<string, Share>()
  for (const { order, totals } of list) {
    if (!active(order) || !inRange(order.createdAt, r) || totals.revenue <= 0) continue
    const key = order.channelId ?? 'none'
    const cur = m.get(key) ?? { key, label: channelName(order.channelId), value: 0 }
    cur.value += totals.revenue
    m.set(key, cur)
  }
  return [...m.values()].sort((a, b) => b.value - a.value)
}

export interface TopProduct {
  productId: string
  name: string
  units: number
  revenue: number
}

/** En çok satan ürünler (adet) — varyantlar ürün altında toplanır */
export function topSellers(list: OrderWithTotals[], r: DateRange, nameOf: (id: string) => string | undefined, n = 5): TopProduct[] {
  const m = new Map<string, TopProduct>()
  for (const { order } of list) {
    if (!active(order) || !inRange(order.createdAt, r)) continue
    for (const i of order.items) {
      if (!i.productId) continue
      const cur = m.get(i.productId) ?? { productId: i.productId, name: nameOf(i.productId) ?? i.name, units: 0, revenue: 0 }
      cur.units += i.quantity
      cur.revenue += i.quantity * i.unitPrice
      m.set(i.productId, cur)
    }
  }
  return [...m.values()].sort((a, b) => b.units - a.units || b.revenue - a.revenue).slice(0, n)
}

/** Üretime girmiş (Yeni/İptal dışı) siparişlerin filament tüketimi (filamentId → gram) */
export function filamentUsage(list: OrderWithTotals[], r: DateRange): Map<string, number> {
  const total = new Map<string, number>()
  for (const { order } of list) {
    if (order.status === 'new' || order.status === 'cancelled' || !inRange(order.createdAt, r)) continue
    for (const [id, g] of filamentNeeds(order.items)) total.set(id, (total.get(id) ?? 0) + g)
  }
  return total
}

/** Bekleyen baskı yükü: Yeni + Baskıda siparişlerin toplam saati */
export function pendingHours(list: OrderWithTotals[]): number {
  return list.filter(({ order }) => order.status === 'new' || order.status === 'printing').reduce((s, x) => s + x.totals.hours, 0)
}

/** Tüm zamanların üretilmiş (stoğu düşülmüş) siparişlerinden net kâr ve adet */
export function lifetimeProfit(list: OrderWithTotals[]): { netProfit: number; units: number } {
  let netProfit = 0
  let units = 0
  for (const { order, totals } of list) {
    if (!active(order) || order.status === 'new') continue
    netProfit += totals.netProfit
    units += totals.units
  }
  return { netProfit, units }
}
