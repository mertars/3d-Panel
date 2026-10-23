import type { Failure, Order, Printer } from '@/db'
import { paybackRatio, printerHourlyDepreciation } from '@/lib/pricing'

export interface PrinterUsage {
  /** Stoktan düşülmüş (Baskıda ve sonrası) siparişlerden gelen baskı saati */
  orderHours: number
  /** Başarısız baskı saati */
  failureHours: number
  /** Önceki kullanım + sipariş + fire saatleri */
  totalHours: number
  /** Siparişlerdeki amortisman payı toplamı (TL) */
  collected: number
  /** collected / yazıcı fiyatı */
  payback: number
  /** Ömrün kullanılan oranı */
  lifeUsed: number
  completedOrders: number
  hourlyDepreciation: number
}

/** Yazıcı istatistikleri — siparişlerin stok/saat kaydından (consumption) okunur */
export function printerUsage(p: Printer, orders: Order[], failures: Failure[] = []): PrinterUsage {
  let orderHours = 0
  let collected = 0
  let completedOrders = 0
  for (const o of orders) {
    const load = o.consumption?.printers.find((x) => x.printerId === p.id)
    if (!load) continue
    orderHours += load.hours
    collected += load.depreciation
    completedOrders++
  }
  const failureHours = failures.reduce((s, f) => s + (f.consumption?.printers.find((x) => x.printerId === p.id)?.hours ?? 0), 0)
  const totalHours = (p.startHours || 0) + orderHours + failureHours
  return {
    orderHours,
    failureHours,
    totalHours,
    collected,
    payback: paybackRatio(collected, p.price),
    lifeUsed: p.lifeHours > 0 ? totalHours / p.lifeHours : 0,
    completedOrders,
    hourlyDepreciation: printerHourlyDepreciation(p.price, p.salvageValue, p.lifeHours),
  }
}
