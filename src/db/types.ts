import type { CostBreakdown, ExtraItem, PriceResult, PricingSettings } from '@/lib/pricing'
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
  updatedAt: number
}

export type PrinterPreset = 'a1mini' | 'a1' | 'p1s' | 'x1c' | 'h2d' | 'other'

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
  createdAt: number
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

/** Parça 2: gerçek makara stoğu */
export interface Spool {
  id: ID
  filamentTypeId: ID
  brand: string
  colorName: string
  color: string
  spoolPrice: number
  spoolGrams: number
  remainingGrams: number
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
  /** FilamentType veya Spool id'si */
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
  snapshot: ProductSnapshot
  createdAt: number
  updatedAt: number
}

/** Parça 2'de genişletilecek */
export interface Order {
  id: ID
  productId: ID | null
  channelId: ID | null
  customer: string
  quantity: number
  unitPrice: number
  status: 'new' | 'printing' | 'ready' | 'shipped' | 'done' | 'cancelled'
  createdAt: number
}

/** Parça 2/3'te genişletilecek */
export interface Quote {
  id: ID
  productId: ID | null
  customer: string
  price: number
  createdAt: number
}

export interface PriceHistoryEntry {
  id: ID
  productId: ID
  at: number
  totalCost: number
  priceA: number
  priceB: number
  manualPrice: number | null
}
