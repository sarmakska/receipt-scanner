import { describe, it, expect } from 'vitest'
import { receiptSchema } from './schema'
import { save } from './persist'

// Smoke test: the Zod schema is the contract every scan must satisfy
// before it reaches the UI or a database. If this parses, the core path boots.

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

  it('defaults items to an empty array when omitted', () => {
    const parsed = receiptSchema.parse({ vendor: 'Corner Shop' })
    expect(parsed.items).toEqual([])
  })

  it('rejects a non-numeric total', () => {
    expect(() => receiptSchema.parse({ total: 'twelve quid' })).toThrow()
  })
})

describe('persist.save', () => {
  it('returns an id for a parsed receipt', async () => {
    const result = await save(receiptSchema.parse({ vendor: 'Test' }))
    expect(typeof result.id).toBe('string')
    expect(result.id.length).toBeGreaterThan(0)
  })
})
