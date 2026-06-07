import type { Receipt } from './schema'

/**
 * CSV export.
 *
 * OFX carries one transaction per receipt and has no concept of line items, so
 * itemised detail is lost on that path. CSV fills that gap: it is the universal
 * import format for spreadsheets (Excel, Google Sheets, Numbers) and most
 * bookkeeping tools, and it can carry every line a receipt printed.
 *
 * Two layouts are offered:
 * - "summary": one row per receipt (vendor, date, totals, payment). Good for a
 *   transaction ledger you reconcile against a bank feed.
 * - "items": one row per purchased line, with the parent receipt's vendor and
 *   date repeated on each line. Good for category analysis and VAT work.
 *
 * Output is RFC 4180: CRLF line endings, fields quoted only when they contain a
 * comma, quote, or newline, and embedded quotes doubled. A UTF-8 BOM is
 * prepended by default so Excel opens accented vendor names correctly.
 */

export type CsvLayout = 'summary' | 'items'

export interface CsvOptions {
  /** Row layout. Defaults to "summary" (one row per receipt). */
  layout?: CsvLayout
  /** Prepend a UTF-8 byte-order mark so Excel reads the file as UTF-8. Defaults to true. */
  bom?: boolean
}

const SUMMARY_HEADERS = [
  'vendor',
  'vendor_address',
  'date',
  'time',
  'currency',
  'subtotal',
  'tax',
  'tip',
  'total',
  'payment_method',
  'item_count',
  'notes',
] as const

const ITEM_HEADERS = [
  'vendor',
  'date',
  'currency',
  'item_description',
  'quantity',
  'unit_price',
  'line_total',
] as const

/** Quote a single field per RFC 4180: only when it contains a comma, quote, CR, or LF. */
function field(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const s = typeof value === 'number' ? String(value) : value
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function row(values: (string | number | null | undefined)[]): string {
  return values.map(field).join(',')
}

/** Render receipts as RFC 4180 CSV text in the requested layout. */
export function receiptsToCsv(receipts: Receipt[], options: CsvOptions = {}): string {
  const layout: CsvLayout = options.layout ?? 'summary'
  const withBom = options.bom ?? true

  const lines: string[] = []

  if (layout === 'items') {
    lines.push(row([...ITEM_HEADERS]))
    for (const r of receipts) {
      if (r.items.length === 0) {
        // Keep the receipt visible even when no lines were read, so a reconciler
        // does not silently drop it.
        lines.push(row([r.vendor, r.date, r.currency, '', null, null, r.total]))
        continue
      }
      for (const item of r.items) {
        lines.push(
          row([
            r.vendor,
            r.date,
            r.currency,
            item.description,
            item.quantity,
            item.unit_price,
            item.total,
          ]),
        )
      }
    }
  } else {
    lines.push(row([...SUMMARY_HEADERS]))
    for (const r of receipts) {
      lines.push(
        row([
          r.vendor,
          r.vendor_address,
          r.date,
          r.time,
          r.currency,
          r.subtotal,
          r.tax,
          r.tip,
          r.total,
          r.payment_method,
          r.items.length,
          r.notes,
        ]),
      )
    }
  }

  const body = lines.join('\r\n') + '\r\n'
  return withBom ? '﻿' + body : body
}
