import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, EMPTY_PRINT_NOTES, type Product, type Quote } from '@/db'
import { customItem, quoteItemFor, quoteText, quoteTotal, withQuantity } from './actions'

const tiers = DEFAULT_SETTINGS.bulkTiers
const product = {
  id: 'p', name: 'Ejderha anahtarlık', salePrice: 309, variants: [], printNotes: EMPTY_PRINT_NOTES,
} as unknown as Product

describe('teklif kalemleri', () => {
  it('ürün kalemi satış fiyatı ve toplu indirimle', () => {
    expect(quoteItemFor(product, tiers).unitPrice).toBe(309)
    expect(quoteItemFor(product, tiers, 10).unitPrice).toBe(278.1)
    const v = quoteItemFor(product, tiers, 1, { id: 'v', name: 'Büyük', price: 489 })
    expect(v).toMatchObject({ name: 'Ejderha anahtarlık — Büyük', unitPrice: 489, variantId: 'v' })
  })

  it('adet değişince indirim yeniden uygulanır, elle fiyat korunur', () => {
    const item = quoteItemFor(product, tiers)
    expect(withQuantity(item, 25, 309, tiers).unitPrice).toBe(262.65)
    const locked = { ...item, unitPrice: 250, priceLocked: true }
    expect(withQuantity(locked, 25, 309, tiers).unitPrice).toBe(250)
    expect(withQuantity(item, 0, 309, tiers).quantity).toBe(1)
    expect(customItem().priceLocked).toBe(true)
  })

  it('toplam ve düz metin (maliyet/kâr içermez)', () => {
    const q: Quote = {
      id: 'q', number: 'T-2026-001', customer: 'Ayşe', note: 'Kargo dahil değildir.', validUntil: '2026-11-06', leadTime: '3–5 iş günü',
      status: 'draft', createdAt: 0, updatedAt: 0,
      items: [quoteItemFor(product, tiers, 10), { ...customItem(), name: 'Hediye paketi', unitPrice: 25 }],
    }
    expect(quoteTotal(q)).toBeCloseTo(278.1 * 10 + 25, 10)
    const text = quoteText(q, { brandName: 'Katman Atölye', brandContact: '@katman' }, tiers).replace(/ /g, ' ')
    expect(text).toContain('Teklif T-2026-001')
    expect(text).toContain('Sayın Ayşe')
    expect(text).toContain('Ejderha anahtarlık × 10 — 278,10 ₺ (%10 adet indirimi) = 2.781,00 ₺')
    expect(text).toContain('Toplam: 2.806,00 ₺')
    expect(text).toContain('@katman')
    expect(text.toLowerCase()).not.toMatch(/maliyet|kâr|marj/)
  })
})
