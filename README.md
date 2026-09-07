# Occanova — Phase 1 foundation

A working **local preview**, using the supplied logo and green/ivory palette. This is not the completed production Phase 1 release.

## Run

```powershell
npm install
$env:LOCAL_PREVIEW='true'
npm run dev
```

Open http://127.0.0.1:3000. `LOCAL_PREVIEW=true` exposes test-only verification/reset links; never enable it on a public host. Use invented test data. Local records persist in ignored `data/preview.json`.

## Working flows

- Homepage, category/city discovery, search, pagination, empty states and public profiles.
- Only approved/published vendors appear; Featured vendors use manual priority and optional dates.
- Validated, consent-based enquiries; vendor and admin enquiry status updates.
- Vendor registration, local email verification/reset, hashed passwords, revocable HttpOnly sessions, login/logout.
- Vendor profile save/review submission; edits remove the existing publication pending review.
- Protected admin review, approve/reject/suspend/inactivate, publication/Featured controls, taxonomy activation and audit log.
- Responsive public/vendor/admin interfaces; dynamic public-profile sitemap; draft terms/privacy; preview is blocked from indexing.

## Admin setup

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` (12+ characters) privately in your terminal environment, then run `npx tsx scripts/create-admin.ts`. No default admin or public credentials are installed. Login at `/login`. Vendor accounts cannot access admin data or controls.

## Checks

`npm run typecheck`, `npm test`, `npm run build`.

## Remaining Phase 1 work

1. Replace the single-process JSON preview adapter with indexed MongoDB/Mongoose collections and transactional mutations; add backups and a managed shared rate limiter.
2. Separate Node/NestJS API, OpenAPI documentation, JWT access/refresh rotation and production authentication review.
3. Transactional email delivery, verification resend/recovery, private S3-compatible document uploads, portfolio/logo uploads, restrictions and review.
4. Multiple operating locations per vendor, editable SEO metadata, real category/location landing pages and launch indexing configuration.
5. Dedicated soft-delete/reactivate semantics and admin-profile editing; comprehensive release UAT and browser coverage.
6. Confirm launch region, real vendors, actual prices/contact details, company-approved legal copy and licensed production photography.
7. Client-owned repository, database, storage, email and hosting accounts; staging, production, monitoring, backup/restore and handover.

The demonstration cities Kochi, Thrissur and Kozhikode are provisional. Photography is externally hosted illustrative Unsplash content; no claim is made that it belongs to a vendor. No emails, WhatsApp messages, purchases or deployments are performed automatically.

## Architecture and consumption

Next.js 16 + TypeScript. Server-rendered discovery; client components for forms only. Shared domain types and validation in `src/lib`, reusable UI in `src/components`. Read `docs/PHASE1.md` and this README first in future sessions; use targeted file reads and focused diffs to reduce repeated context. Keep the generated Next.js instructions in `AGENTS.md`.
