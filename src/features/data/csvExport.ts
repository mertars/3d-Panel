import { LICENSE_OPTIONS, listChannels, listOrders, listProducts, ORDER_STATUSES, type AppSettings } from '@/db'
import type { Catalog } from '@/features/calculator/draft'
import { totalsFor } from '@/features/orders/items'
import { evaluateProduct } from '@/features/products/evaluate'
import { csvNumber, toCsv } from '@/lib/csv'

const SOURCE = { a: 'Fiyat A', b: 'Fiyat B', manual: 'Manuel' } as const
const date = (ms: number) => new Date(ms).toISOString().slice(0, 10)

export async function productsCsv(catalog: Catalog, settings: AppSettings): Promise<string> {
  const products = await listProducts()
  const rows = products.map((p) => {
    const ev = evaluateProduct(p, catalog, settings)
    return [
      p.name,
      p.category,
      p.tags.join(', '),
      p.salePrice,
      SOURCE[p.saleSource],
      ev.prices.a.rounded,
      ev.prices.b.rounded,
      ev.cost.totalCost,
      ev.sale.metrics.margin === null ? '' : csvNumber(ev.sale.metrics.margin, 1),
      ev.sale.metrics.profitPerHour,
      csvNumber(ev.cost.hoursPerUnit, 2),
      LICENSE_OPTIONS.find((l) => l.value === p.license)?.label ?? '',
      p.variants.length,
      p.archived,
      date(p.updatedAt),
    ]
  })
  return toCsv(
    ['Ad', 'Kategori', 'Etiketler', 'Satış fiyatı', 'Kaynak', 'Fiyat A', 'Fiyat B', 'Maliyet', 'Marj %', 'Saat başı kâr', 'Baskı süresi (saat/adet)', 'Lisans', 'Varyant', 'Arşivde', 'Güncelleme'],
    rows,
  )
}

export async function ordersCsv(settings: AppSettings): Promise<string> {
  const [orders, channels] = await Promise.all([listOrders(), listChannels()])
  const status = Object.fromEntries(ORDER_STATUSES.map((s) => [s.value, s.label]))
  const rows = orders.map((o) => {
    const t = totalsFor(o, channels, settings)
    return [
      o.number,
      date(o.createdAt),
      o.customer,
      o.contact,
      channels.find((c) => c.id === o.channelId)?.name ?? '',
      status[o.status],
      o.items.map((i) => `${i.quantity}× ${i.name}`).join(', '),
      t.units,
      t.revenue,
      t.channelFee,
      t.cost,
      t.sellerShipping,
      t.netProfit,
      csvNumber(t.hours, 2),
      o.paid,
      o.dueDate ?? '',
      o.note,
    ]
  })
  return toCsv(
    ['No', 'Tarih', 'Müşteri', 'İletişim', 'Kanal', 'Durum', 'Ürünler', 'Adet', 'Ciro', 'Kanal kesintisi', 'Maliyet', 'Kargo (satıcı)', 'Net kâr', 'Baskı saati', 'Ödendi', 'Teslim tarihi', 'Not'],
    rows,
  )
}
