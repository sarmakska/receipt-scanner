'use client'

import { useState, useRef, FormEvent } from 'react'
import type { Receipt } from '@/lib/schema'

function fmt(n?: number | null, ccy?: string | null) {
  if (n == null) return '—'
  const symbol = ccy === 'GBP' ? '£' : ccy === 'EUR' ? '€' : ccy === 'USD' ? '$' : ccy === 'INR' ? '₹' : ''
  return `${symbol}${n.toFixed(2)}`
}

export default function Home() {
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setLoading(true)
    setErr('')
    setReceipt(null)
    setPreview(URL.createObjectURL(file))
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/scan', { method: 'POST', body: fd })
    const data = await res.json()
    setLoading(false)
    if (data.ok) setReceipt(data.receipt)
    else setErr(data.error || 'Failed')
  }

  return (
    <main className="min-h-screen px-4 py-12 max-w-5xl mx-auto">
      <header className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Receipt Scanner</h1>
        <p className="text-zinc-400 text-sm">
          Drop a photo of a receipt. Get structured JSON. MIT-licensed starter.
        </p>
      </header>

      <form onSubmit={onSubmit} className="border border-white/10 rounded-2xl p-6 bg-white/[0.02] mb-8">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            required
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) setPreview(URL.createObjectURL(f))
            }}
            className="flex-1 text-sm text-zinc-300 file:mr-3 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:bg-violet-500 file:text-white file:font-medium hover:file:bg-violet-400 cursor-pointer"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-lg bg-violet-500 hover:bg-violet-400 disabled:opacity-50 text-white font-medium text-sm transition-colors"
          >
            {loading ? 'Scanning…' : 'Scan receipt'}
          </button>
        </div>
      </form>

      {err && <div className="border border-red-500/30 bg-red-500/10 text-red-300 rounded-lg px-4 py-3 mb-8 text-sm">{err}</div>}

      <div className="grid lg:grid-cols-2 gap-6">
        {preview && (
          <div className="border border-white/10 rounded-2xl p-3 bg-white/[0.02]">
            <p className="text-xs uppercase tracking-wider text-zinc-500 mb-3 px-2">Image</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Receipt" className="rounded-lg max-h-[600px] object-contain w-full" />
          </div>
        )}

        {receipt && (
          <div className="border border-white/10 rounded-2xl p-6 bg-white/[0.02]">
            <p className="text-xs uppercase tracking-wider text-zinc-500 mb-4">Extracted</p>
            <h2 className="text-xl font-semibold mb-1">{receipt.vendor || 'Unknown vendor'}</h2>
            <p className="text-zinc-400 text-sm mb-1">{receipt.vendor_address || ''}</p>
            <p className="text-zinc-500 text-xs mb-6">{receipt.date} {receipt.time}</p>

            <table className="w-full text-sm mb-6">
              <thead className="text-zinc-500 text-xs uppercase tracking-wider">
                <tr><th className="text-left py-2">Item</th><th className="text-right">Qty</th><th className="text-right">Unit</th><th className="text-right">Total</th></tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {receipt.items.map((it, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-3">{it.description}</td>
                    <td className="text-right text-zinc-400">{it.quantity ?? '—'}</td>
                    <td className="text-right text-zinc-400">{fmt(it.unit_price, receipt.currency)}</td>
                    <td className="text-right">{fmt(it.total, receipt.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="space-y-1 text-sm border-t border-white/10 pt-4">
              <Row label="Subtotal" value={fmt(receipt.subtotal, receipt.currency)} />
              <Row label="Tax" value={fmt(receipt.tax, receipt.currency)} />
              {receipt.tip != null && <Row label="Tip" value={fmt(receipt.tip, receipt.currency)} />}
              <Row label="Total" value={fmt(receipt.total, receipt.currency)} bold />
              {receipt.payment_method && <Row label="Payment" value={receipt.payment_method} />}
            </div>

            <details className="mt-6">
              <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-300">View raw JSON</summary>
              <pre className="mt-3 text-xs text-zinc-400 overflow-x-auto bg-black/40 rounded-lg p-3">
{JSON.stringify(receipt, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>

      <footer className="mt-20 text-xs text-zinc-600 text-center">
        Open source · MIT · <a href="https://github.com/sarmakska/receipt-scanner" className="hover:text-zinc-400">GitHub</a> · built by <a href="https://sarmalinux.com" className="hover:text-zinc-400">Sarma Linux</a>
      </footer>
    </main>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-semibold text-base' : 'text-zinc-400'}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
