/**
 * Tüm veri erişimi buradan geçer — ileride bulut senkronu bu katmana eklenecek.
 */
import { db, newId } from './db'
import { DEFAULT_SETTINGS } from './defaults'
import type { AppSettings, Channel, FilamentType, Printer, Product } from './types'

/* ───────────── Ayarlar ───────────── */

export async function getSettings(): Promise<AppSettings> {
  const s = await db.settings.get('app')
  if (s) return { ...DEFAULT_SETTINGS, ...s }
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

export const listPrinters = () => db.printers.orderBy('createdAt').toArray()

export async function savePrinter(input: Omit<Printer, 'id' | 'createdAt'> & { id?: string }): Promise<Printer> {
  return db.transaction('rw', db.printers, async () => {
    const existing = input.id ? await db.printers.get(input.id) : undefined
    const count = await db.printers.count()
    const printer: Printer = {
      ...input,
      id: existing?.id ?? newId(),
      createdAt: existing?.createdAt ?? Date.now(),
      // İlk yazıcı otomatik varsayılan olur
      isDefault: input.isDefault || (!existing && count === 0),
    }
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

export const listSpools = () => db.spools.orderBy('createdAt').toArray()

/* ───────────── Kanallar ───────────── */

export const listChannels = () => db.channels.orderBy('order').toArray()

export async function updateChannel(id: string, patch: Partial<Omit<Channel, 'id'>>) {
  await db.channels.update(id, patch)
}

/* ───────────── Ürünler ───────────── */

export type ProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { id?: string | null }

/** Ürünü kaydeder (yeni veya güncelleme) ve fiyat geçmişine bir kayıt ekler */
export async function saveProduct(input: ProductInput): Promise<Product> {
  return db.transaction('rw', db.products, db.priceHistory, async () => {
    const existing = input.id ? await db.products.get(input.id) : undefined
    const now = Date.now()
    const product: Product = {
      ...input,
      id: existing?.id ?? newId(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    await db.products.put(product)
    await db.priceHistory.add({
      id: newId(),
      productId: product.id,
      at: now,
      totalCost: product.snapshot.cost.totalCost,
      priceA: product.snapshot.priceA.rounded,
      priceB: product.snapshot.priceB.rounded,
      manualPrice: product.manualPrice,
    })
    return product
  })
}

export const getProduct = (id: string) => db.products.get(id)
export const countProducts = () => db.products.count()

export async function listProductNames(): Promise<Pick<Product, 'id' | 'name' | 'category'>[]> {
  const all = await db.products.orderBy('updatedAt').reverse().toArray()
  return all.map(({ id, name, category }) => ({ id, name, category }))
}

export async function listCategories(): Promise<string[]> {
  const keys = await db.products.orderBy('category').uniqueKeys()
  return keys.filter((k): k is string => typeof k === 'string' && k.length > 0)
}

/* ───────────── Bakım ───────────── */

export async function resetAllData() {
  await db.delete()
  await db.open()
}
