# Receipt Scanner

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Anthropic](https://img.shields.io/badge/Anthropic-Claude_Vision-d97757)](https://anthropic.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com)
[![Open Source](https://img.shields.io/badge/Open_Source-%E2%9D%A4-red)](https://github.com/sarmakska/receipt-scanner)

**A working AI receipt OCR starter. Drop a photo of a receipt, get structured JSON.**

Built by [Sarma Linux](https://sarmalinux.com). Built to drop into a real expense workflow.

---

## What this is

Upload a photo of a receipt. The app sends it to a vision-capable language model and extracts structured fields:

- vendor name and address
- transaction date and time
- itemised line items with quantity, description, unit price
- subtotal, tax, tip, total
- currency
- payment method when visible

Returns clean JSON. Renders the result as a table. Save it to a database, drop it into your accounting tool, route it through n8n. The hard bit is solved.

## What it solves

- "I built a small business expense system, but my staff hate typing every receipt in"
- "I want to replace Expensify or Dext for our internal finance flow"
- "I'm prototyping an AI bookkeeping product and need a working OCR baseline"
- "I want to learn how vision models actually work, end to end"

This is the working starter. Fork it, point it at your storage and your accounting backend, ship.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  User uploads JPEG/PNG/HEIC/PDF                             │
│    ↓ resize + JPEG re-encode (sharp) for token efficiency   │
│    ↓ send to Anthropic Claude vision API as base64 image    │
│    ↓ system prompt forces JSON-only response                │
│    ↓ parse + validate against Zod schema                    │
│    ↓ return structured JSON + render table                  │
└─────────────────────────────────────────────────────────────┘
```

Single-process. Server-side image handling. Token-cost aware (downscales images first to keep model bills reasonable).

## Quick start

```bash
git clone https://github.com/sarmakska/receipt-scanner.git
cd receipt-scanner
pnpm install
cp .env.example .env.local
# add ANTHROPIC_API_KEY to .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), upload a receipt, see structured data.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 App Router | Server actions and streaming where useful |
| Language | TypeScript | Schema-driven from start to finish |
| Vision model | Anthropic Claude (`claude-3-5-sonnet-latest` by default) | Strongest receipt OCR I have benchmarked, sensible JSON adherence |
| Image processing | `sharp` | Resize and re-encode before upload, cheaper tokens, faster requests |
| Validation | `zod` | Reject malformed model output instead of crashing downstream |
| Styling | Tailwind CSS | Standard, fast |

## Configuration

| Env var | Required | Default | Purpose |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | yes | — | Vision API access |
| `VISION_MODEL` | no | `claude-3-5-sonnet-latest` | Override the model |
| `MAX_IMAGE_PX` | no | `1568` | Max dimension before resize, balances cost and accuracy |

## Swap to OpenAI Vision (if you prefer)

`lib/vision.ts` is a single function. Replace its body to call `gpt-4o` instead of Claude. Same JSON contract. Same UI. Useful comparison reference left in the file.

## Wire to a real backend

After scanning, the structured JSON is yours. Three common targets:

| Target | What to do |
|---|---|
| Postgres / Supabase | `lib/persist.ts` has a stub `save()` function. Replace with a Supabase insert. Schema in [`docs/schema.sql`](./docs/schema.sql). |
| Xero / QuickBooks | Wrap the JSON in their expense API. Their docs are linked in `lib/persist.ts`. |
| n8n / Zapier | Add a webhook target in `app/api/scan/route.ts`. POST the JSON, fan-out from there. |

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/sarmakska/receipt-scanner)

Set `ANTHROPIC_API_KEY` in the Vercel environment and you are live.

## Limitations (honest list)

- **Anthropic-only by default.** Easy to swap, but the default ships only the Claude path.
- **No multi-page PDFs.** Single image at a time. Multi-page receipts work if rasterised first; do that upstream.
- **No persistence layer included.** Add `pg` / `supabase-js` and a single insert. Stub provided.
- **HEIC handled by `sharp`.** On serverless, make sure your platform ships HEIC support. Vercel does.
- **Token cost.** Each scan is one vision API call. Resizing keeps it under £0.01 in most cases. Mileage varies.

## Roadmap

- [x] Receipt upload and JSON extraction
- [x] Image downscaling for cost control
- [x] Zod-validated output
- [ ] Multi-page PDF receipts
- [ ] Email-to-receipt ingestion (forward a receipt to an inbox, get it scanned)
- [ ] Bulk batch upload
- [ ] HMRC-compatible export

PRs welcome.

## Related work

- [SarmaLink-AI](https://github.com/sarmakska/Sarmalink-ai) — multi-provider AI backend with automatic failover
- [StaffPortal](https://github.com/sarmakska/staff-portal) — open-source staff management (uses this scanner pattern internally)
- [RAG-over-PDF](https://github.com/sarmakska/rag-over-pdf) — sister starter for document QA

## License

MIT. Use it however you want.

Built by [Sarma Linux](https://sarmalinux.com).


---

## More open source by Sarma

Part of a portfolio of twelve production-shaped open-source repositories built and maintained by [Sarma](https://sarmalinux.com).

| Repository | What it is |
|---|---|
| [Sarmalink-ai](https://github.com/sarmakska/Sarmalink-ai) | Multi-provider OpenAI-compatible AI gateway with 14-engine failover and intent-based plugin auto-routing |
| [agent-orchestrator](https://github.com/sarmakska/agent-orchestrator) | Durable multi-agent workflows in TypeScript with deterministic replay and Inspector UI |
| [voice-agent-starter](https://github.com/sarmakska/voice-agent-starter) | Sub-second full-duplex voice agent loop. WebRTC, mediasoup, pluggable STT / LLM / TTS |
| [ai-eval-runner](https://github.com/sarmakska/ai-eval-runner) | Evals as code. Python, DuckDB, FastAPI viewer, regression mode for CI |
| [mcp-server-toolkit](https://github.com/sarmakska/mcp-server-toolkit) | Production Model Context Protocol server starter (Python / FastAPI) |
| [local-llm-router](https://github.com/sarmakska/local-llm-router) | OpenAI-compatible proxy that routes to Ollama or cloud providers based on policy |
| [rag-over-pdf](https://github.com/sarmakska/rag-over-pdf) | Minimal end-to-end RAG starter for PDF corpora |
| [receipt-scanner](https://github.com/sarmakska/receipt-scanner) | Vision OCR for receipts with Zod-validated JSON output |
| [webhook-to-email](https://github.com/sarmakska/webhook-to-email) | Webhook receiver that forwards events to email via Resend |
| [k8s-ops-toolkit](https://github.com/sarmakska/k8s-ops-toolkit) | Helm chart for shipping Next.js to Kubernetes with full observability stack |
| [terraform-stack](https://github.com/sarmakska/terraform-stack) | Vercel + Supabase + Cloudflare + DigitalOcean modules in one Terraform repo |
| [staff-portal](https://github.com/sarmakska/staff-portal) | Open-source HR / ops portal — leave, attendance, expenses, kiosk mode |

Engineering essays at [sarmalinux.com/blog](https://sarmalinux.com/blog) &middot; All projects at [sarmalinux.com/open-source](https://sarmalinux.com/open-source)
