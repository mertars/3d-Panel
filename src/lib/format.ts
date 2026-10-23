/**
 * Biçimlendiriciler ve akıllı girdi ayrıştırıcıları (tr-TR).
 */

export type CurrencyStyle = 'suffix' | 'prefix' | 'tl'

export interface MoneyFormatOptions {
  style?: CurrencyStyle
  /** true ise tam sayılarda ",00" gösterilmez */
  compactDecimals?: boolean
}

let defaultMoneyOptions: Required<MoneyFormatOptions> = { style: 'suffix', compactDecimals: false }

export function setMoneyFormatDefaults(opts: MoneyFormatOptions) {
  defaultMoneyOptions = { ...defaultMoneyOptions, ...opts }
}

const nf2 = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const nf0to2 = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
const nf1 = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })

/** Gösterim için 2 haneye yuvarlanmış sayı (1.234,56) */
export function formatNumber(value: number, maxDigits = 2): string {
  if (!Number.isFinite(value)) return '—'
  if (maxDigits === 1) return nf1.format(value)
  return nf0to2.format(value)
}

/** 1.234,56 ₺ */
export function formatTL(value: number, opts: MoneyFormatOptions = {}): string {
  if (!Number.isFinite(value)) return '—'
  const { style, compactDecimals } = { ...defaultMoneyOptions, ...opts }
  const isInt = Math.abs(value - Math.round(value)) < 0.005
  const body = compactDecimals && isInt ? nf0to2.format(Math.round(value)) : nf2.format(value)
  if (style === 'prefix') return value < 0 ? `-₺${body.replace('-', '')}` : `₺${body}`
  if (style === 'tl') return `${body} TL`
  return `${body} ₺`
}

export function formatPercent(value: number | null, digits = 1): string {
  if (value === null || !Number.isFinite(value)) return '—'
  return `%${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: digits }).format(value)}`
}

/** 4,5 → "4 sa 30 dk" */
export function formatHours(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return '0 dk'
  const totalMin = Math.round(hours * 60)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m} dk`
  if (m === 0) return `${h} sa`
  return `${h} sa ${m} dk`
}

export function formatGram(gram: number): string {
  if (!Number.isFinite(gram)) return '—'
  if (gram >= 1000) return `${nf0to2.format(gram / 1000)} kg`
  return `${nf1.format(gram)} g`
}

export function formatDate(d: Date | number | string): string {
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d))
}

/* ───────────── Ayrıştırıcılar ───────────── */

/**
 * Hem virgül hem nokta ondalık ayırıcı kabul eder.
 * İkisi birlikte varsa sondaki ondalık, diğeri binlik ayırıcı kabul edilir (1.234,5 / 1,234.5).
 */
export function parseLocaleNumber(input: string): number | null {
  let s = input.trim().replace(/\s+/g, '').replace(/[₺%]/g, '')
  if (!s) return null
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.')
    else s = s.replace(/,/g, '')
  } else if (lastComma !== -1) {
    s = s.replace(',', '.')
  }
  if (!/^-?\d*\.?\d+$|^-?\d+\.$/.test(s)) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

const NUM = '(\\d+(?:[.,]\\d+)?)'

type DurationUnit = 'day' | 'hour' | 'minute' | 'second'

const UNIT_ALIASES: [RegExp, DurationUnit | 's'][] = [
  [/^(gün|gun|g|d|day|days)$/, 'day'],
  [/^(saat|sa|h|hr|hrs|hour|hours)$/, 'hour'],
  [/^(dakika|dak|dk|m|min|mins|minute|minutes)$/, 'minute'],
  [/^(saniye|sn|sec|secs|second|seconds)$/, 'second'],
  // "s" belirsiz: Türkçede "saat", İngilizcede "second"
  [/^s$/, 's'],
]

const UNIT_HOURS: Record<DurationUnit, number> = { day: 24, hour: 1, minute: 1 / 60, second: 1 / 3600 }

/**
 * Akıllı süre girişi → saat (ondalık).
 * 4.5 · 4,5 · 4:30 · 4:30:15 · 4s 30dk · 4 saat 30 dakika · 4h30m · 270dk · 1d 2h · 1h 23m (Bambu Studio)
 * "s" birimi: metinde İngilizce birim (h/m/d/min) varsa saniye, yoksa saat kabul edilir.
 */
export function parseDuration(input: string): number | null {
  const s = input.trim().toLocaleLowerCase('tr-TR')
  if (!s) return null

  const plain = parseLocaleNumber(s)
  if (plain !== null) return plain >= 0 ? plain : null

  const colon = s.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/)
  if (colon) {
    const [, h, m, sec] = colon
    return Number(h) + Number(m) / 60 + (sec ? Number(sec) / 3600 : 0)
  }

  const re = new RegExp(`${NUM}\\s*([a-zçğıöşü]+)`, 'g')
  const parts: { value: number; unit: DurationUnit | 's' }[] = []
  for (const match of s.matchAll(re)) {
    const value = parseLocaleNumber(match[1])
    const alias = UNIT_ALIASES.find(([rx]) => rx.test(match[2]))
    if (value === null || !alias) return null
    parts.push({ value, unit: alias[1] })
  }
  if (parts.length === 0) return null
  // Tanınmayan artık karakter kalmasın (ör. "4 elma")
  const leftover = s.replace(re, '').replace(/[\s,+ve]/g, '')
  if (leftover.length > 0) return null

  const english = /(^|\d|\s)(h|hr|hrs|hour|hours|m|min|mins|minute|minutes|d|day|days)(?=\s|\d|$)/.test(s)
  const ambiguousSecond = parts.some((p) => p.unit === 's') && english
  let hours = 0
  for (const p of parts) {
    const unit: DurationUnit = p.unit === 's' ? (ambiguousSecond ? 'second' : 'hour') : p.unit
    hours += p.value * UNIT_HOURS[unit]
  }
  return hours
}

/**
 * Akıllı gram girişi → gram.
 * 85 · 85g · 85,4 g · 0.085kg · 45.21 g (Bambu Studio) · 1.234,5 g
 */
export function parseGram(input: string): number | null {
  const s = input.trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, '')
  if (!s) return null
  const m = s.match(/^(-?[\d.,]+)(kg|g|gr|gram|mg)?$/)
  if (!m) return null
  const value = parseLocaleNumber(m[1])
  if (value === null || value < 0) return null
  switch (m[2]) {
    case 'kg':
      return value * 1000
    case 'mg':
      return value / 1000
    default:
      return value
  }
}

const TR_ASCII: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', Ç: 'C', Ğ: 'G', İ: 'I', Ö: 'O', Ş: 'S', Ü: 'U' }

/** Dosya adı için güvenli ASCII: Türkçe harfler sadeleşir, diğerleri "-" olur */
export function fileSlug(input: string): string {
  return input
    .replace(/[çğıöşüÇĞİÖŞÜ]/g, (c) => TR_ASCII[c] ?? c)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}
