import { describe, expect, it } from 'vitest'
import { csvCell, csvNumber, toCsv } from './csv'

describe('CSV (Excel TR)', () => {
  it('BOM, noktalı virgül, CRLF', () => {
    const csv = toCsv(['Ad', 'Fiyat'], [['Ejderha; büyük', 309.5], ['Şirin "kedi"', 1234.567]])
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toBe('﻿Ad;Fiyat\r\n"Ejderha; büyük";309,50\r\n"Şirin ""kedi""";1234,57\r\n')
  })
  it('hücre biçimleri', () => {
    expect(csvNumber(4.5, 1)).toBe('4,5')
    expect(csvCell(true)).toBe('Evet')
    expect(csvCell(null)).toBe('')
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`)
    expect(csvCell('çok\nsatır')).toBe('"çok\nsatır"')
  })
})
