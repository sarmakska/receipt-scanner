import { NextRequest, NextResponse } from 'next/server'
import { processReceipt } from '@/lib/pipeline'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: 'No file uploaded' }, { status: 400 })
    }
    const buf = Buffer.from(await file.arrayBuffer())
    const receipt = await processReceipt(buf, file.type || 'image/jpeg')
    return NextResponse.json({ ok: true, id: receipt.id, receipt })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Scan failed'
    console.error('Scan error:', e)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
