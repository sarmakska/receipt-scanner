import { randomUUID } from 'node:crypto'
import type { Receipt, StoredReceipt } from './schema'

export interface PersistInput {
  receipt: Receipt
  imageKey: string | null
  imageSha256: string | null
}

/**
 * Persistence stub. Replace with your real backend.
 *
 * The starter returns the receipt enriched with an id and the storage metadata
 * the pipeline gathered (the R2 key of the original and its content hash), so
 * whatever you wire in receives a complete `StoredReceipt`.
 *
 * Common targets:
 * - Supabase / Postgres: insert into a `receipts` table. Schema in docs/schema.sql.
 * - Xero: https://developer.xero.com/documentation/api/accounting/receipts
 * - QuickBooks: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/purchase
 * - n8n / Zapier: POST the JSON to a webhook, fan out from there.
 */
export async function save(input: PersistInput): Promise<StoredReceipt> {
  // No-op in the starter. Wire your own insert here.
  return {
    ...input.receipt,
    id: randomUUID(),
    image_key: input.imageKey,
    image_sha256: input.imageSha256,
    scanned_at: new Date().toISOString(),
  }
}
