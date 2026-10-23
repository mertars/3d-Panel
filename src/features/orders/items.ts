import type { AppSettings, Channel, Order, OrderItem, Product, ProductVariant } from '@/db'
import { draftFromProduct, rowKey, variantDraft, type Catalog } from '@/features/calculator/draft'
import { channelFeeInput } from '@/features/channels/fees'
import { evaluateProduct, evaluateVariant } from '@/features/products/evaluate'
import { orderTotals, type OrderTotals, type PricingSettings } from '@/lib/pricing'

/**
 * Ürün/varyanttan sipariş kalemi. Maliyet, baskı saati, amortisman ve filament ihtiyacı
 * eklendiği andaki hesaptan kopyalanır (ürün sonradan değişse de sipariş geçmişi bozulmaz).
 */
export function itemFromProduct(
  product: Product,
  variant: ProductVariant | null,
  quantity: number,
  catalog: Catalog,
  settings: PricingSettings,
  unitPrice?: number,
): OrderItem {
  const base = draftFromProduct(product)
  const draft = variant ? variantDraft(base, variant) : base
  const ev = variant ? evaluateVariant(product, variant, catalog, settings) : evaluateProduct(product, catalog, settings)
  const sale = variant ? (ev as ReturnType<typeof evaluateVariant>).salePrice : product.salePrice
  const units = Math.max(1, draft.unitsPerPlate ?? 1)
  const detailed = draft.mode === 'detailed'
  return {
    key: rowKey(),
    productId: product.id,
    variantId: variant?.id ?? null,
    name: variant ? `${product.name} — ${variant.name}` : product.name,
    quantity: Math.max(1, Math.round(quantity)),
    unitPrice: unitPrice ?? sale,
    unitCost: ev.cost.totalCost,
    hoursPerUnit: ev.cost.hoursPerUnit,
    depreciationPerUnit: detailed ? ev.cost.depreciation / units : 0,
    printerId: detailed ? draft.printerId : null,
    filaments: detailed
      ? draft.filaments
          .filter((f) => f.filamentId)
          .map((f) => ({ filamentId: f.filamentId, grams: ((f.gram ?? 0) + (f.purgeGram ?? 0)) / units }))
          .filter((f) => f.grams > 0)
      : [],
  }
}

export function customOrderItem(): OrderItem {
  return { key: rowKey(), productId: null, variantId: null, name: '', quantity: 1, unitPrice: 0, unitCost: 0, hoursPerUnit: 0, depreciationPerUnit: 0, printerId: null, filaments: [] }
}

/** Siparişin finansal özeti (kanal kesintisi siparişin kanalına göre) */
export function totalsFor(o: Order, channels: Channel[], settings: Pick<AppSettings, 'usdRate'>): OrderTotals {
  const ch = channels.find((c) => c.id === o.channelId)
  return orderTotals(o, ch ? channelFeeInput(ch, settings) : null)
}
