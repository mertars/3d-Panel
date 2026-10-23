import type { RoundingMode } from './types'

/** Kayan nokta hatalarına karşı tolerans (ör. 309.0000000001 → 319 olmasın) */
const EPS = 1e-9

/** `step` adımlarla `offset` ile biten, x'ten büyük-eşit en küçük değer */
function ceilToPattern(x: number, step: number, offset: number): number {
  const k = Math.ceil((x - offset) / step - EPS)
  return Math.max(0, k) * step + offset
}

function cents(x: number): number {
  return Math.round(x * 100) / 100
}

/**
 * Fiyatı seçilen moda göre YUKARI yuvarlar.
 * 0 veya negatif fiyatlar olduğu gibi döner (boş form "9 ₺" göstermesin).
 */
export function roundPrice(x: number, mode: RoundingMode): number {
  if (!Number.isFinite(x) || x <= 0) return Number.isFinite(x) ? x : 0
  switch (mode) {
    case 'none':
      return x
    case 'nearest5':
      return cents(Math.ceil(x / 5 - EPS) * 5)
    case 'nearest10':
      return cents(Math.ceil(x / 10 - EPS) * 10)
    case 'end9':
      return cents(ceilToPattern(x, 10, 9))
    case 'end990':
      return cents(ceilToPattern(x, 10, 9.9))
    case 'end49or99':
      return cents(ceilToPattern(x, 50, 49))
  }
}

export const ROUNDING_OPTIONS: { value: RoundingMode; label: string; example: string }[] = [
  { value: 'none', label: 'Yok', example: '302,97 → 302,97' },
  { value: 'nearest5', label: 'En yakın 5', example: '302,97 → 305' },
  { value: 'nearest10', label: 'En yakın 10', example: '302,97 → 310' },
  { value: 'end9', label: '…9 ile bitir', example: '302,97 → 309' },
  { value: 'end990', label: '…9,90 ile bitir', example: '302,97 → 309,90' },
  { value: 'end49or99', label: '…49 / …99 ile bitir', example: '302,97 → 349' },
]
