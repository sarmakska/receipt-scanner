import { Receipt } from './schema'

/**
 * Persistence stub. Replace with your real backend.
 *
 * Common targets:
 * - Supabase / Postgres: insert into a `receipts` table. Schema in docs/schema.sql.
 * - Xero: https://developer.xero.com/documentation/api/accounting/receipts
 * - QuickBooks: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/purchase
 * - n8n / Zapier: POST the JSON to a webhook, fan out from there.
 */
export async function save(_receipt: Receipt): Promise<{ id: string }> {
  // No-op in the starter. Wire your own.
  return { id: crypto.randomUUID() }
}
