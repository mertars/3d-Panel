import type { AppSettings, Channel, FilamentType, PrinterPreset } from './types'

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'app',
  kwhPrice: 4,
  laborRate: 200,
  wastePercent: 5,
  costMultiplier: 2,
  hourlyProfit: 30,
  includeCostInB: true,
  rounding: 'end9',
  vatEnabled: false,
  vatPercent: 20,
  defaultPackaging: 10,
  currencyStyle: 'suffix',
  compactDecimals: false,
  usdRate: 45,
  onboarded: false,
  updatedAt: 0,
}

export interface PrinterPresetInfo {
  key: PrinterPreset
  name: string
  /** Tahmini ortalama güç (W) */
  watts: number
  /** Tahmini saatlik bakım/sarf (TL/saat) */
  maintenancePerHour: number
}

/** Watt değerleri tahmini ortalamadır; priz wattmetresiyle düzeltilebilir. */
export const PRINTER_PRESETS: PrinterPresetInfo[] = [
  { key: 'a1mini', name: 'Bambu Lab A1 mini', watts: 80, maintenancePerHour: 1 },
  { key: 'a1', name: 'Bambu Lab A1', watts: 100, maintenancePerHour: 1.25 },
  { key: 'p1s', name: 'Bambu Lab P1S', watts: 120, maintenancePerHour: 1.5 },
  { key: 'x1c', name: 'Bambu Lab X1C', watts: 130, maintenancePerHour: 2 },
  { key: 'h2d', name: 'Bambu Lab H2D', watts: 200, maintenancePerHour: 3 },
  { key: 'other', name: 'Diğer', watts: 120, maintenancePerHour: 1.5 },
]

export const DEFAULT_PRINTER_LIFE_HOURS = 5000

export function presetInfo(key: PrinterPreset): PrinterPresetInfo {
  return PRINTER_PRESETS.find((p) => p.key === key) ?? PRINTER_PRESETS[PRINTER_PRESETS.length - 1]
}

type FilamentSeed = Omit<FilamentType, 'id' | 'order' | 'estimated' | 'spoolGrams'>

const FILAMENT_SEEDS: FilamentSeed[] = [
  { name: 'PLA', material: 'PLA', spoolPrice: 600, density: 1.24, color: '#F2F2F2' },
  { name: 'PLA Matte', material: 'PLA', spoolPrice: 650, density: 1.24, color: '#8B8F98' },
  { name: 'PLA Silk', material: 'PLA', spoolPrice: 700, density: 1.24, color: '#D4AF37' },
  { name: 'PETG', material: 'PETG', spoolPrice: 650, density: 1.27, color: '#38BDF8' },
  { name: 'ABS', material: 'ABS', spoolPrice: 650, density: 1.04, color: '#EF4444' },
  { name: 'ASA', material: 'ASA', spoolPrice: 900, density: 1.07, color: '#F97316' },
  { name: 'TPU', material: 'TPU', spoolPrice: 1000, density: 1.21, color: '#22C55E' },
  { name: 'PLA-CF', material: 'PLA-CF', spoolPrice: 1100, density: 1.3, color: '#3F3F46' },
  { name: 'PLA Wood', material: 'PLA', spoolPrice: 900, density: 1.15, color: '#A0703C' },
]

export function defaultFilamentTypes(newId: () => string): FilamentType[] {
  return FILAMENT_SEEDS.map((f, i) => ({ ...f, id: newId(), spoolGrams: 1000, estimated: true, order: i }))
}

type ChannelSeed = Omit<Channel, 'id' | 'order' | 'enabled' | 'estimated' | 'lastVerified'>

const CHANNEL_SEEDS: ChannelSeed[] = [
  {
    name: 'Elden / Instagram DM',
    commissionPercent: 0,
    fixedFee: 0,
    fixedFeeCurrency: 'TRY',
    vatOnCommission: false,
    extraPercents: [],
    sellerShipping: 0,
    tiers: [],
    note: 'Komisyon yok. Kargo sende ise "satıcı kargo" alanına yaz.',
  },
  {
    name: 'Shopier',
    commissionPercent: 5.99,
    fixedFee: 0.49,
    fixedFeeCurrency: 'TRY',
    vatOnCommission: true,
    extraPercents: [],
    sellerShipping: 0,
    tiers: [
      { label: 'Standart', percent: 5.99 },
      { label: 'Orta ciro (tahmini)', percent: 4.99 },
      { label: 'Yüksek ciro (tahmini)', percent: 3.99 },
    ],
    note: 'Aylık ciro arttıkça oran düşer; kademeni seç.',
  },
  {
    name: 'Trendyol',
    commissionPercent: 15,
    fixedFee: 0,
    fixedFeeCurrency: 'TRY',
    vatOnCommission: false,
    extraPercents: [],
    sellerShipping: 0,
    tiers: [],
    note: 'Komisyon KDV dahil. Hobi/ev-yaşam ~%10–21; kategoriye göre değişir.',
  },
  {
    name: 'Hepsiburada',
    commissionPercent: 18,
    fixedFee: 0,
    fixedFeeCurrency: 'TRY',
    vatOnCommission: false,
    extraPercents: [],
    sellerShipping: 0,
    tiers: [],
    note: 'Kategoriye göre değişir.',
  },
  {
    name: 'Çiçeksepeti',
    commissionPercent: 15,
    fixedFee: 0,
    fixedFeeCurrency: 'TRY',
    vatOnCommission: false,
    extraPercents: [{ name: 'Altyapı bedeli', percent: 1.5 }],
    sellerShipping: 0,
    tiers: [],
    note: 'Komisyona ek %1,5 altyapı bedeli.',
  },
  {
    name: 'Etsy',
    commissionPercent: 6.5,
    fixedFee: 0.2,
    fixedFeeCurrency: 'USD',
    vatOnCommission: false,
    extraPercents: [
      { name: 'Ödeme işleme (tahmini)', percent: 5 },
      { name: 'Düzenleyici ücret (tahmini)', percent: 1.1 },
    ],
    sellerShipping: 0,
    tiers: [],
    note: '%6,5 işlem ücreti + ödeme işleme + düzenleyici ücret; 0,20 $ listeleme. Ek oranlar tahmini, USD kuru Ayarlar’dan manuel girilir.',
  },
]

export function defaultChannels(newId: () => string): Channel[] {
  return CHANNEL_SEEDS.map((c, i) => ({
    ...c,
    id: newId(),
    order: i,
    enabled: true,
    estimated: true,
    lastVerified: null,
  }))
}

export const DEFAULT_CATEGORIES = [
  'Anahtarlık',
  'Figür',
  'Dekorasyon',
  'Saksı',
  'Oyuncak',
  'Aksesuar',
  'Ofis',
  'Yedek parça',
  'Hediye',
]
