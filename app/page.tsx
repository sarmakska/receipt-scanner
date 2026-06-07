'use client'

import { useState, useRef, FormEvent } from 'react'
import type { StoredReceipt } from '@/lib/schema'

function fmt(n?: number | null, ccy?: string | null) {
  if (n == null) return '—'
  const symbol = ccy === 'GBP' ? '£' : ccy === 'EUR' ? '€' : ccy === 'USD' ? '$' : ccy === 'INR' ? '₹' : ''
  return `${symbol}${n.toFixed(2)}`
}

interface BatchItemResult {
  filename: string
  ok: boolean
  receipt?: StoredReceipt
  error?: string
}

export default function Home() {
  const [receipts, setReceipts] = useState<StoredReceipt[]>([])
  const [failures, setFailures] = useState<{ filename: string; error: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const files = fileRef.current?.files
    if (!files || files.length === 0) return
    setLoading(true)
    setErr('')
    setReceipts([])
    setFailures([])

    const fd = new FormData()
    for (const file of Array.from(files)) fd.append('file', file)

    try {
      // One file uses the single endpoint; many files use the batch endpoint.
      if (files.length === 1) {
        const res = await fetch('/api/scan', { method: 'POST', body: fd })
        const data = await res.json()
        if (data.ok) setReceipts([data.receipt])
        else setErr(data.error || 'Scan failed')
      } else {
        const res = await fetch('/api/scan/batch', { method: 'POST', body: fd })
        const data = await res.json()
        if (data.ok) {
          setReceipts(
            (data.results as BatchItemResult[]).filter((r) => r.ok && r.receipt).map((r) => r.receipt!),
          )
          setFailures(
            (data.results as BatchItemResult[])
              .filter((r) => !r.ok)
              .map((r) => ({ filename: r.filename, error: r.error || 'Scan failed' })),
          )
        } else {
          setErr(data.error || 'Batch scan failed')
        }
      }
    } catch {
      setErr('Network error')
    } finally {
      setLoading(false)
    }
  }

  async function download(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }

  async function exportOfx() {
    const res = await fetch('/api/export/ofx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receipts }),
    })
    if (!res.ok) {
      setErr('OFX export failed')
      return
    }
    await download(await res.blob(), 'receipts.ofx')
  }

  async function exportCsv(layout: 'summary' | 'items') {
    const res = await fetch('/api/export/csv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receipts, layout }),
    })
    if (!res.ok) {
      setErr('CSV export failed')
      return
    }
    await download(await res.blob(), layout === 'items' ? 'receipt-items.csv' : 'receipts.csv')
  }

  return (
    <main className="min-h-screen px-4 py-12 max-w-5xl mx-auto">
      <header className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Receipt Scanner</h1>
        <p className="text-zinc-400 text-sm">
          Drop one receipt or fifty. Get structured JSON, export to CSV or OFX. MIT-licensed starter.
        </p>
      </header>

      <form onSubmit={onSubmit} className="border border-white/10 rounded-2xl p-6 bg-white/[0.02] mb-8">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            required
            className="flex-1 text-sm text-zinc-300 file:mr-3 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:bg-violet-500 file:text-white file:font-medium hover:file:bg-violet-400 cursor-pointer"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-lg bg-violet-500 hover:bg-violet-400 disabled:opacity-50 text-white font-medium text-sm transition-colors"
          >
            {loading ? 'Scanning…' : 'Scan receipts'}
          </button>
        </div>
        <p className="text-xs text-zinc-500 mt-3">Select multiple files for a batch. Up to 50 per upload.</p>
      </form>

      {err && <div className="border border-red-500/30 bg-red-500/10 text-red-300 rounded-lg px-4 py-3 mb-8 text-sm">{err}</div>}

      {failures.length > 0 && (
        <div className="border border-amber-500/30 bg-amber-500/10 text-amber-300 rounded-lg px-4 py-3 mb-8 text-sm">
          <p className="font-medium mb-1">{failures.length} file(s) could not be scanned:</p>
          <ul className="list-disc list-inside text-amber-200/80">
            {failures.map((f, i) => (
              <li key={i}>{f.filename}: {f.error}</li>
            ))}
          </ul>
        </div>
      )}

      {receipts.length > 0 && (
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-zinc-400">{receipts.length} receipt(s) scanned</p>
          <div className="flex gap-2">
            <button
              onClick={() => exportCsv('summary')}
              className="px-4 py-2 rounded-lg border border-white/15 hover:border-white/30 text-zinc-200 text-sm font-medium transition-colors"
            >
              Export CSV
            </button>
            <button
              onClick={() => exportCsv('items')}
              className="px-4 py-2 rounded-lg border border-white/15 hover:border-white/30 text-zinc-200 text-sm font-medium transition-colors"
            >
              Export items CSV
            </button>
            <button
              onClick={exportOfx}
              className="px-4 py-2 rounded-lg border border-white/15 hover:border-white/30 text-zinc-200 text-sm font-medium transition-colors"
            >
              Export OFX
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-6">
        {receipts.map((receipt, idx) => (
          <div key={receipt.id ?? idx} className="border border-white/10 rounded-2xl p-6 bg-white/[0.02]">
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
        ))}
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
