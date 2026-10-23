import { describe, expect, it } from 'vitest'
import { emptyOrder, type Order, type OrderItem } from '@/db'
import { orderTotals } from '@/lib/pricing'
import {
  changePercent,
  channelShares,
  filamentUsage,
  lifetimeProfit,
  monthlySeries,
  pendingHours,
  periodStats,
  previousRange,
  rangeFor,
  topSellers,
  type OrderWithTotals,
} from './analytics'

const now = new Date(2026, 9, 23, 15, 0) // 23 Ekim 2026
const item = (productId: string, quantity: number, unitPrice = 100): OrderItem => ({
  key: productId + quantity, productId, variantId: null, name: productId, quantity, unitPrice, unitCost: 40, hoursPerUnit: 2,
  depreciationPerUnit: 5, printerId: 'p', filaments: [{ filamentId: 'pla', grams: 50 }],
})
const mk = (date: Date, items: OrderItem[], patch: Partial<Order> = {}): OrderWithTotals => {
  const order = { ...emptyOrder('S'), items, createdAt: date.getTime(), status: 'delivered' as const, ...patch }
  return { order, totals: orderTotals(order, null) }
}

const list: OrderWithTotals[] = [
  mk(new Date(2026, 9, 2), [item('a', 2)], { channelId: 'shopier' }), // Ekim: 200
  mk(new Date(2026, 9, 20), [item('b', 1, 300)]), // Ekim: 300
  mk(new Date(2026, 9, 21), [item('a', 5)], { status: 'cancelled' }), // iptal → sayılmaz
  mk(new Date(2026, 9, 22), [item('c', 1)], { status: 'new' }), // Ekim: 100, bekleyen
  mk(new Date(2026, 8, 10), [item('a', 3)], { channelId: 'shopier' }), // Eylül: 300
  mk(new Date(2026, 8, 25), [item('b', 1)]), // Eylül (23’ünden sonra): 100
]

describe('tarih aralıkları', () => {
  it('bu ay ve geçen ay', () => {
    const r = rangeFor('thisMonth', now)
    expect(new Date(r.start)).toEqual(new Date(2026, 9, 1))
    expect(new Date(r.end)).toEqual(new Date(2026, 9, 24))
    const prev = previousRange('thisMonth', r)
    expect(new Date(prev.start)).toEqual(new Date(2026, 8, 1))
    expect(new Date(prev.end)).toEqual(new Date(2026, 8, 24)) // geçen ayın aynı günlerine kadar
    const lm = rangeFor('lastMonth', now)
    expect(new Date(lm.start)).toEqual(new Date(2026, 8, 1))
    expect(new Date(lm.end)).toEqual(new Date(2026, 9, 1))
  })

  it('özel aralık (ters girilse de)', () => {
    const r = rangeFor('custom', now, { from: '2026-10-10', to: '2026-10-01' })
    expect(r.start).toBeLessThan(r.end)
    const ok = rangeFor('custom', now, { from: '2026-10-01', to: '2026-10-10' })
    expect(new Date(ok.end)).toEqual(new Date(2026, 9, 11))
    expect(previousRange('custom', ok).end).toBe(ok.start)
  })
})

describe('dönem istatistikleri', () => {
  it('iptaller hariç ciro, kâr, saat; değişim rozeti', () => {
    const r = rangeFor('thisMonth', now)
    const cur = periodStats(list, r)
    expect(cur).toMatchObject({ revenue: 600, orders: 3, units: 4, hours: 8 })
    expect(cur.netProfit).toBe(600 - 4 * 40)
    const prev = periodStats(list, previousRange('thisMonth', r))
    expect(prev.revenue).toBe(300) // 25 Eylül sonrası hariç
    expect(changePercent(cur.revenue, prev.revenue)).toBe(100)
    expect(changePercent(5, 0)).toBeNull()
    expect(changePercent(0, 0)).toBe(0)
  })

  it('aylık seri, kanal payı, en çok satanlar, filament, bekleyen saat', () => {
    const r = rangeFor('thisMonth', now)
    const series = monthlySeries(list, r)
    expect(series).toHaveLength(6)
    expect(series.at(-1)).toMatchObject({ key: '2026-10', revenue: 600 })
    expect(series.at(-2)).toMatchObject({ key: '2026-09', revenue: 400 })

    const shares = channelShares(list, r, (id) => (id ? 'Shopier' : 'Kanalsız'))
    expect(shares).toEqual([
      { key: 'none', label: 'Kanalsız', value: 400 },
      { key: 'shopier', label: 'Shopier', value: 200 },
    ])

    const top = topSellers(list, rangeFor('last90', now), () => undefined)
    expect(top[0]).toMatchObject({ productId: 'a', units: 5 }) // iptal edilen 5 adet sayılmaz
    expect(top.map((t) => t.productId)).toEqual(['a', 'b', 'c'])

    // Yeni sipariş üretime girmedi → filament tüketimine sayılmaz
    expect(filamentUsage(list, r).get('pla')).toBe(3 * 50)
    expect(pendingHours(list)).toBe(2)
    expect(lifetimeProfit(list)).toEqual({ netProfit: 200 - 80 + (300 - 40) + (300 - 120) + (100 - 40), units: 7 })
  })
})
