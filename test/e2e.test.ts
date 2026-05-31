import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { scanReceipt, preprocessImage } from '@/lib/vision'
import { receiptSchema, type Receipt } from '@/lib/schema'

const imagePath = fileURLToPath(new URL('./fixtures/receipt.jpg', import.meta.url))
const receiptFixture: Receipt = receiptSchema.parse(
  JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/tesco-receipt.json', import.meta.url)), 'utf8')),
)

/**
 * A stub that mimics the slice of the Anthropic client the vision pipeline
 * uses: `beta.messages.create`. It records the request so we can assert on it,
 * and returns the receipt as a JSON text block, exactly as the real API does
 * when constrained with a structured-output format.
 */
function stubAnthropic(output: unknown) {
  const create = vi.fn(async (params: unknown) => ({
    model: 'claude-opus-4-7',
    content: [{ type: 'text', text: JSON.stringify(output) }],
    usage: { input_tokens: 1200, output_tokens: 250, cache_read_input_tokens: 0 },
    _params: params,
  }))
  return { client: { beta: { messages: { create } } } as unknown as Parameters<typeof scanReceipt>[2], create }
}

describe('preprocessImage', () => {
  it('re-encodes any input to a JPEG buffer', async () => {
    const original = readFileSync(imagePath)
    const out = await preprocessImage(original)
    // JPEG SOI marker
    expect(out[0]).toBe(0xff)
    expect(out[1]).toBe(0xd8)
  })
})

describe('scanReceipt (end-to-end with a stubbed model)', () => {
  beforeEach(() => {
    process.env.VISION_MODEL = 'claude-opus-4-7'
  })

  it('runs a real image through preprocessing and the vision call, returning a validated receipt', async () => {
    const { client, create } = stubAnthropic(receiptFixture)
    const original = readFileSync(imagePath)

    const result = await scanReceipt(original, 'image/jpeg', client)

    expect(create).toHaveBeenCalledOnce()
    expect(result.receipt.vendor).toBe('Tesco')
    expect(result.receipt.items).toHaveLength(3)
    expect(result.receipt.total).toBe(5.35)
    expect(result.model).toBe('claude-opus-4-7')
  })

  it('sends a base64 JPEG image and a cached system prompt to the model', async () => {
    const { client, create } = stubAnthropic(receiptFixture)
    const original = readFileSync(imagePath)

    await scanReceipt(original, 'image/jpeg', client)

    const params = create.mock.calls[0][0] as {
      model: string
      betas: string[]
      system: { text: string; cache_control?: unknown }[]
      messages: { content: { type: string; source?: { media_type: string; data: string } }[] }[]
      output_format: unknown
    }
    expect(params.model).toBe('claude-opus-4-7')
    expect(params.betas).toContain('structured-outputs-2025-09-17')
    expect(params.system[0].cache_control).toEqual({ type: 'ephemeral' })
    const imageBlock = params.messages[0].content.find((c) => c.type === 'image')
    expect(imageBlock?.source?.media_type).toBe('image/jpeg')
    expect(typeof imageBlock?.source?.data).toBe('string')
    expect(params.output_format).toBeDefined()
  })

  it('validates the model output through Zod, rejecting malformed shapes', async () => {
    const bad = { vendor: 'X', total: 'not a number' }
    const { client } = stubAnthropic(bad)
    const original = readFileSync(imagePath)
    await expect(scanReceipt(original, 'image/jpeg', client)).rejects.toThrow()
  })
})

describe('processBatch (end-to-end, vision mocked)', () => {
  it('scans several files independently and isolates per-file failures', async () => {
    vi.resetModules()
    vi.doMock('@/lib/vision', () => ({
      scanReceipt: vi.fn(async (buf: Buffer) => {
        // The second file is empty: simulate a model/scan failure for it.
        if (buf.length === 0) throw new Error('empty image')
        return { receipt: receiptFixture, model: 'claude-opus-4-7', usage: {} }
      }),
    }))
    vi.doMock('@/lib/storage', () => ({
      store: vi.fn(async () => ({ key: null, sha256: 'hash' })),
      isStorageConfigured: () => false,
    }))

    const { processBatch } = await import('@/lib/pipeline')
    const original = readFileSync(imagePath)

    const results = await processBatch([
      { filename: 'a.jpg', buffer: original, contentType: 'image/jpeg' },
      { filename: 'b.jpg', buffer: Buffer.alloc(0), contentType: 'image/jpeg' },
      { filename: 'c.jpg', buffer: original, contentType: 'image/jpeg' },
    ])

    expect(results).toHaveLength(3)
    expect(results[0].ok).toBe(true)
    expect(results[0].receipt?.vendor).toBe('Tesco')
    expect(results[1].ok).toBe(false)
    expect(results[1].error).toContain('empty image')
    expect(results[2].ok).toBe(true)

    vi.doUnmock('@/lib/vision')
    vi.doUnmock('@/lib/storage')
  })
})
