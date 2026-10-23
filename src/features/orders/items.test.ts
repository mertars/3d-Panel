import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, EMPTY_PRINT_NOTES, emptyOrder, type Channel, type FilamentType, type Printer, type Product } from '@/db'
import type { Catalog } from '@/features/calculator/draft'
import { itemFromProduct, totalsFor } from './items'

const settings = { ...DEFAULT_SETTINGS }
const pla: FilamentType = { id: 'pla', name: 'PLA', material: 'PLA', spoolPrice: 600, spoolGrams: 1000, density: 1.24, color: '#fff', estimated: true, order: 0 }
const printer: Printer = { id: 'p1', name: 'P1S', preset: 'p1s', price: 35000, salvageValue: 5000, lifeHours: 5000, watts: 120, maintenancePerHour: 1.5, isDefault: true, startHours: 0, maintenanceLog: [], createdAt: 0 }
const catalog: Catalog = { filamentTypes: [pla], spools: [], printers: [printer] }

const product = {
  id: 'x', name: 'Referans', category: '', tags: [], link: '', photo: null, mode: 'detailed',
  quick: { cost: 0, printHours: 0 },
  detailed: { filaments: [{ filamentId: 'pla', gram: 85, purgeGram: 5 }], printHours: 4.5, printerId: 'p1', laborMinutes: 15, extras: [], packaging: 10, unitsPerPlate: 1 },
  manualPrice: null, saleSource: 'a', salePrice: 329, variants: [], printNotes: EMPTY_PRINT_NOTES, license: 'unknown',
  competitorPrice: null, competitorNote: '', archived: false, snapshot: { cost: { totalCost: 0 } }, createdAt: 0, updatedAt: 0,
} as unknown as Product

describe('sipariş kalemi', () => {
  it('ürün hesabından snapshot alır', () => {
    const it1 = itemFromProduct(product, null, 3, catalog, settings)
    expect(it1).toMatchObject({ name: 'Referans', quantity: 3, unitPrice: 329, printerId: 'p1', hoursPerUnit: 4.5, depreciationPerUnit: 27 })
    expect(it1.filaments).toEqual([{ filamentId: 'pla', grams: 90 }])
    expect(it1.unitCost).toBeCloseTo((86.91 + 5 * 0.6) / 0.95 + 60, 6) // purge 5 g fireli üretime eklenir
  })

  it('plaka başı adet filament ve amortismanı böler; fiyat elle verilebilir', () => {
    const p = { ...product, detailed: { ...product.detailed, unitsPerPlate: 8 } }
    const it1 = itemFromProduct(p, null, 1, catalog, settings, 99)
    expect(it1.unitPrice).toBe(99)
    expect(it1.filaments[0].grams).toBeCloseTo(90 / 8, 10)
    expect(it1.depreciationPerUnit).toBeCloseTo(27 / 8, 10)
    expect(it1.hoursPerUnit).toBeCloseTo(4.5 / 8, 10)
  })

  it('varyant kendi değerleriyle', () => {
    const v = { id: 'v', name: 'Büyük', filaments: [{ filamentId: 'pla', gram: 170, purgeGram: 0 }], printHours: 9, unitsPerPlate: 1, laborMinutes: 15, priceOverride: null }
    const it1 = itemFromProduct({ ...product, variants: [v] }, v, 1, catalog, settings)
    expect(it1).toMatchObject({ name: 'Referans — Büyük', unitPrice: 489, hoursPerUnit: 9, depreciationPerUnit: 54 })
    expect(it1.filaments).toEqual([{ filamentId: 'pla', grams: 170 }])
  })

  it('kanal tablosu ile sipariş toplamı (Trendyol %15)', () => {
    const trendyol = { id: 't', name: 'Trendyol', commissionPercent: 15, fixedFee: 0, fixedFeeCurrency: 'TRY', vatOnCommission: false, extraPercents: [], sellerShipping: 50, tiers: [], note: '', lastVerified: null, enabled: true, estimated: true, order: 0 } as Channel
    const o = { ...emptyOrder('S-1'), channelId: 't', items: [itemFromProduct(product, null, 2, catalog, settings)] }
    const t = totalsFor(o, [trendyol], settings)
    expect(t.revenue).toBe(658)
    expect(t.channelFee).toBeCloseTo(98.7, 10) // kanalın 50 ₺ kargosu sipariş kargosu alanıyla çakışmasın diye sayılmaz
  })
})
