import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, getSettings } from '@/db'
import { createBackup, parseBackup, restoreBackup, summaryText } from './backup'
import { seedDemoData } from './demo'

describe('örnek veri ve yedekleme', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('örnek veri: 12 ürün, 20 sipariş, 6 makara', async () => {
    const r = await seedDemoData()
    expect(r).toEqual({ products: 12, orders: 20, spools: 6 })
    expect(await db.products.count()).toBe(12)
    expect(await db.orders.count()).toBe(20)
    expect(await db.spools.count()).toBe(6)
    expect(await db.printers.count()).toBe(1)
    const orders = await db.orders.toArray()
    expect(orders.every((o) => o.items.length > 0 && o.items.every((i) => i.unitPrice > 0 && i.unitCost > 0))).toBe(true)
    expect(new Set(orders.map((o) => o.number)).size).toBe(20)
    const products = await db.products.toArray()
    expect(products.every((p) => p.salePrice > p.snapshot.cost.totalCost)).toBe(true)
  })

  it('JSON yedek → özet → üzerine yaz geri yükleme (fotoğraf dahil)', async () => {
    await seedDemoData()
    const photo = new Blob([new Uint8Array([137, 80, 78, 71, 1, 2, 3])], { type: 'image/png' })
    const first = (await db.products.toCollection().first())!
    await db.products.update(first.id, { photo })

    const backup = await createBackup()
    const text = JSON.stringify(backup)
    const parsed = parseBackup(text)
    expect(summaryText(parsed)).toContain('12 ürün')
    expect(summaryText(parsed)).toContain('20 sipariş')
    expect(summaryText(parsed)).toContain('6 makara')

    await db.products.clear()
    await db.orders.clear()
    await restoreBackup(parsed, 'replace')
    expect(await db.products.count()).toBe(12)
    expect(await db.orders.count()).toBe(20)
    const restored = (await db.products.get(first.id))!
    expect(restored.photo).toBeInstanceOf(Blob)
    expect(new Uint8Array(await restored.photo!.arrayBuffer())).toEqual(new Uint8Array([137, 80, 78, 71, 1, 2, 3]))
  })

  it('birleştir: mevcut kayıtlar kalır, ayarlar korunur', async () => {
    await seedDemoData()
    const backup = parseBackup(JSON.stringify(await createBackup()))
    await db.settings.update('app', { kwhPrice: 9.99 })
    await db.products.add({ ...(await db.products.toCollection().first())!, id: 'yeni-urun', name: 'Yedekte olmayan' })
    await restoreBackup(backup, 'merge')
    expect(await db.products.count()).toBe(13)
    expect((await getSettings()).kwhPrice).toBe(9.99)
  })

  it('geçersiz dosyalar reddedilir', () => {
    expect(() => parseBackup('merhaba')).toThrow('JSON değil')
    expect(() => parseBackup('{"app":"baska"}')).toThrow('Katman yedeği değil')
    expect(() => parseBackup(JSON.stringify({ app: 'katman', schema: 999, exportedAt: '', data: {} }))).toThrow('daha yeni')
  })
})
