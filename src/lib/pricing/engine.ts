import { roundPrice } from './rounding'
import type {
  ChannelFeeInput,
  ChannelPriceResult,
  CostBreakdown,
  CostInput,
  CostSlice,
  DetailedCostInput,
  PriceResult,
  PriceSet,
  PricingSettings,
  ProfitMetrics,
  RoundingMode,
} from './types'

/**
 * SAF hesaplama fonksiyonları. Ara adımlarda yuvarlama YAPILMAZ;
 * yuvarlama yalnızca gösterimde (ve fiyat yuvarlama modunda) uygulanır.
 */

/** Komisyona eklenen KDV oranı (formülde sabit %20) */
export const COMMISSION_VAT = 0.2

const num = (x: number) => (Number.isFinite(x) ? x : 0)
const nonNeg = (x: number) => Math.max(0, num(x))

/** Fire oranını güvenli aralıkta tutar (%100 ve üstü sıfıra bölmeye yol açar) */
function wasteFraction(percent: number): number {
  return Math.min(nonNeg(percent), 95) / 100
}

export function gramPrice(spoolPrice: number, spoolGrams: number): number {
  return spoolGrams > 0 ? nonNeg(spoolPrice) / spoolGrams : 0
}

export function printerHourlyDepreciation(price: number, salvage: number, lifeHours: number): number {
  if (!(lifeHours > 0)) return 0
  return Math.max(0, num(price) - num(salvage)) / lifeHours
}

function detailedCost(input: DetailedCostInput, settings: PricingSettings): CostBreakdown {
  const hours = nonNeg(input.printHours)
  const units = Math.max(1, Math.floor(num(input.unitsPerPlate)) || 1)
  const p = input.printer

  const filament = input.filaments.reduce(
    (sum, f) => sum + (nonNeg(f.gram) + nonNeg(f.purgeGram)) * gramPrice(f.spoolPrice, f.spoolGrams),
    0,
  )
  const electricity = p ? (nonNeg(p.watts) / 1000) * hours * nonNeg(settings.kwhPrice) : 0
  const depreciation = p ? printerHourlyDepreciation(p.price, p.salvageValue, p.lifeHours) * hours : 0
  const maintenance = p ? nonNeg(p.maintenancePerHour) * hours : 0

  const productionRaw = filament + electricity + depreciation + maintenance
  const productionWithWaste = productionRaw / (1 - wasteFraction(settings.wastePercent))
  const labor = (nonNeg(input.laborMinutes) / 60) * nonNeg(settings.laborRate)
  const extras = input.extras.reduce((sum, e) => sum + num(e.amount), 0) + nonNeg(input.packaging)

  return {
    mode: 'detailed',
    filament,
    electricity,
    depreciation,
    maintenance,
    productionRaw,
    productionWithWaste,
    labor,
    extras,
    totalCost: productionWithWaste / units + labor + extras,
    unitsPerPlate: units,
    printHours: hours,
    hoursPerUnit: hours / units,
  }
}

export function computeCost(input: CostInput, settings: PricingSettings): CostBreakdown {
  if (input.mode === 'detailed') return detailedCost(input, settings)
  const hours = nonNeg(input.printHours)
  const cost = nonNeg(input.cost)
  return {
    mode: 'quick',
    filament: 0,
    electricity: 0,
    depreciation: 0,
    maintenance: 0,
    productionRaw: 0,
    productionWithWaste: 0,
    labor: 0,
    extras: 0,
    totalCost: cost,
    unitsPerPlate: 1,
    printHours: hours,
    hoursPerUnit: hours,
  }
}

export function profitMetrics(price: number, totalCost: number, hoursPerUnit: number): ProfitMetrics {
  const profit = price - totalCost
  return {
    profit,
    margin: price > 0 ? (profit / price) * 100 : null,
    markup: totalCost > 0 ? (profit / totalCost) * 100 : null,
    profitPerHour: hoursPerUnit > 0 ? profit / hoursPerUnit : null,
  }
}

export function withVat(price: number, settings: Pick<PricingSettings, 'vatEnabled' | 'vatPercent'>): number | null {
  return settings.vatEnabled ? price * (1 + nonNeg(settings.vatPercent) / 100) : null
}

/** Verilen ham fiyatı yuvarlayıp kâr metriklerini yuvarlanmış fiyat üzerinden hesaplar */
export function evaluatePrice(raw: number, cost: CostBreakdown, settings: PricingSettings): PriceResult {
  const rounded = roundPrice(raw, settings.rounding)
  return {
    raw,
    rounded,
    metrics: profitMetrics(rounded, cost.totalCost, cost.hoursPerUnit),
    withVat: withVat(rounded, settings),
  }
}

export function priceARaw(cost: CostBreakdown, settings: PricingSettings): number {
  return cost.totalCost * nonNeg(settings.costMultiplier)
}

export function priceBRaw(cost: CostBreakdown, settings: PricingSettings): number {
  const hourly = cost.hoursPerUnit * nonNeg(settings.hourlyProfit)
  return settings.includeCostInB ? cost.totalCost + hourly : hourly
}

export function computePrices(cost: CostBreakdown, settings: PricingSettings): PriceSet {
  return {
    a: evaluatePrice(priceARaw(cost, settings), cost, settings),
    b: evaluatePrice(priceBRaw(cost, settings), cost, settings),
  }
}

/** Adet başına maliyet dağılımı (halka grafik için). Toplamı totalCost'a eşittir. */
export function costSlices(cost: CostBreakdown): CostSlice[] {
  if (cost.mode === 'quick') {
    return [{ key: 'cost', label: 'Maliyet', value: cost.totalCost }]
  }
  const u = cost.unitsPerPlate
  return [
    { key: 'filament', label: 'Filament', value: cost.filament / u },
    { key: 'electricity', label: 'Elektrik', value: cost.electricity / u },
    { key: 'depreciation', label: 'Amortisman', value: cost.depreciation / u },
    { key: 'maintenance', label: 'Bakım', value: cost.maintenance / u },
    { key: 'waste', label: 'Fire', value: (cost.productionWithWaste - cost.productionRaw) / u },
    { key: 'labor', label: 'İşçilik', value: cost.labor },
    { key: 'extras', label: 'Ekler', value: cost.extras },
  ]
}

/* ───────────── Satış kanalı (tersine hesap) ───────────── */

export function effectiveChannelRate(c: ChannelFeeInput): number {
  const vat = c.vatOnCommission ? 1 + COMMISSION_VAT : 1
  return (nonNeg(c.commissionPercent) / 100) * vat + nonNeg(c.extraPercent) / 100
}

export function effectiveChannelFixed(c: ChannelFeeInput): number {
  const vat = c.vatOnCommission ? 1 + COMMISSION_VAT : 1
  return nonNeg(c.fixedFee) * vat + nonNeg(c.sellerShipping)
}

/** Belirli bir liste fiyatında kanalın kestiği toplam tutar */
export function channelDeduction(listPrice: number, c: ChannelFeeInput): number {
  return listPrice * effectiveChannelRate(c) + effectiveChannelFixed(c)
}

/**
 * Hedef: elimize geçmesini istediğimiz tutar.
 * listeFiyatı = (hedef + efektifSabit) / (1 − efektifOran), ardından yuvarlama.
 */
export function channelListPrice(target: number, c: ChannelFeeInput, rounding: RoundingMode): ChannelPriceResult {
  const rate = effectiveChannelRate(c)
  if (rate >= 1) return { raw: 0, rounded: 0, deduction: 0, net: 0, valid: false }
  const raw = (nonNeg(target) + effectiveChannelFixed(c)) / (1 - rate)
  const rounded = roundPrice(raw, rounding)
  const deduction = channelDeduction(rounded, c)
  return { raw, rounded, deduction, net: rounded - deduction, valid: true }
}
