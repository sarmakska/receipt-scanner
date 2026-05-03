import { z } from 'zod'

export const lineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().nullable().optional(),
  unit_price: z.number().nullable().optional(),
  total: z.number().nullable().optional(),
})

export const receiptSchema = z.object({
  vendor: z.string().nullable().optional(),
  vendor_address: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  time: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  items: z.array(lineItemSchema).default([]),
  subtotal: z.number().nullable().optional(),
  tax: z.number().nullable().optional(),
  tip: z.number().nullable().optional(),
  total: z.number().nullable().optional(),
  payment_method: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export type Receipt = z.infer<typeof receiptSchema>
