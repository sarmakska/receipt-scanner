# Roadmap

Honest list. What is shipped, what is planned, what is not happening here.

## Shipped

- [x] Single-image receipt scanning
- [x] Claude Opus 4.7 vision with high-resolution input
- [x] Structured output constrained to the receipt schema, validated by Zod
- [x] Prompt caching on the system prompt
- [x] Sharp-based resize, re-encode, and auto-rotate
- [x] Structured table UI
- [x] Multi-receipt batch upload with per-file results
- [x] OFX 1.0.2 export for accounting tools
- [x] Cloudflare R2 storage for original images, content-addressed by hash
- [x] No-op persist stub returning a complete `StoredReceipt`
- [x] End-to-end tests with fixtures
- [x] Vercel one-click deploy
- [x] MIT licence

## Next up (planned)

- [ ] **Multi-page PDF support** rasterise upstream, scan each page, merge totals
- [ ] **Email-to-receipt ingestion** forward a receipt photo to a dedicated inbox, get it scanned and stored
- [ ] **CSV and QuickBooks-native export** alongside OFX
- [ ] **Double-pass strategy** a cheaper model first, the expensive model only on low confidence
- [ ] **Duplicate detection UI** the SHA-256 hash is already stored; surface duplicates in the interface

## Wishlist (lower priority)

- [ ] HMRC-compatible export profile
- [ ] Direct Xero / QuickBooks push
- [ ] Auto-deskew via affine transform
- [ ] Confidence scoring per field
- [ ] Custom prompt templates per business type (restaurant, retail, hotel)
- [ ] Search and filter UI for stored receipts
- [ ] Webhook trigger on each scan

## Dependency upgrades (tracked as issues)

Major upgrades are deliberately deferred and tracked rather than bundled into
feature work:

- Next.js 16 and React 19
- Dev toolchain: TypeScript 6, Vitest 4, ESLint 10, Tailwind 4
- Zod 4 (would let the structured-output schema be derived from Zod instead of hand-written)
- `@types/node` 25

## Will not ship in this repo

- Full expense management product (this is a starter, not Expensify)
- User authentication (add Supabase Auth or NextAuth)
- Mobile app (the web UI works on mobile)
- LangChain or LlamaIndex dependencies
- Provider lock-in beyond the single, swappable vision call

## Versioning

Semver.

- Major: breaking env var, removed API route, schema change
- Minor: new feature, new export, new UI section
- Patch: bug fix, doc update

## Release log

See [Releases on GitHub](https://github.com/sarmakska/receipt-scanner/releases) and [`CHANGELOG.md`](./CHANGELOG.md).
