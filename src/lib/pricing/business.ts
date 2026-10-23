/**
 * İşletme hesapları için SAF fonksiyonlar: toplu adet fiyatı, eskimiş fiyat tespiti,
 * stok ortalaması, tartarak kalan gram, rakip konumu.
 */

/* ───────────── Toplu adet fiyatı ───────────── */

export interface BulkTier {
  quantity: number
  /** İndirim (%) */
  discountPercent: number
}

export interface BulkRow {
  quantity: number
  discountPercent: number
  unitPrice: number
  total: number
  profitPerUnit: number
  /** Birim fiyat maliyetin altında mı */
  belowCost: boolean
}

const sortTiers = (tiers: BulkTier[]) => [...tiers].filter((t) => t.quantity > 0).sort((a, b) => a.quantity - b.quantity)

export function bulkPriceTable(unitPrice: number, unitCost: number, tiers: BulkTier[]): BulkRow[] {
  return sortTiers(tiers).map((t) => {
    const price = unitPrice * (1 - Math.min(100, Math.max(0, t.discountPercent)) / 100)
    return {
      quantity: t.quantity,
      discountPercent: t.discountPercent,
      unitPrice: price,
      total: price * t.quantity,
      profitPerUnit: price - unitCost,
      belowCost: price < unitCost - 1e-9,
    }
  })
}

/** Adet için geçerli indirim: adedi aşmayan en büyük kademe */
export function bulkDiscountFor(quantity: number, tiers: BulkTier[]): number {
  let pct = 0
  for (const t of sortTiers(tiers)) if (quantity >= t.quantity) pct = t.discountPercent
  return pct
}

export function bulkUnitPrice(unitPrice: number, quantity: number, tiers: BulkTier[]): number {
  return unitPrice * (1 - bulkDiscountFor(quantity, tiers) / 100)
}

/* ───────────── Eskimiş fiyat ───────────── */

export const STALE_THRESHOLD_PERCENT = 5

export interface PriceDrift {
  saved: number
  current: number
  /** (güncel − kayıtlı) / kayıtlı × 100 — pozitifse kayıtlı fiyat geride */
  diffPercent: number
  stale: boolean
}

export function priceDrift(saved: number, current: number, thresholdPercent = STALE_THRESHOLD_PERCENT): PriceDrift {
  if (!(saved > 0)) return { saved, current, diffPercent: current > 0 ? Infinity : 0, stale: current > 0 }
  const diffPercent = ((current - saved) / saved) * 100
  return { saved, current, diffPercent, stale: Math.abs(diffPercent) > thresholdPercent + 1e-9 }
}

/**
 * Manuel fiyatlı ürünlerde "yeni hesaplanan fiyat": aynı markup korunarak
 * maliyet değişimine göre ölçeklenen fiyat.
 */
export function scaleManualPrice(savedPrice: number, savedCost: number, currentCost: number): number {
  if (!(savedCost > 0)) return savedPrice
  return savedPrice * (currentCost / savedCost)
}

/* ───────────── Filament stoğu ───────────── */

export interface SpoolLike {
  spoolPrice: number
  spoolGrams: number
  remainingGrams: number
}

/**
 * Aynı türden makaraların ağırlıklı ortalama gram fiyatı.
 * Kalan grama göre ağırlıklandırılır; hiç kalan yoksa makara gramına göre.
 */
export function weightedAverageGramPrice(spools: SpoolLike[]): number | null {
  const valid = spools.filter((s) => s.spoolGrams > 0)
  if (valid.length === 0) return null
  const byRemaining = valid.reduce((s, x) => s + Math.max(0, x.remainingGrams), 0) > 0
  let weight = 0
  let sum = 0
  for (const s of valid) {
    const w = byRemaining ? Math.max(0, s.remainingGrams) : s.spoolGrams
    sum += (s.spoolPrice / s.spoolGrams) * w
    weight += w
  }
  return weight > 0 ? sum / weight : null
}

/** Tartılan toplam ağırlıktan (makara + filament) kalan filament gramı */
export function remainingFromWeight(totalWeight: number, emptySpoolWeight: number): number {
  return Math.max(0, totalWeight - Math.max(0, emptySpoolWeight))
}

export function isLowStock(remainingGrams: number, thresholdGrams: number): boolean {
  return remainingGrams <= thresholdGrams
}

/* ───────────── Rakip konumu ───────────── */

/** Fiyatımızın rakibe göre farkı (%) — negatifse rakipten ucuzuz */
export function competitorDiffPercent(ours: number, competitor: number): number | null {
  if (!(competitor > 0)) return null
  return ((ours - competitor) / competitor) * 100
}

/* ───────────── Amortisman ilerlemesi ───────────── */

/** Yazıcının kendini ödeme oranı (0–1+): toplanan amortisman payı / yazıcı fiyatı */
export function paybackRatio(collectedDepreciation: number, printerPrice: number): number {
  return printerPrice > 0 ? Math.max(0, collectedDepreciation) / printerPrice : 0
}
