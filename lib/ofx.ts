import { createHash } from 'node:crypto'
import type { Receipt } from './schema'

/**
 * OFX 1.0.2 export.
 *
 * Open Financial Exchange is what Xero, QuickBooks, GnuCash, and most desktop
 * accounting tools import. I emit the 1.x SGML dialect rather than OFX 2 XML
 * because the older dialect has the widest importer support. Each scanned
 * receipt becomes one DEBIT bank transaction inside a single statement.
 */

export interface OfxOptions {
  /** Account identifier shown in the statement. Defaults to a generic label. */
  accountId?: string
  /** ISO 4217 currency for the statement. Falls back to the first receipt's currency, then GBP. */
  currency?: string
  /** Generation timestamp, injectable for deterministic output in tests. */
  now?: Date
}

function ofxDate(d: Date): string {
  const p = (n: number, w = 2) => String(n).padStart(w, '0')
  return (
    `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}` +
    `${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`
  )
}

/** OFX posted date is YYYYMMDD; fall back to the generation date when a receipt has no date. */
function postedDate(receipt: Receipt, fallback: Date): string {
  if (receipt.date && /^\d{4}-\d{2}-\d{2}$/.test(receipt.date)) {
    return receipt.date.replace(/-/g, '')
  }
  const p = (n: number) => String(n).padStart(2, '0')
  return `${fallback.getUTCFullYear()}${p(fallback.getUTCMonth() + 1)}${p(fallback.getUTCDate())}`
}

/** Escape the five SGML entities so vendor names with & or < do not corrupt the file. */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** A stable transaction id derived from the receipt content, so re-exports dedupe in the importer. */
function fitId(receipt: Receipt, index: number): string {
  const basis = `${receipt.vendor ?? ''}|${receipt.date ?? ''}|${receipt.total ?? ''}|${index}`
  return createHash('sha256').update(basis).digest('hex').slice(0, 32).toUpperCase()
}

/**
 * Render an array of receipts as a single OFX 1.0.2 bank statement string.
 * Receipts are emitted as negative-amount DEBIT transactions (money out).
 */
export function receiptsToOfx(receipts: Receipt[], options: OfxOptions = {}): string {
  const now = options.now ?? new Date()
  const currency = options.currency || receipts.find((r) => r.currency)?.currency || 'GBP'
  const accountId = options.accountId || 'RECEIPT-SCANNER'
  const dtServer = ofxDate(now)

  const amounts = receipts.map((r) => (typeof r.total === 'number' ? r.total : 0))
  const dated = receipts
    .map((r) => postedDate(r, now))
    .sort()
  const dtStart = dated[0] ?? postedDate({ date: null } as Receipt, now)
  const dtEnd = dated[dated.length - 1] ?? dtStart
  const balance = amounts.reduce((sum, a) => sum - a, 0).toFixed(2)

  const transactions = receipts
    .map((r, i) => {
      const amount = (typeof r.total === 'number' ? -r.total : 0).toFixed(2)
      const name = esc((r.vendor ?? 'Unknown vendor').slice(0, 32))
      const memoParts = [r.payment_method, r.notes].filter(Boolean).join(' / ')
      const memo = memoParts ? `\n<MEMO>${esc(memoParts.slice(0, 255))}` : ''
      return [
        '<STMTTRN>',
        '<TRNTYPE>DEBIT',
        `<DTPOSTED>${postedDate(r, now)}`,
        `<TRNAMT>${amount}`,
        `<FITID>${fitId(r, i)}`,
        `<NAME>${name}${memo}`,
        '</STMTTRN>',
      ].join('\n')
    })
    .join('\n')

  return [
    'OFXHEADER:100',
    'DATA:OFXSGML',
    'VERSION:102',
    'SECURITY:NONE',
    'ENCODING:USASCII',
    'CHARSET:1252',
    'COMPRESSION:NONE',
    'OLDFILEUID:NONE',
    'NEWFILEUID:NONE',
    '',
    '<OFX>',
    '<SIGNONMSGSRSV1>',
    '<SONRS>',
    '<STATUS>',
    '<CODE>0',
    '<SEVERITY>INFO',
    '</STATUS>',
    `<DTSERVER>${dtServer}`,
    '<LANGUAGE>ENG',
    '</SONRS>',
    '</SIGNONMSGSRSV1>',
    '<BANKMSGSRSV1>',
    '<STMTTRNRS>',
    '<TRNUID>1',
    '<STATUS>',
    '<CODE>0',
    '<SEVERITY>INFO',
    '</STATUS>',
    '<STMTRS>',
    `<CURDEF>${esc(currency)}`,
    '<BANKACCTFROM>',
    '<BANKID>000000000',
    `<ACCTID>${esc(accountId)}`,
    '<ACCTTYPE>CHECKING',
    '</BANKACCTFROM>',
    '<BANKTRANLIST>',
    `<DTSTART>${dtStart}`,
    `<DTEND>${dtEnd}`,
    transactions,
    '</BANKTRANLIST>',
    '<LEDGERBAL>',
    `<BALAMT>${balance}`,
    `<DTASOF>${dtServer}`,
    '</LEDGERBAL>',
    '</STMTRS>',
    '</STMTTRNRS>',
    '</BANKMSGSRSV1>',
    '</OFX>',
    '',
  ].join('\n')
}
