# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Vision OCR now runs on Claude Opus 4.7 with high-resolution image input (long edge up to 2576px), replacing the previous Claude 3.5 Sonnet default.
- Structured output: the vision call is constrained to the receipt JSON Schema server-side, so the model returns valid JSON in the exact shape rather than free-form text that needs repairing. The result is still validated through Zod as a boundary.
- Prompt caching on the system prompt, which is identical on every scan, to cut input cost on repeat requests.
- Multi-receipt batch upload. A new `/api/scan/batch` endpoint accepts up to 50 files in one request and scans them with bounded concurrency; one bad image no longer fails the rest of the batch. The UI accepts multiple files and shows per-file results.
- OFX 1.0.2 export. A new `/api/export/ofx` endpoint and an Export OFX button turn scanned receipts into a bank statement that Xero, QuickBooks, GnuCash, and most desktop accounting tools import directly.
- Cloudflare R2 storage for original images (`lib/storage.ts`). Optional and content-addressed by SHA-256; when R2 is not configured the scanner still runs end to end and the hash is still computed for deduplication.
- A shared pipeline orchestrator (`lib/pipeline.ts`) so the single-scan and batch routes follow exactly one path: store original, scan, persist.
- End-to-end tests with image and JSON fixtures covering preprocessing, the vision call (with a stubbed model), structured-output validation, batch isolation of failures, OFX generation, and storage.
- `@aws-sdk/client-s3` dependency for the R2 integration.

### Changed

- `lib/schema.ts` is now a total nullable schema (no optional fields) plus a `StoredReceipt` type that carries the id, image key, content hash, and scan timestamp.
- `lib/persist.ts` `save()` takes the receipt plus its storage metadata and returns a complete `StoredReceipt`.
- `docs/schema.sql` gains `image_key` and `image_sha256` columns and a unique index on the hash for deduplication.
- Default `MAX_IMAGE_PX` raised from 1568 to 2576 to match Opus 4.7's high-resolution vision.
- CI now rebuilds the `sharp` native binary before type check, lint, test, and build.
- Bumped `@anthropic-ai/sdk` to `^0.69` (structured outputs, Opus 4.7) and `zod` to `^3.25`.

### Fixed

- Security contact corrected to `security@sarmalinux.com` and a supported-versions table added to `SECURITY.md`.

### Notes

- Major dependency upgrades (Next.js 16, React 19, TypeScript 6, Vitest 4, ESLint 10, Tailwind 4, Zod 4, `@types/node` 25) are deliberately not applied in this release and are tracked as separate issues.
