import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { receiptsToOfx } from './ofx'
import { receiptSchema, type Receipt } from './schema'

const tesco: Receipt = receiptSchema.parse(
  JSON.parse(readFileSync(fileURLToPath(new URL('../test/fixtures/tesco-receipt.json', import.meta.url)), 'utf8')),
)

const fixedNow = new Date('2026-05-31T09:00:00Z')

describe('receiptsToOfx', () => {
  it('emits a well-formed OFX 1.0.2 header and envelope', () => {
    const ofx = receiptsToOfx([tesco], { now: fixedNow })
    expect(ofx).toContain('OFXHEADER:100')
    expect(ofx).toContain('VERSION:102')
    expect(ofx).toContain('<OFX>')
    expect(ofx).toContain('</OFX>')
    expect(ofx).toContain('<STMTTRN>')
  })

  it('writes the total as a negative debit with the vendor name', () => {
    const ofx = receiptsToOfx([tesco], { now: fixedNow })
    expect(ofx).toContain('<TRNTYPE>DEBIT')
    expect(ofx).toContain('<TRNAMT>-5.35')
    expect(ofx).toContain('<NAME>Tesco')
    expect(ofx).toContain('<DTPOSTED>20260521')
  })

  it('uses the receipt currency by default', () => {
    const ofx = receiptsToOfx([tesco], { now: fixedNow })
    expect(ofx).toContain('<CURDEF>GBP')
  })

  it('escapes SGML entities in vendor names', () => {
    const r: Receipt = { ...tesco, vendor: 'Marks & Spencer' }
    const ofx = receiptsToOfx([r], { now: fixedNow })
    expect(ofx).toContain('Marks &amp; Spencer')
    expect(ofx).not.toContain('Marks & Spencer')
  })

  it('falls back to the generation date when a receipt has no date', () => {
    const r: Receipt = { ...tesco, date: null }
    const ofx = receiptsToOfx([r], { now: fixedNow })
    expect(ofx).toContain('<DTPOSTED>20260531')
  })

  it('sums multiple receipts into the ledger balance', () => {
    const ofx = receiptsToOfx([tesco, { ...tesco, total: 10 }], { now: fixedNow })
    // -5.35 + -10.00 = -15.35
    expect(ofx).toContain('<BALAMT>-15.35')
  })

  it('produces a stable FITID for the same receipt content', () => {
    const a = receiptsToOfx([tesco], { now: fixedNow })
    const b = receiptsToOfx([tesco], { now: fixedNow })
    expect(a).toBe(b)
  })
})
