import { describe, expect, it } from 'vitest'
import {
  bulkDiscountFor,
  bulkPriceTable,
  bulkUnitPrice,
  channelListPrice,
  competitorDiffPercent,
  isLowStock,
  paybackRatio,
  priceDrift,
  remainingFromWeight,
  scaleManualPrice,
  weightedAverageGramPrice,
  type BulkTier,
} from './index'

const tiers: BulkTier[] = [
  { quantity: 1, discountPercent: 0 },
  { quantity: 5, discountPercent: 5 },
  { quantity: 10, discountPercent: 10 },
  { quantity: 25, discountPercent: 15 },
  { quantity: 50, discountPercent: 20 },
]

describe('toplu adet fiyatı', () => {
  it('kademeli indirim tablosu', () => {
    const rows = bulkPriceTable(309, 151.48, tiers)
    expect(rows.map((r) => r.quantity)).toEqual([1, 5, 10, 25, 50])
    expect(rows[0].unitPrice).toBe(309)
    expect(rows[1].unitPrice).toBeCloseTo(293.55, 10)
    expect(rows[4].unitPrice).toBeCloseTo(247.2, 10)
    expect(rows[4].total).toBeCloseTo(12360, 8)
    expect(rows[4].profitPerUnit).toBeCloseTo(247.2 - 151.48, 10)
    expect(rows.every((r) => !r.belowCost)).toBe(true)
  })

  it('maliyetin altına düşen kademe işaretlenir', () => {
    const rows = bulkPriceTable(180, 151.48, tiers)
    expect(rows.map((r) => r.belowCost)).toEqual([false, false, false, false, true]) // 180×0,8 = 144
  })

  it('sırasız ve geçersiz kademeler düzenlenir', () => {
    const rows = bulkPriceTable(100, 50, [{ quantity: 10, discountPercent: 10 }, { quantity: 0, discountPercent: 50 }, { quantity: 1, discountPercent: 0 }])
    expect(rows.map((r) => r.quantity)).toEqual([1, 10])
  })

  it('adet için geçerli indirim', () => {
    expect(bulkDiscountFor(1, tiers)).toBe(0)
    expect(bulkDiscountFor(7, tiers)).toBe(5)
    expect(bulkDiscountFor(10, tiers)).toBe(10)
    expect(bulkDiscountFor(100, tiers)).toBe(20)
    expect(bulkUnitPrice(309, 12, tiers)).toBeCloseTo(278.1, 10)
  })
})

describe('eskimiş fiyat tespiti', () => {
  it('%5’ten büyük fark eskimiş sayılır', () => {
    expect(priceDrift(309, 329).stale).toBe(true) // +%6,47
    expect(priceDrift(309, 319).stale).toBe(false) // +%3,24
    expect(priceDrift(309, 289).stale).toBe(true) // −%6,47
    expect(priceDrift(100, 105).stale).toBe(false) // tam %5 sınırda eskimiş değil
    expect(priceDrift(309, 329).diffPercent).toBeCloseTo(((329 - 309) / 309) * 100, 10)
  })

  it('kayıtlı fiyat 0 ise yeni fiyat varsa eskimiş', () => {
    expect(priceDrift(0, 100).stale).toBe(true)
    expect(priceDrift(0, 0).stale).toBe(false)
  })

  it('manuel fiyat maliyetle orantılı ölçeklenir (markup korunur)', () => {
    expect(scaleManualPrice(300, 150, 165)).toBeCloseTo(330, 10)
    expect(scaleManualPrice(300, 0, 165)).toBe(300)
  })
})

describe('filament stoğu', () => {
  it('ağırlıklı ortalama gram fiyatı (kalan grama göre)', () => {
    const avg = weightedAverageGramPrice([
      { spoolPrice: 600, spoolGrams: 1000, remainingGrams: 800 },
      { spoolPrice: 750, spoolGrams: 1000, remainingGrams: 200 },
    ])
    expect(avg).toBeCloseTo((0.6 * 800 + 0.75 * 200) / 1000, 10) // 0,63
  })

  it('hiç kalan yoksa makara gramına göre; makara yoksa null', () => {
    expect(
      weightedAverageGramPrice([
        { spoolPrice: 600, spoolGrams: 1000, remainingGrams: 0 },
        { spoolPrice: 400, spoolGrams: 500, remainingGrams: 0 },
      ]),
    ).toBeCloseTo((0.6 * 1000 + 0.8 * 500) / 1500, 10)
    expect(weightedAverageGramPrice([])).toBeNull()
  })

  it('tartarak kalan gram ve düşük stok', () => {
    expect(remainingFromWeight(1050, 250)).toBe(800)
    expect(remainingFromWeight(200, 250)).toBe(0)
    expect(isLowStock(150, 150)).toBe(true)
    expect(isLowStock(151, 150)).toBe(false)
  })
})

describe('kanal tablosu ve diğerleri', () => {
  it('liste fiyatı, kesinti ve elde kalan tutarlı', () => {
    const shopier = { commissionPercent: 5.99, fixedFee: 0.49, vatOnCommission: true, extraPercent: 0, sellerShipping: 0 }
    const r = channelListPrice(309, shopier, 'end9')
    expect(r.rounded).toBe(339)
    expect(r.deduction).toBeCloseTo(339 * 0.07188 + 0.588, 10)
    expect(r.net).toBeCloseTo(339 - r.deduction, 10)
    expect(r.net).toBeGreaterThanOrEqual(309)
    // Kargo sabit ücrete eklenir
    const withShip = channelListPrice(309, { ...shopier, sellerShipping: 40 }, 'none')
    expect(withShip.net).toBeCloseTo(309, 10)
    expect(withShip.deduction).toBeCloseTo(withShip.raw - 309, 10)
  })

  it('rakip farkı ve amortisman ilerlemesi', () => {
    expect(competitorDiffPercent(309, 350)).toBeCloseTo(-11.714, 2)
    expect(competitorDiffPercent(309, 0)).toBeNull()
    expect(paybackRatio(13300, 35000)).toBeCloseTo(0.38, 10)
    expect(paybackRatio(100, 0)).toBe(0)
  })
})
