import type { Order, Printer } from '@/db'
import { paybackRatio, printerHourlyDepreciation } from '@/lib/pricing'

export interface PrinterUsage {
  /** Tamamlanan siparişlerden gelen baskı saati */
  orderHours: number
  /** Önceki kullanım + sipariş saatleri */
  totalHours: number
  /** Tamamlanan siparişlerdeki amortisman payı toplamı (TL) */
  collected: number
  /** collected / yazıcı fiyatı */
  payback: number
  /** Ömrün kullanılan oranı */
  lifeUsed: number
  completedOrders: number
  hourlyDepreciation: number
}

/** Yazıcı istatistikleri — yalnızca "done" durumundaki siparişler sayılır */
export function printerUsage(p: Printer, orders: Order[]): PrinterUsage {
  const done = orders.filter((o) => o.status === 'done' && o.printerId === p.id)
  const orderHours = done.reduce((s, o) => s + (o.printHours || 0), 0)
  const collected = done.reduce((s, o) => s + (o.depreciation || 0), 0)
  const totalHours = (p.startHours || 0) + orderHours
  return {
    orderHours,
    totalHours,
    collected,
    payback: paybackRatio(collected, p.price),
    lifeUsed: p.lifeHours > 0 ? totalHours / p.lifeHours : 0,
    completedOrders: done.length,
    hourlyDepreciation: printerHourlyDepreciation(p.price, p.salvageValue, p.lifeHours),
  }
}
