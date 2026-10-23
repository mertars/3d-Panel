/**
 * Excel (Türkçe) uyumlu CSV: UTF-8 BOM, ";" ayırıcı, ondalık virgül, CRLF satır sonu.
 */

export type CsvCell = string | number | boolean | null | undefined

/** Sayı → "1234,56" (binlik ayırıcı yok; Excel TR ondalık virgül bekler) */
export function csvNumber(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return ''
  return n.toFixed(digits).replace('.', ',')
}

export function csvCell(v: CsvCell): string {
  if (v === null || v === undefined) return ''
  const s = typeof v === 'number' ? csvNumber(v) : typeof v === 'boolean' ? (v ? 'Evet' : 'Hayır') : v
  // Formül enjeksiyonuna karşı (=, +, -, @ ile başlayan metin)
  const safe = typeof v === 'string' && /^[=+\-@]/.test(s) ? `'${s}` : s
  return /[;"\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function toCsv(header: string[], rows: CsvCell[][]): string {
  const lines = [header, ...rows].map((r) => r.map(csvCell).join(';'))
  return '﻿' + lines.join('\r\n') + '\r\n'
}
