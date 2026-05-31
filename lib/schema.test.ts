import { describe, it, expect } from 'vitest'
import { receiptSchema, normaliseReceipt, storedReceiptSchema } from './schema'

describe('receiptSchema', () => {
  it('parses a representative receipt payload', () => {
    const parsed = receiptSchema.parse({
      vendor: 'Tesco',
      vendor_address: '1 High Street, London',
      date: '2026-05-31',
      time: '14:32',
      currency: 'GBP',
      items: [
        { description: 'Milk 2L', quantity: 1, unit_price: 1.45, total: 1.45 },
        { description: 'Bread', quantity: 2, unit_price: 0.9, total: 1.8 },
      ],
      subtotal: 3.25,
      tax: 0,
      tip: null,
      total: 3.25,
      payment_method: 'Visa',
      notes: null,
    })

    expect(parsed.vendor).toBe('Tesco')
    expect(parsed.items).toHaveLength(2)
    expect(parsed.total).toBe(3.25)
  })

  it('rejects a non-numeric total', () => {
    expect(() =>
      receiptSchema.parse({
        vendor: null,
        vendor_address: null,
        date: null,
        time: null,
        currency: null,
        items: [],
        subtotal: null,
        tax: null,
        tip: null,
        total: 'twelve quid',
        payment_method: null,
        notes: null,
      }),
    ).toThrow()
  })
})

describe('normaliseReceipt', () => {
  it('produces a total receipt shape with an items array', () => {
    const r = normaliseReceipt({
      vendor: 'Corner Shop',
      vendor_address: null,
      date: null,
      time: null,
      currency: null,
      items: [],
      subtotal: null,
      tax: null,
      tip: null,
      total: null,
      payment_method: null,
      notes: null,
    })
    expect(r.vendor).toBe('Corner Shop')
    expect(r.items).toEqual([])
  })
})

describe('storedReceiptSchema', () => {
  it('extends a receipt with id, storage key, hash, and timestamp', () => {
    const stored = storedReceiptSchema.parse({
      vendor: 'Test',
      vendor_address: null,
      date: null,
      time: null,
      currency: null,
      items: [],
      subtotal: null,
      tax: null,
      tip: null,
      total: null,
      payment_method: null,
      notes: null,
      id: 'abc',
      image_key: 'receipts/abc.jpg',
      image_sha256: 'deadbeef',
      scanned_at: '2026-05-31T00:00:00.000Z',
    })
    expect(stored.id).toBe('abc')
    expect(stored.image_key).toBe('receipts/abc.jpg')
  })
})
