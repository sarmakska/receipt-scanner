import { z } from 'zod'

/**
 * The Zod contract every scan must satisfy before it reaches the UI, an
 * export, or a database. This schema is also handed to the vision model as a
 * structured-output format, so the model is constrained to emit exactly this
 * shape rather than free-form JSON I then have to repair.
 *
 * Structured outputs reject some JSON Schema constructs (numeric ranges, string
 * length bounds, recursive refs), so I keep every field to plain nullable
 * scalars and a flat item array.
 */
export const lineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().nullable(),
  unit_price: z.number().nullable(),
  total: z.number().nullable(),
})

export const receiptSchema = z.object({
  vendor: z.string().nullable(),
  vendor_address: z.string().nullable(),
  date: z.string().nullable(),
  time: z.string().nullable(),
  currency: z.string().nullable(),
  items: z.array(lineItemSchema),
  subtotal: z.number().nullable(),
  tax: z.number().nullable(),
  tip: z.number().nullable(),
  total: z.number().nullable(),
  payment_method: z.string().nullable(),
  notes: z.string().nullable(),
})

export type LineItem = z.infer<typeof lineItemSchema>
export type Receipt = z.infer<typeof receiptSchema>

/**
 * A receipt enriched with the metadata the pipeline attaches around the scan
 * itself: the storage key of the original image, the content hash used for
 * deduplication, and the id assigned on persistence.
 */
export const storedReceiptSchema = receiptSchema.extend({
  id: z.string(),
  image_key: z.string().nullable(),
  image_sha256: z.string().nullable(),
  scanned_at: z.string(),
})

export type StoredReceipt = z.infer<typeof storedReceiptSchema>

/**
 * Fill in the nullable fields so downstream code can rely on a complete shape.
 * The vision model is asked for every field, but I never assume it returned
 * them; this gives the rest of the app a single, total `Receipt`.
 */
export function normaliseReceipt(input: unknown): Receipt {
  const parsed = receiptSchema.parse(input)
  return {
    ...parsed,
    items: parsed.items ?? [],
  }
}
