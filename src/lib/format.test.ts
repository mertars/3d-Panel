import { describe, expect, it } from 'vitest'
import { fileSlug, formatHours, formatNumber, formatTL, parseDuration, parseGram, parseLocaleNumber } from './format'

describe('parseDuration', () => {
  it.each([
    ['4.5', 4.5],
    ['4,5', 4.5],
    ['4:30', 4.5],
    ['4s 30dk', 4.5],
    ['4 saat 30 dakika', 4.5],
    ['4h30m', 4.5],
    ['270dk', 4.5],
    ['1d 2h', 26],
    ['1h 23m', 1 + 23 / 60],
    ['23m 45s', 23 / 60 + 45 / 3600],
    ['1d 2h 3m', 26 + 3 / 60],
    ['4s', 4],
    ['4 sa 30 dk', 4.5],
    ['1,5 saat', 1.5],
    ['2 gün', 48],
    ['90 min', 1.5],
    ['4:30:00', 4.5],
    ['  4H 30M  ', 4.5],
    ['4 saat ve 30 dakika', 4.5],
    ['0', 0],
  ])('%s → %d saat', (input, expected) => {
    expect(parseDuration(input)).toBeCloseTo(expected, 10)
  })

  it.each(['', 'abc', '4 elma', '-2', '4::30'])('geçersiz: "%s" → null', (input) => {
    expect(parseDuration(input)).toBeNull()
  })
})

describe('parseGram', () => {
  it.each([
    ['85', 85],
    ['85g', 85],
    ['85,4 g', 85.4],
    ['0.085kg', 85],
    ['45.21 g', 45.21],
    ['1.234,5 g', 1234.5],
    ['1 kg', 1000],
  ])('%s → %d g', (input, expected) => {
    expect(parseGram(input)).toBeCloseTo(expected, 10)
  })

  it.each(['', 'g', 'on gram', '-5'])('geçersiz: "%s" → null', (input) => {
    expect(parseGram(input)).toBeNull()
  })
})

describe('parseLocaleNumber', () => {
  it.each([
    ['1.234,56', 1234.56],
    ['1,234.56', 1234.56],
    ['12,5', 12.5],
    ['12.5', 12.5],
    ['%5,99', 5.99],
  ])('%s → %d', (input, expected) => {
    expect(parseLocaleNumber(input)).toBeCloseTo(expected, 10)
  })
})

describe('format', () => {
  it('TL formatı 1.234,56 ₺', () => {
    expect(formatTL(1234.56).replace(/\s/g, ' ')).toBe('1.234,56 ₺')
    expect(formatTL(309).replace(/\s/g, ' ')).toBe('309,00 ₺')
  })
  it('sayı hane sayısı', () => {
    expect(formatNumber(446.0234, 0)).toBe('446')
    expect(formatNumber(1234.567, 1)).toBe('1.234,6')
    expect(formatNumber(1234.567)).toBe('1.234,57')
    expect(formatNumber(0.12345, 3)).toBe('0,123')
  })
  it('saat formatı', () => {
    expect(formatHours(4.5)).toBe('4 sa 30 dk')
    expect(formatHours(0.25)).toBe('15 dk')
  })
})

describe('fileSlug', () => {
  it('Türkçe karakterleri sadeleştirir', () => {
    expect(fileSlug('T-2026-001-Ayşe Yılmaz')).toBe('T-2026-001-Ayse-Yilmaz')
    expect(fileSlug('ÇĞİÖŞÜ çğıöşü / ? *')).toBe('CGIOSU-cgiosu')
    expect(fileSlug('***')).toBe('')
  })
})
