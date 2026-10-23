/**
 * Tüm veri erişimi buradan geçer — ileride bulut senkronu bu katmana eklenecek.
 */
import { db, newId } from './db'
import { DEFAULT_SETTINGS, EMPTY_PRINT_NOTES } from './defaults'
import { normalizePrinter, normalizeProduct, normalizeSettings, normalizeSpool } from './normalize'
import type {
  AppSettings,
  Channel,
  FilamentType,
  MaintenanceEntry,
  PriceHistoryEntry,
  Printer,
  Product,
  ProductSnapshot,
  Quote,
  SaleSource,
  Spool,
} from './types'

/* ───────────── Ayarlar ───────────── */

export async function getSettings(): Promise<AppSettings> {
  const s = await db.settings.get('app')
  if (s) return normalizeSettings(s)
  const fresh = { ...DEFAULT_SETTINGS, updatedAt: Date.now() }
  await db.settings.put(fresh)
  return fresh
}

export async function updateSettings(patch: Partial<Omit<AppSettings, 'id'>>): Promise<AppSettings> {
  const current = await getSettings()
  const next: AppSettings = { ...current, ...patch, id: 'app', updatedAt: Date.now() }
  await db.settings.put(next)
  return next
}

/* ───────────── Yazıcılar ───────────── */

export const listPrinters = async () => (await db.printers.orderBy('createdAt').toArray()).map(normalizePrinter)

export type PrinterInput = Omit<Printer, 'id' | 'createdAt' | 'startHours' | 'maintenanceLog'> &
  Partial<Pick<Printer, 'startHours' | 'maintenanceLog'>> & { id?: string }

export async function savePrinter(input: PrinterInput): Promise<Printer> {
  return db.transaction('rw', db.printers, async () => {
    const existing = input.id ? await db.printers.get(input.id) : undefined
    const count = await db.printers.count()
    const printer: Printer = normalizePrinter({
      ...(existing ?? {}),
      ...input,
      id: existing?.id ?? newId(),
      createdAt: existing?.createdAt ?? Date.now(),
      // İlk yazıcı otomatik varsayılan olur
      isDefault: input.isDefault || (!existing && count === 0),
    } as Printer)
    if (printer.isDefault) {
      await db.printers.toCollection().modify((p) => {
        p.isDefault = false
      })
    }
    await db.printers.put(printer)
    return printer
  })
}

export async function deletePrinter(id: string): Promise<Printer | undefined> {
  return db.transaction('rw', db.printers, async () => {
    const removed = await db.printers.get(id)
    await db.printers.delete(id)
    if (removed?.isDefault) {
      const first = await db.printers.orderBy('createdAt').first()
      if (first) await db.printers.update(first.id, { isDefault: true })
    }
    return removed
  })
}

export async function restorePrinter(p: Printer) {
  await db.printers.put(p)
}

export async function addMaintenance(printerId: string, entry: Omit<MaintenanceEntry, 'id'>) {
  const p = await db.printers.get(printerId)
  if (!p) return
  const log = [...normalizePrinter(p).maintenanceLog, { ...entry, id: newId() }].sort((a, b) => b.date.localeCompare(a.date))
  await db.printers.update(printerId, { maintenanceLog: log })
}

export async function removeMaintenance(printerId: string, entryId: string): Promise<MaintenanceEntry | undefined> {
  const p = await db.printers.get(printerId)
  if (!p) return
  const log = normalizePrinter(p).maintenanceLog
  const removed = log.find((e) => e.id === entryId)
  await db.printers.update(printerId, { maintenanceLog: log.filter((e) => e.id !== entryId) })
  return removed
}

/* ───────────── Filament türleri ───────────── */

export const listFilamentTypes = () => db.filamentTypes.orderBy('order').toArray()

export async function updateFilamentType(id: string, patch: Partial<Omit<FilamentType, 'id'>>) {
  await db.filamentTypes.update(id, { ...patch, estimated: false })
}

export async function addFilamentType(input: Omit<FilamentType, 'id' | 'order' | 'estimated'>): Promise<FilamentType> {
  const last = await db.filamentTypes.orderBy('order').last()
  const ft: FilamentType = { ...input, id: newId(), order: (last?.order ?? -1) + 1, estimated: false }
  await db.filamentTypes.add(ft)
  return ft
}

export async function deleteFilamentType(id: string): Promise<FilamentType | undefined> {
  const removed = await db.filamentTypes.get(id)
  await db.filamentTypes.delete(id)
  return removed
}

export async function restoreFilamentType(ft: FilamentType) {
  await db.filamentTypes.put(ft)
}

/* ───────────── Makaralar ───────────── */

export const listSpools = async () => (await db.spools.orderBy('createdAt').toArray()).map(normalizeSpool)

export async function saveSpool(input: Omit<Spool, 'id' | 'createdAt'> & { id?: string }): Promise<Spool> {
  const existing = input.id ? await db.spools.get(input.id) : undefined
  const spool: Spool = normalizeSpool({ ...input, id: existing?.id ?? newId(), createdAt: existing?.createdAt ?? Date.now() } as Spool)
  await db.spools.put(spool)
  return spool
}

export async function updateSpool(id: string, patch: Partial<Omit<Spool, 'id'>>) {
  await db.spools.update(id, patch)
}

export async function deleteSpool(id: string): Promise<Spool | undefined> {
  const removed = await db.spools.get(id)
  await db.spools.delete(id)
  return removed
}

export async function restoreSpool(s: Spool) {
  await db.spools.put(s)
}

/* ───────────── Kanallar ───────────── */

export const listChannels = () => db.channels.orderBy('order').toArray()

export async function updateChannel(id: string, patch: Partial<Omit<Channel, 'id'>>) {
  await db.channels.update(id, patch)
}

export async function addChannel(name: string): Promise<Channel> {
  const last = await db.channels.orderBy('order').last()
  const ch: Channel = {
    id: newId(),
    name,
    commissionPercent: 0,
    fixedFee: 0,
    fixedFeeCurrency: 'TRY',
    vatOnCommission: false,
    extraPercents: [],
    sellerShipping: 0,
    tiers: [],
    note: '',
    lastVerified: null,
    enabled: true,
    estimated: false,
    order: (last?.order ?? -1) + 1,
  }
  await db.channels.add(ch)
  return ch
}

export async function deleteChannel(id: string): Promise<Channel | undefined> {
  const removed = await db.channels.get(id)
  await db.channels.delete(id)
  return removed
}

export async function restoreChannel(c: Channel) {
  await db.channels.put(c)
}

/* ───────────── Ürünler ───────────── */

/** Hesapla ekranının yönettiği alanlar; diğerleri (varyant, notlar, lisans…) kayıtta korunur */
export type ProductInput = Pick<
  Product,
  'name' | 'category' | 'tags' | 'link' | 'photo' | 'mode' | 'quick' | 'detailed' | 'manualPrice' | 'snapshot' | 'saleSource' | 'salePrice'
> & { id?: string | null }

function historyEntry(p: Product, reason: PriceHistoryEntry['reason']): PriceHistoryEntry {
  return {
    id: newId(),
    productId: p.id,
    at: Date.now(),
    totalCost: p.snapshot.cost.totalCost,
    priceA: p.snapshot.priceA.rounded,
    priceB: p.snapshot.priceB.rounded,
    manualPrice: p.manualPrice,
    salePrice: p.salePrice,
    reason,
  }
}

/** Ürünü kaydeder (yeni veya güncelleme) ve fiyat geçmişine bir kayıt ekler */
export async function saveProduct(input: ProductInput): Promise<Product> {
  return db.transaction('rw', db.products, db.priceHistory, async () => {
    const existing = input.id ? await db.products.get(input.id) : undefined
    const now = Date.now()
    const product: Product = normalizeProduct({
      variants: [],
      printNotes: EMPTY_PRINT_NOTES,
      license: 'unknown',
      competitorPrice: null,
      competitorNote: '',
      archived: false,
      ...(existing ? normalizeProduct(existing) : {}),
      ...input,
      id: existing?.id ?? newId(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    } as Product)
    await db.products.put(product)
    await db.priceHistory.add(historyEntry(product, 'save'))
    return product
  })
}

/** Hesap dışı alanları günceller (varyant, notlar, lisans, rakip, arşiv) — geçmişe yazmaz */
export async function updateProduct(
  id: string,
  patch: Partial<Pick<Product, 'variants' | 'printNotes' | 'license' | 'competitorPrice' | 'competitorNote' | 'archived' | 'name' | 'category' | 'tags'>>,
) {
  await db.products.update(id, { ...patch, updatedAt: Date.now() })
}

/**
 * Satış fiyatını değiştirir (kaynak seçimi veya "yeni fiyatı uygula") ve geçmişe yazar.
 * snapshot verilirse güncel hesapla değiştirilir.
 */
export async function setSalePrice(
  id: string,
  sale: { source: SaleSource; price: number; manualPrice?: number | null; snapshot?: ProductSnapshot },
  reason: PriceHistoryEntry['reason'] = 'sale-change',
): Promise<Product | undefined> {
  return db.transaction('rw', db.products, db.priceHistory, async () => {
    const existing = await db.products.get(id)
    if (!existing) return
    const p = normalizeProduct(existing)
    const next: Product = {
      ...p,
      saleSource: sale.source,
      salePrice: sale.price,
      manualPrice: sale.manualPrice !== undefined ? sale.manualPrice : p.manualPrice,
      snapshot: sale.snapshot ?? p.snapshot,
      updatedAt: Date.now(),
    }
    await db.products.put(next)
    await db.priceHistory.add(historyEntry(next, reason))
    return next
  })
}

export const getProduct = async (id: string) => {
  const p = await db.products.get(id)
  return p ? normalizeProduct(p) : undefined
}

export const listProducts = async () => (await db.products.orderBy('updatedAt').reverse().toArray()).map(normalizeProduct)

export const countProducts = () => db.products.count()

export async function listProductNames(): Promise<Pick<Product, 'id' | 'name' | 'category'>[]> {
  const all = await db.products.orderBy('updatedAt').reverse().toArray()
  return all.filter((p) => !(p as Partial<Product>).archived).map(({ id, name, category }) => ({ id, name, category }))
}

export async function listCategories(): Promise<string[]> {
  const keys = await db.products.orderBy('category').uniqueKeys()
  return keys.filter((k): k is string => typeof k === 'string' && k.length > 0)
}

export async function duplicateProduct(id: string): Promise<Product | undefined> {
  const p = await getProduct(id)
  if (!p) return
  // saveProduct girdiyi olduğu gibi birleştirir: varyant, not, lisans, rakip de kopyalanır
  const copy = {
    ...p,
    id: null,
    name: `${p.name} (kopya)`,
    archived: false,
    variants: p.variants.map((v) => ({ ...v, id: newId() })),
  }
  return saveProduct(copy)
}

export interface DeletedProduct {
  product: Product
  history: PriceHistoryEntry[]
}

export async function deleteProduct(id: string): Promise<DeletedProduct | undefined> {
  return db.transaction('rw', db.products, db.priceHistory, async () => {
    const product = await db.products.get(id)
    if (!product) return
    const history = await db.priceHistory.where('productId').equals(id).toArray()
    await db.products.delete(id)
    await db.priceHistory.where('productId').equals(id).delete()
    return { product, history }
  })
}

export async function restoreProduct(d: DeletedProduct) {
  await db.transaction('rw', db.products, db.priceHistory, async () => {
    await db.products.put(d.product)
    await db.priceHistory.bulkPut(d.history)
  })
}

export const listPriceHistory = (productId: string) => db.priceHistory.where('productId').equals(productId).sortBy('at')


/* ───────────── Teklifler ───────────── */

export const listQuotes = () => db.quotes.orderBy('createdAt').reverse().toArray()
export const getQuote = (id: string) => db.quotes.get(id)

const isoDate = (d: Date) => d.toISOString().slice(0, 10)

export async function createQuote(settings: Pick<AppSettings, 'quoteValidityDays' | 'defaultLeadTime'>): Promise<Quote> {
  const year = new Date().getFullYear()
  const prefix = `T-${year}-`
  const sameYear = await db.quotes.where('number').startsWith(prefix).toArray()
  const seq = sameYear.reduce((m, q) => Math.max(m, Number(q.number.slice(prefix.length)) || 0), 0) + 1
  const now = Date.now()
  const quote: Quote = {
    id: newId(),
    number: `${prefix}${String(seq).padStart(3, '0')}`,
    customer: '',
    items: [],
    note: '',
    validUntil: isoDate(new Date(now + settings.quoteValidityDays * 86400000)),
    leadTime: settings.defaultLeadTime,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  }
  await db.quotes.add(quote)
  return quote
}

export async function saveQuote(q: Quote) {
  await db.quotes.put({ ...q, updatedAt: Date.now() })
}

export async function deleteQuote(id: string): Promise<Quote | undefined> {
  const removed = await db.quotes.get(id)
  await db.quotes.delete(id)
  return removed
}

export async function restoreQuote(q: Quote) {
  await db.quotes.put(q)
}

/* ───────────── Bakım ───────────── */

export async function resetAllData() {
  await db.delete()
  await db.open()
}
