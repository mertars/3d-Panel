import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { draftFromProduct, draftToCostInput, emptyDraft } from '@/features/calculator/draft'
import { computeCost, computePrices } from '@/lib/pricing'
import { db } from './db'
import { getSettings, listChannels, listFilamentTypes, listPrinters, saveProduct, savePrinter } from './repository'

describe('Dexie tohum verileri ve ürün kaydı', () => {
  it('ilk açılışta varsayılanlarla tohumlanır', async () => {
    const s = await getSettings()
    expect(s.kwhPrice).toBe(4)
    expect(s.onboarded).toBe(false)
    const types = await listFilamentTypes()
    expect(types.map((t) => t.name)).toEqual(['PLA', 'PLA Matte', 'PLA Silk', 'PETG', 'ABS', 'ASA', 'TPU', 'PLA-CF', 'PLA Wood'])
    expect(types[0]).toMatchObject({ spoolPrice: 600, spoolGrams: 1000, density: 1.24, estimated: true })
    const channels = await listChannels()
    expect(channels.map((c) => c.name)).toEqual(['Elden / Instagram DM', 'Shopier', 'Trendyol', 'Hepsiburada', 'Çiçeksepeti', 'Etsy'])
    expect(channels[1]).toMatchObject({ commissionPercent: 5.99, fixedFee: 0.49, vatOnCommission: true })
  })

  it('ilk yazıcı otomatik varsayılan olur', async () => {
    const p = await savePrinter({ name: 'P1S', preset: 'p1s', price: 35000, salvageValue: 5000, lifeHours: 5000, watts: 120, maintenancePerHour: 1.5, isDefault: false })
    expect(p.isDefault).toBe(true)
    const second = await savePrinter({ name: 'A1', preset: 'a1', price: 20000, salvageValue: 0, lifeHours: 5000, watts: 100, maintenancePerHour: 1, isDefault: false })
    expect(second.isDefault).toBe(false)
  })

  it('taslak → maliyet girdisi → kayıt → geri yükleme referans sonucu korur', async () => {
    const [types, printers, settings] = await Promise.all([listFilamentTypes(), listPrinters(), getSettings()])
    const catalog = { filamentTypes: types, spools: [], printers }
    const draft = {
      ...emptyDraft({ packaging: 10, filamentId: types[0].id, printerId: printers.find((p) => p.isDefault)!.id }),
      name: 'Referans',
      printHours: 4.5,
      laborMinutes: 15,
    }
    draft.filaments[0].gram = 85
    const cost = computeCost(draftToCostInput(draft, catalog), settings)
    const prices = computePrices(cost, settings)
    expect(prices.a.rounded).toBe(309)
    expect(prices.b.rounded).toBe(289)

    const saved = await saveProduct({
      id: null,
      name: draft.name,
      category: '',
      tags: [],
      link: '',
      photo: null,
      mode: 'detailed',
      quick: { cost: 0, printHours: 0 },
      detailed: {
        filaments: [{ filamentId: types[0].id, gram: 85, purgeGram: 0 }],
        printHours: 4.5,
        printerId: draft.printerId,
        laborMinutes: 15,
        extras: [],
        packaging: 10,
        unitsPerPlate: 1,
      },
      manualPrice: null,
      saleSource: 'a',
      salePrice: prices.a.rounded,
      snapshot: { at: Date.now(), settings, cost, priceA: prices.a, priceB: prices.b, manual: null },
    })
    const history = await db.priceHistory.where('productId').equals(saved.id).toArray()
    expect(history).toHaveLength(1)
    expect(history[0]).toMatchObject({ priceA: 309, priceB: 289, salePrice: 309, reason: 'save' })

    const reloaded = draftFromProduct((await db.products.get(saved.id))!)
    const again = computePrices(computeCost(draftToCostInput(reloaded, catalog), settings), settings)
    expect(again.a.rounded).toBe(309)
    expect(again.b.rounded).toBe(289)
  })
})
