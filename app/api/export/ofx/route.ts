import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { receiptSchema } from '@/lib/schema'
import { receiptsToOfx } from '@/lib/ofx'

export const runtime = 'nodejs'

const bodySchema = z.object({
  receipts: z.array(receiptSchema).min(1),
  accountId: z.string().optional(),
  currency: z.string().optional(),
})

/**
 * Export a set of scanned receipts as an OFX 1.0.2 bank statement. POST the
 * validated receipts back and receive a downloadable .ofx file that Xero,
 * QuickBooks, GnuCash, and most desktop accounting tools import directly.
 */
export async function POST(req: NextRequest) {
  let parsed
  try {
    parsed = bodySchema.parse(await req.json())
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Invalid request body'
    return NextResponse.json({ ok: false, error: message }, { status: 400 })
  }

  const ofx = receiptsToOfx(parsed.receipts, {
    accountId: parsed.accountId,
    currency: parsed.currency,
  })

  return new NextResponse(ofx, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-ofx; charset=utf-8',
      'Content-Disposition': 'attachment; filename="receipts.ofx"',
    },
  })
}
