import Anthropic from '@anthropic-ai/sdk'
import sharp from 'sharp'
import { normaliseReceipt, type Receipt } from './schema'

const VISION_MODEL = process.env.VISION_MODEL || 'claude-opus-4-7'
const MAX_PX = parseInt(process.env.MAX_IMAGE_PX || '2576', 10)

const SYSTEM_PROMPT = `You are a receipt OCR system. You are shown a photograph or scan of a single receipt and you extract its contents.

Rules:
- Use null for any field that is not visible. Never guess or invent a value.
- Strip currency symbols from numeric fields. Put the ISO 4217 code (GBP, EUR, USD, INR, ...) in the currency field; if only a symbol is visible, map it (£ -> GBP, € -> EUR, $ -> USD, ₹ -> INR).
- Dates are ISO 8601 (YYYY-MM-DD). Convert DD/MM/YYYY and MM/DD/YYYY using the vendor locale where it is unambiguous, otherwise leave the date null.
- Times are 24-hour HH:MM.
- items: one entry per purchased line, even abbreviated ones. Keep the printed description verbatim.
- Read faded thermal print and small tax-breakdown print as carefully as you can.`

export interface ScanResult {
  receipt: Receipt
  model: string
  usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens: number }
}

/**
 * The structured-output schema handed to the model. It mirrors `receiptSchema`
 * in lib/schema.ts by hand rather than deriving it, because the SDK's Zod->JSON
 * Schema helper requires Zod 4 and the project pins Zod 3. Keep the two in sync:
 * any field added here must be added there and vice versa. The model is
 * constrained to emit exactly this shape, so the response is already valid JSON.
 */
const nullableNumber = { type: ['number', 'null'] }
const nullableString = { type: ['string', 'null'] }

const RECEIPT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    vendor: nullableString,
    vendor_address: nullableString,
    date: nullableString,
    time: nullableString,
    currency: nullableString,
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          description: { type: 'string' },
          quantity: nullableNumber,
          unit_price: nullableNumber,
          total: nullableNumber,
        },
        required: ['description', 'quantity', 'unit_price', 'total'],
      },
    },
    subtotal: nullableNumber,
    tax: nullableNumber,
    tip: nullableNumber,
    total: nullableNumber,
    payment_method: nullableString,
    notes: nullableString,
  },
  required: [
    'vendor',
    'vendor_address',
    'date',
    'time',
    'currency',
    'items',
    'subtotal',
    'tax',
    'tip',
    'total',
    'payment_method',
    'notes',
  ],
} as const

let cachedClient: Anthropic | null = null

function client(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set')
  }
  if (!cachedClient) {
    cachedClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return cachedClient
}

/**
 * Downscale and re-encode an image to keep the vision request cheap and fast.
 * Opus 4.7 reads up to 2576px on the long edge at full fidelity, so I default
 * there rather than the old 1568px cap. The result is always JPEG.
 */
export async function preprocessImage(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .resize(MAX_PX, MAX_PX, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer()
}

/**
 * The single vision call. One image in, one validated `Receipt` out.
 *
 * The model is constrained with the Zod schema via structured outputs, so the
 * response is already valid JSON in the exact shape; I parse it through Zod
 * again as a belt-and-braces boundary. The system prompt carries a cache
 * breakpoint because it is identical on every scan.
 *
 * Pass a client to inject a stub in tests; production omits it.
 */
export async function scanReceipt(
  buffer: Buffer,
  _mediaType?: string,
  anthropic: Anthropic = client(),
): Promise<ScanResult> {
  const jpeg = await preprocessImage(buffer)
  const imageBase64 = jpeg.toString('base64')

  const message = await anthropic.beta.messages.create({
    model: VISION_MODEL,
    max_tokens: 4096,
    betas: ['structured-outputs-2025-09-17'],
    system: [
      { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
    ],
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 },
          },
          { type: 'text', text: 'Extract this receipt.' },
        ],
      },
    ],
    output_format: { type: 'json_schema', schema: RECEIPT_JSON_SCHEMA },
  })

  const text = message.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()

  const receipt = normaliseReceipt(JSON.parse(text))

  return {
    receipt,
    model: message.model,
    usage: {
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
      cache_read_input_tokens: message.usage.cache_read_input_tokens ?? 0,
    },
  }
}
