/**
 * Hesaplama motorunun girdi/çıktı tipleri.
 * Tüm yüzde değerleri "yüzde" cinsindendir (5 = %5), motor içinde 100'e bölünür.
 */

export type RoundingMode = 'none' | 'nearest5' | 'nearest10' | 'end9' | 'end990' | 'end49or99'

export interface PricingSettings {
  /** Elektrik birim fiyatı (TL/kWh) */
  kwhPrice: number
  /** Saatlik işçilik ücreti (TL/saat) */
  laborRate: number
  /** Fire oranı (%) — yalnızca makine + malzeme maliyetine uygulanır */
  wastePercent: number
  /** Fiyat A için maliyet çarpanı */
  costMultiplier: number
  /** Fiyat B için saatlik kâr ücreti (TL/saat) */
  hourlyProfit: number
  /** false ise Fiyat B = adetBaşıBaskıSaati × saatlikKârÜcreti (maliyet eklenmez) */
  includeCostInB: boolean
  rounding: RoundingMode
  vatEnabled: boolean
  vatPercent: number
}

export interface PrinterCostInput {
  /** Satın alma fiyatı (TL) */
  price: number
  /** Hurda / ikinci el değeri (TL) */
  salvageValue: number
  /** Ömür (saat) */
  lifeHours: number
  /** Ortalama güç (W) */
  watts: number
  /** Saatlik bakım/sarf (TL/saat) */
  maintenancePerHour: number
}

export interface FilamentUsageInput {
  gram: number
  purgeGram: number
  /** Makara fiyatı (TL) */
  spoolPrice: number
  /** Makara gramı (g) */
  spoolGrams: number
}

export interface ExtraItem {
  name: string
  amount: number
}

export interface DetailedCostInput {
  mode: 'detailed'
  filaments: FilamentUsageInput[]
  printHours: number
  printer: PrinterCostInput | null
  laborMinutes: number
  extras: ExtraItem[]
  packaging: number
  unitsPerPlate: number
}

export interface QuickCostInput {
  mode: 'quick'
  /** Kullanıcının girdiği toplam maliyet (TL) */
  cost: number
  printHours: number
}

export type CostInput = DetailedCostInput | QuickCostInput

export interface CostBreakdown {
  mode: 'detailed' | 'quick'
  /** Plaka (baskı) başına değerler */
  filament: number
  electricity: number
  depreciation: number
  maintenance: number
  productionRaw: number
  productionWithWaste: number
  /** Adet başına değerler */
  labor: number
  extras: number
  totalCost: number
  unitsPerPlate: number
  printHours: number
  hoursPerUnit: number
}

export interface ProfitMetrics {
  profit: number
  /** % — fiyat 0 ise null */
  margin: number | null
  /** % — maliyet 0 ise null */
  markup: number | null
  /** TL/saat — baskı saati 0 ise null */
  profitPerHour: number | null
}

export interface PriceResult {
  raw: number
  rounded: number
  metrics: ProfitMetrics
  /** KDV açıksa yuvarlanmış fiyatın KDV dahil hali, değilse null */
  withVat: number | null
}

export interface PriceSet {
  a: PriceResult
  b: PriceResult
}

/** Maliyet dağılımı (halka grafik) — adet başına */
export interface CostSlice {
  key: 'filament' | 'electricity' | 'depreciation' | 'maintenance' | 'waste' | 'labor' | 'extras' | 'cost'
  label: string
  value: number
}

export interface ChannelFeeInput {
  /** Komisyon oranı (%) */
  commissionPercent: number
  /** Sabit ücret (TL karşılığı — döviz çevrimi çağıran tarafından yapılır) */
  fixedFee: number
  /** Komisyon ve sabit ücrete %20 KDV eklenir mi */
  vatOnCommission: boolean
  /** Ek yüzdeler toplamı (%) — ör. altyapı bedeli */
  extraPercent: number
  /** Satıcının ödediği kargo (TL) */
  sellerShipping: number
}

export interface ChannelPriceResult {
  raw: number
  rounded: number
  /** Yuvarlanmış liste fiyatında kanalın kestiği toplam tutar */
  deduction: number
  /** Yuvarlanmış liste fiyatından kesinti sonrası elde kalan */
  net: number
  /** Liste fiyatı hesaplanamıyorsa (efektif oran ≥ %100) false */
  valid: boolean
}
