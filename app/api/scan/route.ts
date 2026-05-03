import { NextRequest, NextResponse } from 'next/server'
import { scanReceipt } from '@/lib/vision'
import { save } from '@/lib/persist'

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
    const receipt = await scanReceipt(buf, file.type || 'image/jpeg')
    const persisted = await save(receipt)
    return NextResponse.json({ ok: true, id: persisted.id, receipt })
  } catch (e: any) {
    console.error('Scan error:', e)
    return NextResponse.json({ ok: false, error: e?.message || 'Scan failed' }, { status: 500 })
  }
}
