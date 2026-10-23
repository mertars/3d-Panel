import { describe, expect, it } from 'vitest'
import {
  filamentNeeds,
  monthlyCapacityHours,
  orderTotals,
  planConsumption,
  printerLoad,
  realWastePercent,
  salesToBreakEven,
  stockCheck,
  type OrderItemLike,
  type StockRef,
} from './index'

// Referans ürün: 309 ₺, maliyet 151,48, 4,5 sa, amortisman 27, 85 g PLA
const ref: OrderItemLike = { quantity: 2, unitPrice: 309, unitCost: 151.48, hoursPerUnit: 4.5, depreciationPerUnit: 27, printerId: 'p1', filaments: [{ filamentId: 'pla', grams: 85 }] }
const shopier = { commissionPercent: 5.99, fixedFee: 0.49, vatOnCommission: true, extraPercent: 0, sellerShipping: 99 }

describe('sipariş toplamları', () => {
  it('ciro, kanal kesintisi, maliyet, kargo, net kâr', () => {
    const t = orderTotals({ items: [ref], discount: 18, shippingPayer: 'seller', shippingCost: 60 }, shopier)
    expect(t.gross).toBe(618)
    expect(t.revenue).toBe(600)
    // Kanalın kendi kargo değeri yok sayılır: 600 × 0,07188 + 0,588
    expect(t.channelFee).toBeCloseTo(600 * 0.07188 + 0.588, 10)
    expect(t.cost).toBeCloseTo(302.96, 10)
    expect(t.sellerShipping).toBe(60)
    expect(t.netProfit).toBeCloseTo(600 - (600 * 0.07188 + 0.588) - 302.96 - 60, 10)
    expect(t.margin).toBeCloseTo((t.netProfit / 600) * 100, 10)
    expect(t.hours).toBe(9)
    expect(t.units).toBe(2)
    expect(t.depreciation).toBe(54)
  })

  it('kargoyu müşteri öderse ve kanal yoksa', () => {
    const t = orderTotals({ items: [ref], discount: 0, shippingPayer: 'customer', shippingCost: 60 }, null)
    expect(t.channelFee).toBe(0)
    expect(t.sellerShipping).toBe(0)
    expect(t.netProfit).toBeCloseTo(618 - 302.96, 10)
  })

  it('indirim brüt tutarı aşamaz; boş sipariş', () => {
    expect(orderTotals({ items: [ref], discount: 9999, shippingPayer: 'customer', shippingCost: 0 }, null).revenue).toBe(0)
    const e = orderTotals({ items: [], discount: 0, shippingPayer: 'customer', shippingCost: 0 }, shopier)
    expect(e).toMatchObject({ revenue: 0, channelFee: 0, netProfit: 0, margin: null })
  })
})

describe('filament ihtiyacı ve stok', () => {
  const items: OrderItemLike[] = [
    ref,
    { ...ref, quantity: 3, filaments: [{ filamentId: 'pla', grams: 40 }, { filamentId: 's-red', grams: 10 }] },
  ]
  const spools = [
    { id: 's-white', filamentTypeId: 'pla', remainingGrams: 200 },
    { id: 's-black', filamentTypeId: 'pla', remainingGrams: 100 },
    { id: 's-red', filamentTypeId: 'pla', remainingGrams: 20 },
  ]
  const resolve = (id: string): StockRef => (id.startsWith('s-') ? { kind: 'spool', spoolId: id } : id === 'pla' ? { kind: 'type', typeId: 'pla' } : { kind: 'none' })

  it('ihtiyaç toplanır', () => {
    const n = filamentNeeds(items)
    expect(n.get('pla')).toBe(2 * 85 + 3 * 40) // 290
    expect(n.get('s-red')).toBe(30)
  })

  it('“Filament yeter mi?” — yetmeyen kırmızı', () => {
    const lines = stockCheck(filamentNeeds(items), spools, resolve)
    expect(lines.find((l) => l.filamentId === 'pla')).toMatchObject({ need: 290, available: 320, ok: true })
    expect(lines.find((l) => l.filamentId === 's-red')).toMatchObject({ need: 30, available: 20, ok: false })
    expect(stockCheck(new Map([['x', 5]]), spools, resolve)[0].ok).toBe(false)
  })

  it('stoktan düşme planı: önce az kalan makara, yetmeyen kısım eksik', () => {
    const plan = planConsumption(filamentNeeds(items), spools, resolve)
    // pla 290 g: s-red(20) → s-black(100) → s-white(170); sonra s-red için 30 g ama s-red bitti → 30 eksik
    expect(plan.spools).toEqual(expect.arrayContaining([
      { spoolId: 's-red', grams: 20 },
      { spoolId: 's-black', grams: 100 },
      { spoolId: 's-white', grams: 170 },
    ]))
    expect(plan.missing).toEqual([{ filamentId: 's-red', grams: 30 }])
  })

  it('yazıcı yükü', () => {
    expect(printerLoad(items)).toEqual([{ printerId: 'p1', hours: 22.5, depreciation: 135 }])
  })
})

describe('fire, başa baş, kapasite', () => {
  it('gerçek fire oranı', () => {
    expect(realWastePercent(80, 920)).toBeCloseTo(8, 10)
    expect(realWastePercent(0, 0)).toBeNull()
  })
  it('başa baş satış sayısı', () => {
    expect(salesToBreakEven(35000, 13300, 120)).toBe(181) // 21700 / 120 = 180,83 → 181
    expect(salesToBreakEven(35000, 36000, 120)).toBe(0)
    expect(salesToBreakEven(35000, 0, 0)).toBeNull()
  })
  it('aylık kapasite', () => {
    expect(monthlyCapacityHours(2, 16, 30)).toBe(960)
  })
})
