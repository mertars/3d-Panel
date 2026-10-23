import { describe, expect, it } from 'vitest'
import type { Order, Printer } from '@/db'
import { printerUsage } from './usage'

const printer: Printer = {
  id: 'p', name: 'P1S', preset: 'p1s', price: 35000, salvageValue: 5000, lifeHours: 5000, watts: 120, maintenancePerHour: 1.5,
  isDefault: true, startHours: 200, maintenanceLog: [], createdAt: 0,
}
const order = (o: Partial<Order>): Order => ({
  id: Math.random().toString(), productId: null, channelId: null, quoteId: null, customer: '', quantity: 1, unitPrice: 0,
  printerId: 'p', printHours: 0, depreciation: 0, status: 'done', createdAt: 0, ...o,
})

describe('yazıcı kullanımı', () => {
  it('yalnızca bu yazıcının tamamlanan siparişleri sayılır', () => {
    const u = printerUsage(printer, [
      order({ printHours: 1000, depreciation: 6000 }),
      order({ printHours: 1216.67, depreciation: 7300 }),
      order({ printHours: 50, depreciation: 300, status: 'printing' }),
      order({ printHours: 70, depreciation: 420, printerId: 'other' }),
    ])
    expect(u.completedOrders).toBe(2)
    expect(u.orderHours).toBeCloseTo(2216.67, 6)
    expect(u.totalHours).toBeCloseTo(2416.67, 6)
    expect(u.collected).toBe(13300)
    expect(u.payback).toBeCloseTo(0.38, 10) // "yazıcı kendini %38 ödedi"
    expect(u.lifeUsed).toBeCloseTo(2416.67 / 5000, 6)
    expect(u.hourlyDepreciation).toBe(6)
  })

  it('sipariş yoksa sıfır', () => {
    const u = printerUsage({ ...printer, startHours: 0 }, [])
    expect(u).toMatchObject({ orderHours: 0, totalHours: 0, collected: 0, payback: 0, completedOrders: 0 })
  })
})
