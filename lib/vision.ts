import Anthropic from '@anthropic-ai/sdk'
import sharp from 'sharp'
import { receiptSchema, Receipt } from './schema'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const VISION_MODEL = process.env.VISION_MODEL || 'claude-3-5-sonnet-latest'
const MAX_PX = parseInt(process.env.MAX_IMAGE_PX || '1568', 10)

const SYSTEM_PROMPT = `You are a receipt OCR system. Look at the image of the receipt and extract structured data.

Respond with ONLY a single JSON object, no prose, no markdown fences. Use this exact schema:

{
  "vendor": string | null,
  "vendor_address": string | null,
  "date": "YYYY-MM-DD" | null,
  "time": "HH:MM" | null,
  "currency": "GBP" | "EUR" | "USD" | "INR" | string | null,
  "items": [{ "description": string, "quantity": number | null, "unit_price": number | null, "total": number | null }],
  "subtotal": number | null,
  "tax": number | null,
  "tip": number | null,
  "total": number | null,
  "payment_method": string | null,
  "notes": string | null
}

Rules:
- Use null when a field is not visible. Do not guess.
- Strip currency symbols from numeric fields. The currency goes in the currency field.
- Date format: YYYY-MM-DD. If the receipt shows DD/MM/YYYY, convert.
- Items: every line that represents a purchased item, even abbreviated.
- Output JSON only. No backticks, no commentary.`

export async function scanReceipt(buffer: Buffer, mediaType: string): Promise<Receipt> {
  const resized = await sharp(buffer)
    .rotate()
    .resize(MAX_PX, MAX_PX, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer()

  const imageBase64 = resized.toString('base64')

  const message = await anthropic.messages.create({
    model: VISION_MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 },
          },
          { type: 'text', text: 'Extract the receipt data as JSON.' },
        ],
      },
    ],
  })

  const text = message.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as any).text)
    .join('')
    .trim()

  const cleaned = text.replace(/^```(?:json)?/, '').replace(/```$/, '').trim()
  const json = JSON.parse(cleaned)
  return receiptSchema.parse(json)
}

/* === OpenAI gpt-4o swap reference (if you prefer GPT-4 vision) ===

import OpenAI from 'openai'
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function scanReceiptOpenAI(buffer: Buffer): Promise<Receipt> {
  const resized = ... (same sharp call)
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: [
        { type: 'text', text: 'Extract the receipt data as JSON.' },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${resized.toString('base64')}` } },
      ]},
    ],
  })
  return receiptSchema.parse(JSON.parse(completion.choices[0].message.content!))
}
*/
