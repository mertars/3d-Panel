import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, EMPTY_PRINT_NOTES, type FilamentType, type Printer, type Product, type Spool } from '@/db'
import { computeCost, computePrices } from '@/lib/pricing'
import { avgFilamentId, draftFromProduct, draftToCostInput, type Catalog } from '@/features/calculator/draft'
import { evaluateProduct, evaluateVariant, marginTone } from './evaluate'

const settings = { ...DEFAULT_SETTINGS } // kWh 4, işçilik 200, fire %5, ×2, 30 ₺/sa, …9

const pla: FilamentType = { id: 'pla', name: 'PLA', material: 'PLA', spoolPrice: 600, spoolGrams: 1000, density: 1.24, color: '#ffffff', estimated: true, order: 0 }
const printer: Printer = {
  id: 'p1s', name: 'P1S', preset: 'p1s', price: 35000, salvageValue: 5000, lifeHours: 5000, watts: 120, maintenancePerHour: 1.5,
  isDefault: true, startHours: 0, maintenanceLog: [], createdAt: 0,
}
const catalog: Catalog = { filamentTypes: [pla], spools: [], printers: [printer] }

function referenceProduct(): Product {
  const base: Product = {
    id: 'x', name: 'Referans', category: '', tags: [], link: '', photo: null, mode: 'detailed',
    quick: { cost: 0, printHours: 0 },
    detailed: { filaments: [{ filamentId: 'pla', gram: 85, purgeGram: 0 }], printHours: 4.5, printerId: 'p1s', laborMinutes: 15, extras: [], packaging: 10, unitsPerPlate: 1 },
    manualPrice: null, saleSource: 'a', salePrice: 0, variants: [], printNotes: EMPTY_PRINT_NOTES, license: 'unknown',
    competitorPrice: null, competitorNote: '', archived: false,
    snapshot: undefined as unknown as Product['snapshot'], createdAt: 0, updatedAt: 0,
  }
  const cost = computeCost(draftToCostInput(draftFromProduct(base), catalog), settings)
  const prices = computePrices(cost, settings)
  return { ...base, salePrice: prices.a.rounded, snapshot: { at: 0, settings, cost, priceA: prices.a, priceB: prices.b, manual: null } }
}

describe('ürün değerlendirme', () => {
  it('ayarlar değişmediyse fiyat güncel', () => {
    const ev = evaluateProduct(referenceProduct(), catalog, settings)
    expect(ev.prices.a.rounded).toBe(309)
    expect(ev.currentSalePrice).toBe(309)
    expect(ev.drift.stale).toBe(false)
    expect(ev.colors).toEqual(['#ffffff'])
  })

  it('filament zammı → eskimiş fiyat tespiti', () => {
    const pricier = { ...catalog, filamentTypes: [{ ...pla, spoolPrice: 900 }] }
    const ev = evaluateProduct(referenceProduct(), pricier, settings)
    // filament 76,50 → maliyet ~178,32 → A ham 356,6 → 359
    expect(ev.currentSalePrice).toBe(359)
    expect(ev.drift.stale).toBe(true)
    expect(ev.drift.diffPercent).toBeCloseTo(((359 - 309) / 309) * 100, 10)
    // Kayıtlı satış fiyatıyla güncel marj düşer
    expect(ev.sale.metrics.profit).toBeCloseTo(309 - ev.cost.totalCost, 10)
  })

  it('küçük elektrik zammı (%5 altı fark) eskimiş sayılmaz', () => {
    const ev = evaluateProduct(referenceProduct(), catalog, { ...settings, kwhPrice: 4.5 })
    expect(ev.drift.stale).toBe(false)
  })

  it('oran değişince B kaynaklı ürün eskir', () => {
    const p = { ...referenceProduct(), saleSource: 'b' as const, salePrice: 289 }
    expect(evaluateProduct(p, catalog, settings).drift.stale).toBe(false)
    const ev = evaluateProduct(p, catalog, { ...settings, hourlyProfit: 40 })
    expect(ev.currentSalePrice).toBe(339) // 151,48 + 4,5×40 = 331,48 → 339
    expect(ev.drift.stale).toBe(true)
  })

  it('manuel fiyat maliyetle orantılı güncellenir', () => {
    const p = { ...referenceProduct(), saleSource: 'manual' as const, salePrice: 299, manualPrice: 299 }
    expect(evaluateProduct(p, catalog, settings).currentSalePrice).toBe(299)
    const ev = evaluateProduct(p, { ...catalog, filamentTypes: [{ ...pla, spoolPrice: 900 }] }, settings)
    expect(ev.currentSalePrice).toBe(359) // 299 × 178,32/151,48 = 351,9 → 359
    expect(ev.drift.stale).toBe(true)
  })

  it('varyant kendi gram/süresiyle hesaplanır', () => {
    const p = referenceProduct()
    const big = { id: 'v1', name: 'Büyük', filaments: [{ filamentId: 'pla', gram: 170, purgeGram: 0 }], printHours: 9, unitsPerPlate: 1, laborMinutes: 15, priceOverride: null }
    const ev = evaluateVariant(p, big, catalog, settings)
    // filament 102 + elektrik 4,32 + amortisman 54 + bakım 13,5 = 173,82 / 0,95 = 182,97 + 50 + 10 = 242,97
    expect(Math.round(ev.cost.totalCost * 100) / 100).toBe(242.97)
    expect(ev.prices.a.rounded).toBe(489) // 485,94 → 489
    expect(ev.salePrice).toBe(489)
    expect(evaluateVariant(p, { ...big, priceOverride: 450 }, catalog, settings).salePrice).toBe(450)
    // Ana ürün etkilenmez
    expect(evaluateProduct(p, catalog, settings).prices.a.rounded).toBe(309)
  })

  it('stok ortalaması filament olarak seçilebilir', () => {
    const spools: Spool[] = [
      { id: 's1', filamentTypeId: 'pla', brand: 'A', colorName: 'Beyaz', color: '#fff', spoolPrice: 600, spoolGrams: 1000, remainingGrams: 800, emptySpoolWeight: null, purchaseDate: null, supplier: '', note: '', createdAt: 0 },
      { id: 's2', filamentTypeId: 'pla', brand: 'B', colorName: 'Siyah', color: '#000', spoolPrice: 750, spoolGrams: 1000, remainingGrams: 200, emptySpoolWeight: null, purchaseDate: null, supplier: '', note: '', createdAt: 0 },
    ]
    const p = referenceProduct()
    p.detailed.filaments = [{ filamentId: avgFilamentId('pla'), gram: 100, purgeGram: 0 }]
    const ev = evaluateProduct(p, { ...catalog, spools }, settings)
    expect(ev.cost.filament).toBeCloseTo(100 * 0.63, 10)
  })

  it('marj rozeti renkleri', () => {
    expect(marginTone(10)).toBe('danger')
    expect(marginTone(20)).toBe('warning')
    expect(marginTone(40)).toBe('warning')
    expect(marginTone(40.1)).toBe('success')
    expect(marginTone(null)).toBe('neutral')
  })
})
