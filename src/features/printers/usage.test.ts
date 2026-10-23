import { describe, expect, it } from 'vitest'
import { emptyOrder, type Failure, type Order, type Printer } from '@/db'
import { printerUsage } from './usage'

const printer: Printer = {
  id: 'p', name: 'P1S', preset: 'p1s', price: 35000, salvageValue: 5000, lifeHours: 5000, watts: 120, maintenancePerHour: 1.5,
  isDefault: true, startHours: 200, maintenanceLog: [], createdAt: 0,
}
const withLoad = (printers: { printerId: string; hours: number; depreciation: number }[]): Order => ({
  ...emptyOrder('S-1'),
  status: 'delivered',
  consumption: { at: 0, spools: [], missing: [], printers },
})

describe('yazıcı kullanımı', () => {
  it('yalnızca stoğu düşülmüş siparişlerin bu yazıcıya ait yükü sayılır', () => {
    const fail: Failure = { id: 'f', at: 0, printerId: 'p', filamentId: 'pla', grams: 40, hours: 2, reason: 'spaghetti', note: '', orderId: null, consumption: { at: 0, spools: [], missing: [], printers: [{ printerId: 'p', hours: 2, depreciation: 0 }] } }
    const u = printerUsage(printer, [
      withLoad([{ printerId: 'p', hours: 1000, depreciation: 6000 }]),
      withLoad([{ printerId: 'p', hours: 1216.67, depreciation: 7300 }, { printerId: 'other', hours: 70, depreciation: 420 }]),
      { ...emptyOrder('S-3'), status: 'new' }, // stok düşülmemiş
    ], [fail])
    expect(u.completedOrders).toBe(2)
    expect(u.orderHours).toBeCloseTo(2216.67, 6)
    expect(u.failureHours).toBe(2)
    expect(u.totalHours).toBeCloseTo(2418.67, 6)
    expect(u.collected).toBe(13300)
    expect(u.payback).toBeCloseTo(0.38, 10) // "yazıcı kendini %38 ödedi"
    expect(u.hourlyDepreciation).toBe(6)
  })

  it('sipariş yoksa sıfır', () => {
    const u = printerUsage({ ...printer, startHours: 0 }, [])
    expect(u).toMatchObject({ orderHours: 0, totalHours: 0, collected: 0, payback: 0, completedOrders: 0 })
  })
})
