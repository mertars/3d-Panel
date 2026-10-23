import { createQuote, saveQuote, type AppSettings, type Product, type Quote, type QuoteItem, type QuoteStatus } from '@/db'
import { rowKey } from '@/features/calculator/draft'
import { formatDate, formatTL } from '@/lib/format'
import { bulkDiscountFor, bulkUnitPrice, type BulkTier } from '@/lib/pricing'

const cents = (x: number) => Math.round(x * 100) / 100

/** Ürün (veya varyant) için teklif kalemi; birim fiyat = satış fiyatı − toplu adet indirimi */
export function quoteItemFor(product: Product, tiers: BulkTier[], quantity = 1, variant?: { id: string; name: string; price: number }): QuoteItem {
  const base = variant?.price ?? product.salePrice
  return {
    key: rowKey(),
    productId: product.id,
    variantId: variant?.id ?? null,
    name: variant ? `${product.name} — ${variant.name}` : product.name,
    quantity,
    unitPrice: cents(bulkUnitPrice(base, quantity, tiers)),
    priceLocked: false,
  }
}

export function customItem(): QuoteItem {
  return { key: rowKey(), productId: null, variantId: null, name: '', quantity: 1, unitPrice: 0, priceLocked: true }
}

/**
 * Adet değişince birim fiyatı toplu indirimle yeniden hesaplar (fiyat elle girilmediyse).
 * basePrice: kalemin indirimsiz fiyatı (ürün/varyant satış fiyatı).
 */
export function withQuantity(item: QuoteItem, quantity: number, basePrice: number | null, tiers: BulkTier[]): QuoteItem {
  const q = Math.max(1, Math.round(quantity))
  if (item.priceLocked || basePrice === null) return { ...item, quantity: q }
  return { ...item, quantity: q, unitPrice: cents(bulkUnitPrice(basePrice, q, tiers)) }
}

/** Ürünle başlayan yeni taslak teklif */
export async function createQuoteForProduct(product: Product, settings: AppSettings): Promise<Quote> {
  const q = await createQuote(settings)
  const next = { ...q, items: [quoteItemFor(product, settings.bulkTiers)] }
  await saveQuote(next)
  return next
}

export const quoteTotal = (q: Pick<Quote, 'items'>) => q.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)

export const STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: 'Taslak',
  sent: 'Gönderildi',
  accepted: 'Kabul',
  rejected: 'Reddedildi',
}

export const STATUS_TONE: Record<QuoteStatus, 'neutral' | 'info' | 'success' | 'danger'> = {
  draft: 'neutral',
  sent: 'info',
  accepted: 'success',
  rejected: 'danger',
}

/** WhatsApp / Instagram için düz metin — maliyet ve kâr ASLA yer almaz */
export function quoteText(q: Quote, brand: { brandName: string; brandContact: string }, tiers: BulkTier[]): string {
  const lines: string[] = []
  lines.push(`*${brand.brandName || 'Teklif'}* — Teklif ${q.number}`)
  if (q.customer.trim()) lines.push(`Sayın ${q.customer.trim()},`)
  lines.push('')
  for (const i of q.items.filter((x) => x.name.trim())) {
    const disc = i.productId && !i.priceLocked ? bulkDiscountFor(i.quantity, tiers) : 0
    lines.push(
      `• ${i.name.trim()} × ${i.quantity} — ${formatTL(i.unitPrice)}${disc ? ` (%${disc} adet indirimi)` : ''} = ${formatTL(i.unitPrice * i.quantity)}`,
    )
  }
  lines.push('')
  lines.push(`Toplam: ${formatTL(quoteTotal(q))}`)
  if (q.leadTime.trim()) lines.push(`Teslim süresi: ${q.leadTime.trim()}`)
  lines.push(`Geçerlilik: ${formatDate(q.validUntil)}`)
  if (q.note.trim()) {
    lines.push('')
    lines.push(q.note.trim())
  }
  if (brand.brandContact.trim()) {
    lines.push('')
    lines.push(brand.brandContact.trim())
  }
  return lines.join('\n')
}
