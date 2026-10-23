import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { addFailure, createOrder, deleteFailure, deleteOrder, restoreOrder, saveOrder, setOrderStatus } from './orders'
import { saveSpool, updateSettings } from './repository'
import type { OrderItem } from './types'

async function setup() {
  await db.delete()
  await db.open()
  const pla = (await db.filamentTypes.orderBy('order').first())!
  const white = await saveSpool({ filamentTypeId: pla.id, brand: 'Bambu', colorName: 'Beyaz', color: '#FFFFFF', spoolPrice: 600, spoolGrams: 1000, remainingGrams: 300, emptySpoolWeight: null, purchaseDate: null, supplier: '', note: '' })
  const red = await saveSpool({ filamentTypeId: pla.id, brand: 'Bambu', colorName: 'Kırmızı', color: '#E11D48', spoolPrice: 600, spoolGrams: 1000, remainingGrams: 50, emptySpoolWeight: null, purchaseDate: null, supplier: '', note: '' })
  const item: OrderItem = {
    key: 'k', productId: null, variantId: null, name: 'Anahtarlık', quantity: 2, unitPrice: 309, unitCost: 151.48, hoursPerUnit: 4.5,
    depreciationPerUnit: 27, printerId: 'p1', filaments: [{ filamentId: red.id, grams: 20 }, { filamentId: pla.id, grams: 85 }],
  }
  return { pla, white, red, item }
}

const remaining = async (id: string) => (await db.spools.get(id))!.remainingGrams

describe('sipariş stok akışı', () => {
  beforeEach(async () => {
    await db.delete()
  })

  it('Baskıda → stok düşer + yazıcı yükü; Yeni’ye dönünce geri alınır', async () => {
    const { white, red, item } = await setup()
    const o = await createOrder({ items: [item] })
    expect(o.number).toMatch(/^S-\d{4}-001$/)

    const ch = await setOrderStatus(o.id, 'printing')
    expect(ch?.consumed).toBe(true)
    // kırmızı: 40 g belirli makaradan; PLA türü: 170 g — önce az kalan (kırmızı 10 g kaldı), sonra beyaz 160 g
    expect(await remaining(red.id)).toBe(0)
    expect(await remaining(white.id)).toBe(140)
    expect(ch?.order.consumption?.printers).toEqual([{ printerId: 'p1', hours: 9, depreciation: 54 }])
    expect(ch?.order.consumption?.missing).toEqual([])

    // Hazır/Kargoda tekrar düşmez
    await setOrderStatus(o.id, 'ready')
    expect(await remaining(white.id)).toBe(140)

    const back = await setOrderStatus(o.id, 'new')
    expect(back?.restored).toBe(true)
    expect(await remaining(red.id)).toBe(50)
    expect(await remaining(white.id)).toBe(300)
  })

  it('ayar “Teslim edildi” ise yalnızca teslimde düşer; iptal geri alır', async () => {
    const { white, item } = await setup()
    await updateSettings({ consumeOn: 'delivered' })
    const o = await createOrder({ items: [item] })
    await setOrderStatus(o.id, 'printing')
    expect(await remaining(white.id)).toBe(300)
    await setOrderStatus(o.id, 'delivered')
    expect(await remaining(white.id)).toBeLessThan(300)
    await setOrderStatus(o.id, 'cancelled')
    expect(await remaining(white.id)).toBe(300)
  })

  it('stok yetmezse eksik kaydedilir; silme stoğu iade eder, geri alma yeniden düşer', async () => {
    const { pla, white, red, item } = await setup()
    const o = await createOrder({ items: [{ ...item, quantity: 5 }] }) // kırmızı 100 g (50 var), PLA 425 g
    const ch = await setOrderStatus(o.id, 'printing')
    expect(ch?.order.consumption?.missing).toEqual([
      { filamentId: red.id, grams: 50 },
      { filamentId: pla.id, grams: 125 }, // 425 g gerekli, beyazda 300 g vardı
    ])
    expect(await remaining(white.id)).toBe(0)
    const removed = await deleteOrder(o.id)
    expect(await remaining(white.id)).toBe(300)
    expect(await remaining(red.id)).toBe(50)
    await restoreOrder(removed!)
    expect(await remaining(white.id)).toBe(0)
  })

  it('stoğu düşülmüş siparişin kalemi değişince fark yeniden hesaplanır', async () => {
    const { white, item } = await setup()
    const o = await createOrder({ items: [item] })
    const ch = await setOrderStatus(o.id, 'printing')
    await saveOrder({ ...ch!.order, items: [{ ...item, quantity: 1 }] })
    // 1 adet: kırmızı 20 g, PLA 85 g → kırmızıdan 30 kalan → PLA önce kırmızıdan 30, beyazdan 55
    expect(await remaining(white.id)).toBe(245)
  })

  it('fire kaydı stoktan düşer, silinince iade edilir', async () => {
    const { white } = await setup()
    const f = await addFailure({ printerId: 'p1', filamentId: white.id, grams: 60, hours: 2, reason: 'spaghetti', note: '', orderId: null })
    expect(await remaining(white.id)).toBe(240)
    expect(f.consumption?.printers).toEqual([{ printerId: 'p1', hours: 2, depreciation: 0 }])
    await deleteFailure(f.id)
    expect(await remaining(white.id)).toBe(300)
  })
})
