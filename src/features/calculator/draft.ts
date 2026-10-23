import type { CalcMode, FilamentType, Printer, Product, ProductVariant, SaleSource, Spool } from '@/db'
import { weightedAverageGramPrice, type CostInput, type ExtraItem } from '@/lib/pricing'

/** Hesapla formunun (kaydedilmemiş) durumu. Boş alanlar null. */
export interface DraftFilament {
  key: string
  filamentId: string
  gram: number | null
  purgeGram: number | null
}

export interface DraftExtra {
  key: string
  name: string
  amount: number | null
}

export interface Draft {
  productId: string | null
  mode: CalcMode
  name: string
  category: string
  tags: string[]
  link: string
  photo: Blob | null
  quickCost: number | null
  quickHours: number | null
  filaments: DraftFilament[]
  printHours: number | null
  printerId: string | null
  unitsPerPlate: number | null
  laborMinutes: number | null
  extras: DraftExtra[]
  packaging: number | null
  manualPrice: number | null
  /** Kaydederken satış fiyatı olarak hangisi kullanılsın */
  saleSource: SaleSource
}

export const rowKey = () => Math.random().toString(36).slice(2, 10)

export function emptyDraft(defaults: { packaging: number; filamentId?: string; printerId?: string | null }): Draft {
  return {
    productId: null,
    mode: 'detailed',
    name: '',
    category: '',
    tags: [],
    link: '',
    photo: null,
    quickCost: null,
    quickHours: null,
    filaments: [{ key: rowKey(), filamentId: defaults.filamentId ?? '', gram: null, purgeGram: null }],
    printHours: null,
    printerId: defaults.printerId ?? null,
    unitsPerPlate: 1,
    laborMinutes: null,
    extras: [],
    packaging: defaults.packaging,
    manualPrice: null,
    saleSource: 'a',
  }
}

export function draftFromProduct(p: Product): Draft {
  return {
    productId: p.id,
    mode: p.mode,
    name: p.name,
    category: p.category,
    tags: [...p.tags],
    link: p.link,
    photo: p.photo,
    quickCost: p.quick.cost,
    quickHours: p.quick.printHours,
    filaments: p.detailed.filaments.map((f) => ({ key: rowKey(), ...f })),
    printHours: p.detailed.printHours,
    printerId: p.detailed.printerId,
    unitsPerPlate: p.detailed.unitsPerPlate,
    laborMinutes: p.detailed.laborMinutes,
    extras: p.detailed.extras.map((e) => ({ key: rowKey(), ...e })),
    packaging: p.detailed.packaging,
    manualPrice: p.manualPrice,
    saleSource: p.saleSource,
  }
}

export interface Catalog {
  filamentTypes: FilamentType[]
  spools: Spool[]
  printers: Printer[]
}

export interface ResolvedFilament {
  id: string
  name: string
  color: string
  spoolPrice: number
  spoolGrams: number
}

export const AVG_PREFIX = 'avg:'
export const avgFilamentId = (typeId: string) => `${AVG_PREFIX}${typeId}`

/** Bir filament satırının fiyat kaynağını (makara, tür veya stok ortalaması) bulur */
export function resolveFilament(id: string, catalog: Catalog): ResolvedFilament | null {
  if (id.startsWith(AVG_PREFIX)) {
    const typeId = id.slice(AVG_PREFIX.length)
    const type = catalog.filamentTypes.find((t) => t.id === typeId)
    const avg = weightedAverageGramPrice(catalog.spools.filter((s) => s.filamentTypeId === typeId))
    if (!type || avg === null) return null
    return { id, name: `${type.name} · stok ortalaması`, color: type.color, spoolPrice: avg * 1000, spoolGrams: 1000 }
  }
  const spool = catalog.spools.find((s) => s.id === id)
  if (spool) {
    const type = catalog.filamentTypes.find((t) => t.id === spool.filamentTypeId)
    return {
      id,
      name: [type?.name, spool.colorName].filter(Boolean).join(' · '),
      color: spool.color,
      spoolPrice: spool.spoolPrice,
      spoolGrams: spool.spoolGrams,
    }
  }
  const type = catalog.filamentTypes.find((t) => t.id === id)
  return type ? { id, name: type.name, color: type.color, spoolPrice: type.spoolPrice, spoolGrams: type.spoolGrams } : null
}

export function resolvePrinter(id: string | null, printers: Printer[]): Printer | null {
  return printers.find((p) => p.id === id) ?? null
}

const n = (x: number | null) => x ?? 0

export function draftToCostInput(d: Draft, catalog: Catalog): CostInput {
  if (d.mode === 'quick') return { mode: 'quick', cost: n(d.quickCost), printHours: n(d.quickHours) }
  const printer = resolvePrinter(d.printerId, catalog.printers)
  return {
    mode: 'detailed',
    filaments: d.filaments.flatMap((f) => {
      const r = resolveFilament(f.filamentId, catalog)
      return r ? [{ gram: n(f.gram), purgeGram: n(f.purgeGram), spoolPrice: r.spoolPrice, spoolGrams: r.spoolGrams }] : []
    }),
    printHours: n(d.printHours),
    printer: printer && {
      price: printer.price,
      salvageValue: printer.salvageValue,
      lifeHours: printer.lifeHours,
      watts: printer.watts,
      maintenancePerHour: printer.maintenancePerHour,
    },
    laborMinutes: n(d.laborMinutes),
    extras: d.extras.map<ExtraItem>((e) => ({ name: e.name, amount: n(e.amount) })),
    packaging: n(d.packaging),
    unitsPerPlate: Math.max(1, Math.floor(n(d.unitsPerPlate)) || 1),
  }
}

/** Hesaplamayı etkileyen eksikler (ekranda rozet olarak gösterilir) */
export function draftWarnings(d: Draft, catalog: Catalog): string[] {
  const w: string[] = []
  if (d.mode === 'quick') {
    if (!d.quickCost) w.push('Maliyet girilmedi')
    if (!d.quickHours) w.push('Baskı süresi girilmedi')
    return w
  }
  if (!resolvePrinter(d.printerId, catalog.printers)) w.push('Yazıcı seçilmedi — elektrik, amortisman ve bakım 0 sayılıyor')
  else if (!resolvePrinter(d.printerId, catalog.printers)!.price) w.push('Yazıcı fiyatı girilmedi — amortisman 0 sayılıyor')
  if (d.filaments.some((f) => f.filamentId && !resolveFilament(f.filamentId, catalog))) w.push('Silinmiş bir filament seçili')
  if (!d.printHours) w.push('Baskı süresi girilmedi')
  return w
}

/** Varyant: ürünün detaylı girdilerini varyantın filament/süre/adet/işçilik değerleriyle değiştirir */
export function variantDraft(base: Draft, v: ProductVariant): Draft {
  return {
    ...base,
    mode: 'detailed',
    filaments: v.filaments.map((f) => ({ key: rowKey(), ...f })),
    printHours: v.printHours,
    unitsPerPlate: v.unitsPerPlate,
    laborMinutes: v.laborMinutes,
  }
}
