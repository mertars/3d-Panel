import { z } from 'zod'
import { saveProduct, type AppSettings, type Product, type ProductInput, type SaleSource } from '@/db'
import type { PricingSettings } from '@/lib/pricing'
import type { Draft } from './draft'
import type { Calculation } from './useCalculation'

export const productSchema = z.object({
  name: z.string().trim().min(1, 'Ürün adı gerekli').max(120, 'En fazla 120 karakter'),
  link: z.union([z.literal(''), z.url({ message: 'Geçerli bir bağlantı gir (https://…)' })]),
  category: z.string().trim().max(60),
  tags: z.array(z.string().trim().min(1).max(32)).max(20),
})

export type ProductErrors = Partial<Record<keyof z.infer<typeof productSchema>, string>>

export function validateDraft(d: Draft): ProductErrors {
  const res = productSchema.safeParse({ name: d.name, link: d.link.trim(), category: d.category, tags: d.tags })
  if (res.success) return {}
  return Object.fromEntries(res.error.issues.map((i) => [String(i.path[0]), i.message])) as ProductErrors
}

export function pricingSettings(s: AppSettings): PricingSettings {
  const { kwhPrice, laborRate, wastePercent, costMultiplier, hourlyProfit, includeCostInB, rounding, vatEnabled, vatPercent } = s
  return { kwhPrice, laborRate, wastePercent, costMultiplier, hourlyProfit, includeCostInB, rounding, vatEnabled, vatPercent }
}

const n = (x: number | null) => x ?? 0

/** Kaydedilecek satış fiyatı: seçilen kaynak (manuel boşsa A) */
export function saleFromDraft(d: Draft, calc: Calculation): { saleSource: SaleSource; salePrice: number } {
  if (d.saleSource === 'manual' && calc.manual) return { saleSource: 'manual', salePrice: calc.manual.raw }
  if (d.saleSource === 'b') return { saleSource: 'b', salePrice: calc.prices.b.rounded }
  return { saleSource: 'a', salePrice: calc.prices.a.rounded }
}

/** Taslağı, o anki hesap sonuçlarının snapshot'ıyla birlikte ürün olarak kaydeder */
export async function saveDraftAsProduct(d: Draft, calc: Calculation, settings: AppSettings): Promise<Product> {
  const input: ProductInput = {
    id: d.productId,
    name: d.name.trim(),
    category: d.category.trim(),
    tags: d.tags,
    link: d.link.trim(),
    photo: d.photo,
    mode: d.mode,
    quick: { cost: n(d.quickCost), printHours: n(d.quickHours) },
    detailed: {
      filaments: d.filaments
        .filter((f) => f.filamentId)
        .map((f) => ({ filamentId: f.filamentId, gram: n(f.gram), purgeGram: n(f.purgeGram) })),
      printHours: n(d.printHours),
      printerId: d.printerId,
      laborMinutes: n(d.laborMinutes),
      extras: d.extras.filter((e) => e.name.trim() || e.amount).map((e) => ({ name: e.name.trim(), amount: n(e.amount) })),
      packaging: n(d.packaging),
      unitsPerPlate: Math.max(1, Math.floor(n(d.unitsPerPlate)) || 1),
    },
    manualPrice: d.manualPrice,
    ...saleFromDraft(d, calc),
    snapshot: {
      at: Date.now(),
      settings: pricingSettings(settings),
      cost: calc.cost,
      priceA: calc.prices.a,
      priceB: calc.prices.b,
      manual: calc.manual,
    },
  }
  return saveProduct(input)
}
