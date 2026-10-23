import type { Product, ProductVariant, SaleSource } from '@/db'
import {
  computeCost,
  computePrices,
  evaluatePrice,
  priceDrift,
  roundPrice,
  scaleManualPrice,
  type CostBreakdown,
  type PriceDrift,
  type PriceResult,
  type PriceSet,
  type PricingSettings,
} from '@/lib/pricing'
import { draftFromProduct, draftToCostInput, resolveFilament, variantDraft, type Catalog } from '@/features/calculator/draft'

export interface ProductEvaluation {
  cost: CostBreakdown
  prices: PriceSet
  /** Kayıtlı satış fiyatının güncel maliyetle metrikleri */
  sale: PriceResult
  /** Güncel ayarlarla aynı kaynaktan hesaplanan yeni satış fiyatı */
  currentSalePrice: number
  drift: PriceDrift
  /** Filament renkleri (kartta swatch) */
  colors: string[]
}

/** Manuel fiyatta maliyet değişimi bu oranın altındaysa fiyat "aynı" kabul edilir */
const MANUAL_COST_EPS = 0.001

export function currentPriceFor(
  source: SaleSource,
  prices: PriceSet,
  savedSale: number,
  savedCost: number,
  currentCost: number,
  settings: PricingSettings,
): number {
  if (source === 'a') return prices.a.rounded
  if (source === 'b') return prices.b.rounded
  if (savedCost > 0 && Math.abs(currentCost - savedCost) / savedCost < MANUAL_COST_EPS) return savedSale
  return roundPrice(scaleManualPrice(savedSale, savedCost, currentCost), settings.rounding)
}

export function evaluateProduct(p: Product, catalog: Catalog, settings: PricingSettings): ProductEvaluation {
  const cost = computeCost(draftToCostInput(draftFromProduct(p), catalog), settings)
  const prices = computePrices(cost, settings)
  const currentSalePrice = currentPriceFor(p.saleSource, prices, p.salePrice, p.snapshot.cost.totalCost, cost.totalCost, settings)
  return {
    cost,
    prices,
    sale: evaluatePrice(p.salePrice, cost, { ...settings, rounding: 'none' }),
    currentSalePrice,
    drift: priceDrift(p.salePrice, currentSalePrice),
    colors: productColors(p, catalog),
  }
}

export function productColors(p: Product, catalog: Catalog): string[] {
  if (p.mode === 'quick') return []
  const lines = [...p.detailed.filaments, ...p.variants.flatMap((v) => v.filaments)]
  const colors = lines.map((f) => resolveFilament(f.filamentId, catalog)?.color).filter((c): c is string => !!c)
  return Array.from(new Set(colors.map((c) => c.toLowerCase()))).slice(0, 6)
}

export interface VariantEvaluation {
  cost: CostBreakdown
  prices: PriceSet
  salePrice: number
  sale: PriceResult
}

export function evaluateVariant(p: Product, v: ProductVariant, catalog: Catalog, settings: PricingSettings): VariantEvaluation {
  const cost = computeCost(draftToCostInput(variantDraft(draftFromProduct(p), v), catalog), settings)
  const prices = computePrices(cost, settings)
  const salePrice = v.priceOverride ?? (p.saleSource === 'b' ? prices.b.rounded : prices.a.rounded)
  return { cost, prices, salePrice, sale: evaluatePrice(salePrice, cost, { ...settings, rounding: 'none' }) }
}

/** Marj rozeti rengi: <%20 kırmızı, %20–40 sarı, >%40 yeşil */
export function marginTone(margin: number | null): 'danger' | 'warning' | 'success' | 'neutral' {
  if (margin === null) return 'neutral'
  if (margin < 20) return 'danger'
  if (margin <= 40) return 'warning'
  return 'success'
}
