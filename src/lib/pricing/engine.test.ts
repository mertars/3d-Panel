import { describe, expect, it } from 'vitest'
import {
  channelListPrice,
  computeCost,
  computePrices,
  costSlices,
  roundPrice,
  type ChannelFeeInput,
  type DetailedCostInput,
  type PricingSettings,
  type PrinterCostInput,
} from './index'

/** Gösterimdeki gibi 2 haneye yuvarla */
const r2 = (x: number) => Math.round(x * 100) / 100

const settings: PricingSettings = {
  kwhPrice: 4,
  laborRate: 200,
  wastePercent: 5,
  costMultiplier: 2,
  hourlyProfit: 30,
  includeCostInB: true,
  rounding: 'end9',
  vatEnabled: false,
  vatPercent: 20,
}

const printer: PrinterCostInput = {
  price: 35000,
  salvageValue: 5000,
  lifeHours: 5000,
  watts: 120,
  maintenancePerHour: 1.5,
}

const pla = { spoolPrice: 600, spoolGrams: 1000 }

const product: DetailedCostInput = {
  mode: 'detailed',
  filaments: [{ ...pla, gram: 85, purgeGram: 0 }],
  printHours: 4.5,
  printer,
  laborMinutes: 15,
  extras: [],
  packaging: 10,
  unitsPerPlate: 1,
}

const shopier: ChannelFeeInput = {
  commissionPercent: 5.99,
  fixedFee: 0.49,
  vatOnCommission: true,
  extraPercent: 0,
  sellerShipping: 0,
}

const trendyol: ChannelFeeInput = {
  commissionPercent: 15,
  fixedFee: 0,
  vatOnCommission: false,
  extraPercent: 0,
  sellerShipping: 0,
}

describe('referans ürün (SPEC Bölüm 3)', () => {
  const cost = computeCost(product, settings)
  const prices = computePrices(cost, settings)

  it('maliyet kalemleri birebir', () => {
    expect(r2(cost.filament)).toBe(51.0)
    expect(r2(cost.electricity)).toBe(2.16)
    expect(r2(cost.depreciation)).toBe(27.0)
    expect(r2(cost.maintenance)).toBe(6.75)
    expect(r2(cost.productionRaw)).toBe(86.91)
    expect(r2(cost.productionWithWaste)).toBe(91.48)
    expect(r2(cost.labor)).toBe(50.0)
    expect(r2(cost.extras)).toBe(10.0)
    expect(r2(cost.totalCost)).toBe(151.48)
  })

  it('ara adımlarda yuvarlama yapılmaz', () => {
    expect(cost.productionWithWaste).toBeCloseTo(86.91 / 0.95, 10)
    expect(cost.totalCost).not.toBe(151.48)
  })

  it('Fiyat A: ham 302,97 → 309', () => {
    expect(r2(prices.a.raw)).toBe(302.97)
    expect(prices.a.rounded).toBe(309)
  })

  it('Fiyat B: ham 286,48 → 289', () => {
    expect(r2(prices.b.raw)).toBe(286.48)
    expect(prices.b.rounded).toBe(289)
  })

  it('kâr metrikleri yuvarlanmış fiyat üzerinden', () => {
    const m = prices.a.metrics
    expect(m.profit).toBeCloseTo(309 - cost.totalCost, 10)
    expect(m.margin).toBeCloseTo(((309 - cost.totalCost) / 309) * 100, 10)
    expect(m.markup).toBeCloseTo(((309 - cost.totalCost) / cost.totalCost) * 100, 10)
    expect(m.profitPerHour).toBeCloseTo((309 - cost.totalCost) / 4.5, 10)
  })

  it('Shopier: hedef 309 → liste ham 333,56 → 339', () => {
    const res = channelListPrice(prices.a.rounded, shopier, settings.rounding)
    expect(r2(res.raw)).toBe(333.56)
    expect(res.rounded).toBe(339)
    expect(res.valid).toBe(true)
  })

  it('Trendyol: hedef 309 → liste ham 363,53 → 369', () => {
    const res = channelListPrice(prices.a.rounded, trendyol, settings.rounding)
    expect(r2(res.raw)).toBe(363.53)
    expect(res.rounded).toBe(369)
  })

  it('ham liste fiyatında kesinti = liste − hedef', () => {
    const res = channelListPrice(309, shopier, 'none')
    expect(res.deduction).toBeCloseTo(res.raw - 309, 10)
    expect(res.net).toBeCloseTo(309, 10)
  })

  it('maliyet dağılımı toplamı TOPLAM_MALİYET', () => {
    const sum = costSlices(cost).reduce((s, x) => s + x.value, 0)
    expect(sum).toBeCloseTo(cost.totalCost, 10)
    expect(r2(costSlices(cost).find((s) => s.key === 'waste')!.value)).toBe(4.57)
  })
})

describe('varyasyonlar', () => {
  it('purge’lu çok renkli ürün', () => {
    const multi: DetailedCostInput = {
      ...product,
      filaments: [
        { spoolPrice: 600, spoolGrams: 1000, gram: 60, purgeGram: 12 },
        { spoolPrice: 700, spoolGrams: 1000, gram: 20, purgeGram: 8 },
        { spoolPrice: 650, spoolGrams: 750, gram: 5, purgeGram: 4 },
      ],
    }
    const cost = computeCost(multi, settings)
    const expected = (60 + 12) * 0.6 + (20 + 8) * 0.7 + (5 + 4) * (650 / 750)
    expect(cost.filament).toBeCloseTo(expected, 10)
    expect(r2(cost.filament)).toBe(70.6)
    // purge da fire ve maliyete dahil
    const noPurge = computeCost(
      { ...multi, filaments: multi.filaments.map((f) => ({ ...f, purgeGram: 0 })) },
      settings,
    )
    expect(cost.totalCost).toBeGreaterThan(noPurge.totalCost)
  })

  it('unitsPerPlate = 8: baskı maliyeti bölünür, işçilik ve ekler adet başı', () => {
    const cost = computeCost({ ...product, unitsPerPlate: 8 }, settings)
    const base = computeCost(product, settings)
    expect(cost.productionWithWaste).toBeCloseTo(base.productionWithWaste, 10)
    expect(cost.totalCost).toBeCloseTo(base.productionWithWaste / 8 + 50 + 10, 10)
    expect(r2(cost.totalCost)).toBe(71.44)
    expect(cost.hoursPerUnit).toBeCloseTo(4.5 / 8, 10)
    const prices = computePrices(cost, settings)
    // B = maliyet + (4,5/8) × 30
    expect(prices.b.raw).toBeCloseTo(cost.totalCost + (4.5 / 8) * 30, 10)
    expect(r2(prices.b.raw)).toBe(88.31)
    expect(prices.b.rounded).toBe(89)
    expect(prices.a.rounded).toBe(149) // 142,87 → 149
  })

  it('fire %0: üretimFireli = üretimHam', () => {
    const s = { ...settings, wastePercent: 0 }
    const cost = computeCost(product, s)
    expect(cost.productionWithWaste).toBe(cost.productionRaw)
    expect(r2(cost.totalCost)).toBe(146.91)
  })

  it('hızlı mod: maliyet + saat → A ve B aynı formüller', () => {
    const cost = computeCost({ mode: 'quick', cost: 151.48, printHours: 4.5 }, settings)
    expect(cost.totalCost).toBe(151.48)
    const prices = computePrices(cost, settings)
    expect(prices.a.raw).toBeCloseTo(302.96, 10)
    expect(prices.a.rounded).toBe(309)
    expect(prices.b.raw).toBeCloseTo(286.48, 10)
    expect(prices.b.rounded).toBe(289)
    expect(costSlices(cost)).toEqual([{ key: 'cost', label: 'Maliyet', value: 151.48 }])
  })

  it('B’ye maliyeti ekleme kapalı: B = adetBaşıSaat × saatlikKâr', () => {
    const s = { ...settings, includeCostInB: false, rounding: 'none' as const }
    const prices = computePrices(computeCost(product, s), s)
    expect(prices.b.raw).toBeCloseTo(135, 10)
  })

  it('KDV açık: KDV dahil = yuvarlanmış × 1,20', () => {
    const s = { ...settings, vatEnabled: true }
    const prices = computePrices(computeCost(product, s), s)
    expect(prices.a.withVat).toBeCloseTo(309 * 1.2, 10)
    expect(computePrices(computeCost(product, settings), settings).a.withVat).toBeNull()
  })

  it('yazıcısız ve boş girdilerde NaN üretmez', () => {
    const cost = computeCost(
      { mode: 'detailed', filaments: [], printHours: 0, printer: null, laborMinutes: 0, extras: [], packaging: 0, unitsPerPlate: 0 },
      settings,
    )
    expect(cost.totalCost).toBe(0)
    const p = computePrices(cost, settings)
    expect(p.a.rounded).toBe(0)
    expect(p.a.metrics.profitPerHour).toBeNull()
    expect(p.a.metrics.margin).toBeNull()
  })

  it('efektif oran ≥ %100 ise kanal fiyatı geçersiz', () => {
    expect(channelListPrice(100, { ...trendyol, commissionPercent: 100 }, 'none').valid).toBe(false)
  })

  it('Çiçeksepeti: %15 + %1,5 altyapı, Etsy-benzeri sabit ücret ve kargo', () => {
    const res = channelListPrice(309, { ...trendyol, extraPercent: 1.5 }, 'none')
    expect(res.raw).toBeCloseTo(309 / (1 - 0.165), 10)
    const withShip = channelListPrice(309, { ...trendyol, fixedFee: 8.4, sellerShipping: 50 }, 'none')
    expect(withShip.raw).toBeCloseTo((309 + 58.4) / 0.85, 10)
  })
})

describe('yuvarlama modları', () => {
  it.each([
    ['none', 302.97, 302.97],
    ['nearest5', 302.97, 305],
    ['nearest5', 305, 305],
    ['nearest10', 302.97, 310],
    ['nearest10', 310, 310],
    ['end9', 302.97, 309],
    ['end9', 309, 309],
    ['end9', 309.01, 319],
    ['end9', 3.5, 9],
    ['end990', 302.97, 309.9],
    ['end990', 309.9, 309.9],
    ['end990', 309.95, 319.9],
    ['end49or99', 302.97, 349],
    ['end49or99', 351, 399],
    ['end49or99', 349, 349],
    ['end49or99', 399.5, 449],
  ] as const)('%s: %d → %d', (mode, input, expected) => {
    expect(roundPrice(input, mode)).toBe(expected)
  })

  it('0 ve negatif değerler yuvarlanmaz', () => {
    expect(roundPrice(0, 'end9')).toBe(0)
    expect(roundPrice(-5, 'end9')).toBe(-5)
  })
})
