import { createQuote, saveQuote, type AppSettings, type Product, type Quote, type QuoteItem } from '@/db'
import { rowKey } from '@/features/calculator/draft'
import { bulkUnitPrice } from '@/lib/pricing'

export function quoteItemFor(product: Product, settings: Pick<AppSettings, 'bulkTiers'>, quantity = 1, variantId: string | null = null, variantPrice?: number): QuoteItem {
  const variant = variantId ? product.variants.find((v) => v.id === variantId) : undefined
  const base = variantPrice ?? product.salePrice
  return {
    key: rowKey(),
    productId: product.id,
    variantId: variant?.id ?? null,
    name: variant ? `${product.name} — ${variant.name}` : product.name,
    quantity,
    unitPrice: Math.round(bulkUnitPrice(base, quantity, settings.bulkTiers) * 100) / 100,
  }
}

/** Ürünle başlayan yeni taslak teklif */
export async function createQuoteForProduct(product: Product, settings: AppSettings): Promise<Quote> {
  const q = await createQuote(settings)
  const next = { ...q, items: [quoteItemFor(product, settings)] }
  await saveQuote(next)
  return next
}

export const quoteTotal = (q: Pick<Quote, 'items'>) => q.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
