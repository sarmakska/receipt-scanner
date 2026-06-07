import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { receiptsToCsv } from './csv'
import { receiptSchema, type Receipt } from './schema'

const tesco: Receipt = receiptSchema.parse(
  JSON.parse(readFileSync(fileURLToPath(new URL('../test/fixtures/tesco-receipt.json', import.meta.url)), 'utf8')),
)

const BOM = '﻿'

describe('receiptsToCsv summary layout', () => {
  it('emits a header row and one row per receipt', () => {
    const csv = receiptsToCsv([tesco], { bom: false })
    const lines = csv.trimEnd().split('\r\n')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toBe(
      'vendor,vendor_address,date,time,currency,subtotal,tax,tip,total,payment_method,item_count,notes',
    )
    expect(lines[1]).toContain('Tesco')
    expect(lines[1]).toContain('5.35')
  })

  it('reports the line-item count and leaves null fields empty', () => {
    // A vendor with no comma so the row splits cleanly on commas for this assertion.
    const csv = receiptsToCsv([{ ...tesco, vendor_address: 'Highbury', tip: null }], { bom: false })
    const dataRow = csv.trimEnd().split('\r\n')[1].split(',')
    // Columns: vendor,vendor_address,date,time,currency,subtotal,tax,tip(7),total,payment_method,item_count(10),notes(11)
    expect(dataRow[7]).toBe('')
    expect(dataRow[10]).toBe('3')
    expect(dataRow[11]).toBe('')
  })

  it('uses CRLF line endings and a trailing newline', () => {
    const csv = receiptsToCsv([tesco], { bom: false })
    expect(csv.endsWith('\r\n')).toBe(true)
    expect(csv).toContain('\r\n')
  })
})

describe('receiptsToCsv items layout', () => {
  it('emits one row per purchased line with the parent vendor repeated', () => {
    const csv = receiptsToCsv([tesco], { layout: 'items', bom: false })
    const lines = csv.trimEnd().split('\r\n')
    // 1 header + 3 items
    expect(lines).toHaveLength(4)
    expect(lines[0]).toBe('vendor,date,currency,item_description,quantity,unit_price,line_total')
    expect(lines[1]).toContain('Semi-Skimmed Milk 2L')
    expect(lines.filter((l) => l.startsWith('Tesco'))).toHaveLength(3)
  })

  it('keeps a receipt with no items as a single fallback row', () => {
    const csv = receiptsToCsv([{ ...tesco, items: [] }], { layout: 'items', bom: false })
    const lines = csv.trimEnd().split('\r\n')
    expect(lines).toHaveLength(2)
    expect(lines[1]).toBe('Tesco,2026-05-21,GBP,,,,5.35')
  })
})

describe('RFC 4180 escaping', () => {
  it('quotes fields that contain a comma and doubles embedded quotes', () => {
    const r: Receipt = { ...tesco, vendor: 'Smith, Jones & Co', notes: 'said "cheap"' }
    const csv = receiptsToCsv([r], { bom: false })
    expect(csv).toContain('"Smith, Jones & Co"')
    expect(csv).toContain('"said ""cheap"""')
  })

  it('quotes fields that contain a newline', () => {
    const r: Receipt = { ...tesco, vendor_address: 'Line 1\nLine 2' }
    const csv = receiptsToCsv([r], { bom: false })
    expect(csv).toContain('"Line 1\nLine 2"')
  })

  it('does not quote plain fields', () => {
    const csv = receiptsToCsv([tesco], { bom: false })
    expect(csv).toContain('Tesco,')
    expect(csv).not.toContain('"Tesco"')
  })
})

describe('Excel BOM', () => {
  it('prepends a UTF-8 BOM by default', () => {
    const csv = receiptsToCsv([tesco])
    expect(csv.startsWith(BOM)).toBe(true)
  })

  it('omits the BOM when disabled', () => {
    const csv = receiptsToCsv([tesco], { bom: false })
    expect(csv.startsWith(BOM)).toBe(false)
  })
})
