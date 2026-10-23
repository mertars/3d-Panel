import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'
import { KatmanDB } from './db'

/** Parça 1 (v1) verisiyle açılan veritabanı v2'ye eksiksiz taşınmalı */
describe('Dexie v1 → güncel sürüm geçişi', () => {
  it('eski ürün, yazıcı, ayar ve teklif kayıtları tamamlanır', async () => {
    const name = 'katman-migration-test'
    const v1 = new Dexie(name)
    v1.version(1).stores({
      settings: 'id', printers: 'id, createdAt', filamentTypes: 'id, order', spools: 'id, filamentTypeId, createdAt',
      channels: 'id, order', products: 'id, name, category, updatedAt, *tags', orders: 'id, productId, channelId, status, createdAt',
      quotes: 'id, productId, createdAt', priceHistory: 'id, productId, at',
    })
    await v1.open()
    await v1.table('settings').put({ id: 'app', kwhPrice: 3.2, onboarded: true })
    await v1.table('printers').put({ id: 'p', name: 'P1S', createdAt: 1, price: 35000 })
    await v1.table('products').put({
      id: 'x', name: 'Eski ürün', category: '', tags: [], updatedAt: 1, manualPrice: 275,
      snapshot: { priceA: { rounded: 309 }, priceB: { rounded: 289 }, cost: { totalCost: 151.48 } },
    })
    await v1.table('products').put({ id: 'y', name: 'A kaynaklı', category: '', tags: [], updatedAt: 2, manualPrice: null, snapshot: { priceA: { rounded: 309 }, priceB: { rounded: 289 } } })
    await v1.table('quotes').put({ id: 'q', productId: null, customer: 'x', price: 1, createdAt: 1 })
    v1.close()

    const db = new KatmanDB(name)
    await db.open()
    expect(db.verno).toBe(3)
    const x = await db.products.get('x')
    expect(x).toMatchObject({ saleSource: 'manual', salePrice: 275, variants: [], license: 'unknown', archived: false, competitorPrice: null })
    expect(x?.printNotes).toMatchObject({ layerHeight: null, nozzle: '' })
    expect(await db.products.get('y')).toMatchObject({ saleSource: 'a', salePrice: 309 })
    expect(await db.printers.get('p')).toMatchObject({ startHours: 0, maintenanceLog: [] })
    const s = await db.settings.get('app')
    expect(s).toMatchObject({ kwhPrice: 3.2, onboarded: true, lowStockGrams: 150, quoteValidityDays: 14 })
    expect(s?.bulkTiers).toHaveLength(5)
    expect(await db.quotes.count()).toBe(0) // şemaya uymayan yer tutucu teklif temizlendi
    expect(s).toMatchObject({ consumeOn: 'printing', printerHoursPerDay: 16, lastBackupAt: null })
    expect(await db.failures.count()).toBe(0)
    db.close()
  })
})
