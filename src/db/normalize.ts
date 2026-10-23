import { DEFAULT_SETTINGS, EMPTY_PRINT_NOTES } from './defaults'
import type { AppSettings, Printer, Product, Spool } from './types'

/**
 * Eski sürümlerde kaydedilmiş kayıtları güncel şemaya tamamlar.
 * Hem Dexie geçişinde hem okumada kullanılır (eksik alan kalmasın).
 */

export function normalizeSettings(s: Partial<AppSettings>): AppSettings {
  return { ...DEFAULT_SETTINGS, ...s, id: 'app' }
}

export function normalizePrinter(p: Printer): Printer {
  return { ...p, startHours: p.startHours ?? 0, maintenanceLog: p.maintenanceLog ?? [] }
}

export function normalizeSpool(s: Spool): Spool {
  return {
    ...s,
    emptySpoolWeight: s.emptySpoolWeight ?? null,
    purchaseDate: s.purchaseDate ?? null,
    supplier: s.supplier ?? '',
    note: s.note ?? '',
  }
}

export function normalizeProduct(p: Product): Product {
  const legacy = p as Partial<Product> & Product
  const manual = legacy.manualPrice ?? null
  const saleSource = legacy.saleSource ?? (manual ? 'manual' : 'a')
  const salePrice =
    legacy.salePrice ??
    (saleSource === 'manual' ? (manual ?? 0) : saleSource === 'b' ? p.snapshot.priceB.rounded : p.snapshot.priceA.rounded)
  return {
    ...p,
    saleSource,
    salePrice,
    variants: legacy.variants ?? [],
    printNotes: { ...EMPTY_PRINT_NOTES, ...legacy.printNotes },
    license: legacy.license ?? 'unknown',
    competitorPrice: legacy.competitorPrice ?? null,
    competitorNote: legacy.competitorNote ?? '',
    archived: legacy.archived ?? false,
  }
}
