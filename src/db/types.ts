import type { BulkTier, CostBreakdown, ExtraItem, PriceResult, PricingSettings } from '@/lib/pricing'
import type { CurrencyStyle } from '@/lib/format'

export type ID = string

export interface AppSettings extends PricingSettings {
  id: 'app'
  /** Varsayılan ambalaj (TL) */
  defaultPackaging: number
  currencyStyle: CurrencyStyle
  compactDecimals: boolean
  /** USD/TL kuru (Etsy gibi dolar bazlı ücretler için, manuel) */
  usdRate: number
  onboarded: boolean
  /** Toplu adet indirim kademeleri */
  bulkTiers: BulkTier[]
  /** Düşük stok eşiği (g) */
  lowStockGrams: number
  /** Teklif kartındaki marka */
  brandName: string
  brandContact: string
  brandLogo: Blob | null
  /** Yeni tekliflerin geçerlilik süresi (gün) */
  quoteValidityDays: number
  defaultLeadTime: string
  /** Stok ve yazıcı saati hangi durumda düşülsün */
  consumeOn: 'printing' | 'delivered'
  /** Yazıcı başına günlük kullanılabilir saat (kapasite) */
  printerHoursPerDay: number
  /** Son JSON yedeği (ms) */
  lastBackupAt: number | null
  updatedAt: number
}

export type PrinterPreset = 'a1mini' | 'a1' | 'a2' | 'a2l' | 'p1s' | 'x1c' | 'h2d' | 'other'

export interface Printer {
  id: ID
  name: string
  preset: PrinterPreset
  price: number
  salvageValue: number
  lifeHours: number
  watts: number
  maintenancePerHour: number
  isDefault: boolean
  /** Katman'a girmeden önce basılmış saat (elle) */
  startHours: number
  maintenanceLog: MaintenanceEntry[]
  createdAt: number
}

export interface MaintenanceEntry {
  id: ID
  /** YYYY-MM-DD */
  date: string
  note: string
  cost: number | null
}

export interface FilamentType {
  id: ID
  name: string
  material: string
  /** Makara fiyatı (TL) */
  spoolPrice: number
  /** Makara gramı */
  spoolGrams: number
  /** g/cm³ */
  density: number
  /** Temsili renk (HEX) */
  color: string
  /** Varsayılan (tahmini) değer mi — kullanıcı düzenleyince false olur */
  estimated: boolean
  order: number
}

/** Gerçek makara stoğu */
export interface Spool {
  id: ID
  filamentTypeId: ID
  brand: string
  colorName: string
  color: string
  spoolPrice: number
  spoolGrams: number
  remainingGrams: number
  /** Boş makara ağırlığı (g) — tartarak güncelleme için */
  emptySpoolWeight: number | null
  /** YYYY-MM-DD */
  purchaseDate: string | null
  supplier: string
  note: string
  createdAt: number
}

export interface ChannelPercent {
  name: string
  percent: number
}

export interface ChannelTier {
  label: string
  percent: number
}

export interface Channel {
  id: ID
  name: string
  commissionPercent: number
  fixedFee: number
  fixedFeeCurrency: 'TRY' | 'USD'
  vatOnCommission: boolean
  extraPercents: ChannelPercent[]
  sellerShipping: number
  tiers: ChannelTier[]
  note: string
  /** ISO tarih (YYYY-MM-DD) veya null */
  lastVerified: string | null
  enabled: boolean
  estimated: boolean
  order: number
}

export interface ProductFilamentLine {
  /** FilamentType, Spool veya "avg:<türId>" (stok ortalaması) */
  filamentId: ID
  gram: number
  purgeGram: number
}

export interface ProductSnapshot {
  at: number
  settings: PricingSettings
  cost: CostBreakdown
  priceA: PriceResult
  priceB: PriceResult
  manual: PriceResult | null
}

export type CalcMode = 'quick' | 'detailed'

/** Satış fiyatının kaynağı */
export type SaleSource = 'a' | 'b' | 'manual'

export type ModelLicense = 'commercial' | 'personal' | 'licensed' | 'unknown'

export interface PrintNotes {
  layerHeight: number | null
  infillPercent: number | null
  nozzle: string
  plateType: string
  supports: string
  notes: string
}

/** Aynı ürünün boy/renk seçeneği — kendi filament/süre değerleriyle */
export interface ProductVariant {
  id: ID
  name: string
  filaments: ProductFilamentLine[]
  printHours: number
  unitsPerPlate: number
  laborMinutes: number
  /** Varyanta özel satış fiyatı (yoksa ürünün kaynağına göre A/B) */
  priceOverride: number | null
}

export interface Product {
  id: ID
  name: string
  category: string
  tags: string[]
  link: string
  photo: Blob | null
  mode: CalcMode
  quick: { cost: number; printHours: number }
  detailed: {
    filaments: ProductFilamentLine[]
    printHours: number
    printerId: ID | null
    laborMinutes: number
    extras: ExtraItem[]
    packaging: number
    unitsPerPlate: number
  }
  manualPrice: number | null
  /** Kayıtlı satış fiyatı ve kaynağı */
  saleSource: SaleSource
  salePrice: number
  variants: ProductVariant[]
  printNotes: PrintNotes
  license: ModelLicense
  competitorPrice: number | null
  competitorNote: string
  archived: boolean
  snapshot: ProductSnapshot
  createdAt: number
  updatedAt: number
}

export type OrderStatus = 'new' | 'printing' | 'ready' | 'shipped' | 'delivered' | 'cancelled'

/** Sipariş kalemi — üretim bilgisi eklendiği andaki ürün hesabından kopyalanır (sonradan değişmez) */
export interface OrderItem {
  key: string
  productId: ID | null
  variantId: ID | null
  name: string
  quantity: number
  unitPrice: number
  /** Adet başı maliyet (snapshot) */
  unitCost: number
  /** Adet başı baskı saati */
  hoursPerUnit: number
  /** Adet başı amortisman payı (TL) */
  depreciationPerUnit: number
  printerId: ID | null
  /** Adet başı filament ihtiyacı (gram + purge, plaka başı adede bölünmüş) */
  filaments: { filamentId: ID; grams: number }[]
}

/** Stoktan düşülen miktarlar — geri almak için saklanır */
export interface Consumption {
  at: number
  spools: { spoolId: ID; grams: number }[]
  /** Hiçbir makaradan karşılanamayan gram (stok yetmedi) */
  missing: { filamentId: ID; grams: number }[]
  printers: { printerId: ID; hours: number; depreciation: number }[]
}

export interface Order {
  id: ID
  /** S-2026-001 */
  number: string
  customer: string
  contact: string
  channelId: ID | null
  items: OrderItem[]
  /** İndirim (TL) */
  discount: number
  shippingPayer: 'customer' | 'seller'
  /** Satıcı ödüyorsa kargo tutarı */
  shippingCost: number
  paid: boolean
  /** YYYY-MM-DD */
  dueDate: string | null
  note: string
  status: OrderStatus
  quoteId: ID | null
  /** Stoktan düşülmüşse kayıt (geri alınabilir) */
  consumption: Consumption | null
  createdAt: number
  updatedAt: number
}

export type FailureReason = 'adhesion' | 'layer-shift' | 'spaghetti' | 'filament' | 'power' | 'other'

/** Başarısız baskı (fire) kaydı */
export interface Failure {
  id: ID
  at: number
  printerId: ID | null
  filamentId: ID
  grams: number
  hours: number
  reason: FailureReason
  note: string
  orderId: ID | null
  consumption: Consumption | null
}

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected'

export interface QuoteItem {
  key: string
  productId: ID | null
  variantId: ID | null
  /** Müşterinin göreceği ad */
  name: string
  quantity: number
  unitPrice: number
  /** true ise birim fiyat elle girildi; adet değişince toplu indirim yeniden uygulanmaz */
  priceLocked: boolean
}

export interface Quote {
  id: ID
  /** T-2026-001 */
  number: string
  customer: string
  items: QuoteItem[]
  note: string
  /** YYYY-MM-DD */
  validUntil: string
  leadTime: string
  status: QuoteStatus
  createdAt: number
  updatedAt: number
}

export interface PriceHistoryEntry {
  id: ID
  productId: ID
  at: number
  totalCost: number
  priceA: number
  priceB: number
  manualPrice: number | null
  /** O anki kayıtlı satış fiyatı */
  salePrice: number
  reason: 'save' | 'apply' | 'sale-change'
}
