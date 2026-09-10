# Occanova — Phase 1 foundation

A working Phase 1 application using the supplied logo and green/ivory palette. It supports a local JSON preview and a production MongoDB backend.

## Run

```powershell
npm install
$env:LOCAL_PREVIEW='true'
npm run dev
```

Open http://127.0.0.1:3000. `LOCAL_PREVIEW=true` exposes test-only verification/reset links; never enable it on a public host. Use invented test data. Local records persist in ignored `data/preview.json`.

On Vercel, the app remains read-only until both `MONGODB_URI` and the Resend variables are configured. Once present, registration, authentication, vendor profiles, enquiries, administration, transactional email and shared rate limiting become writable automatically.

## Production backend

1. Create a MongoDB Atlas database that supports transactions and copy its connection string to `MONGODB_URI`.
2. Set `MONGODB_DB=occanova`, `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_SITE_URL`, `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
3. For uploads, set the `S3_*` variables from `.env.example`. Keep the bucket private and allow browser `PUT` requests from the production site origin in its CORS policy.
4. Run `npm run backend:check`. The first connection creates the normalized collections, indexes, TTL cleanup and seed taxonomy.
5. Run `npx tsx scripts/create-admin.ts` once, then deploy. Keep `LOCAL_PREVIEW` unset or false in production.

The database uses separate collections for vendors, users, enquiries, sessions, one-time tokens, categories, locations and audit events. Mutations run in MongoDB transactions; session/token expiry uses TTL indexes. Resend sends verification, password-reset and enquiry emails. S3-compatible storage uses five-minute upload/download URLs, validates file type and size, keeps verification documents private, and serves public portfolio media only for approved listings.

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

1. Multiple operating locations per vendor, editable SEO metadata and launch indexing configuration.
2. Dedicated soft-delete/reactivate semantics, orphaned-upload cleanup, admin-profile editing and comprehensive release UAT.
3. Confirm real vendors, prices/contact details, company-approved legal copy and licensed production photography.
4. Configure production monitoring, MongoDB backup/restore and service ownership handover.

The demonstration cities Kochi, Thrissur and Kozhikode are provisional. Photography is externally hosted illustrative Unsplash content; no claim is made that it belongs to a vendor. No emails, WhatsApp messages, purchases or deployments are performed automatically.

## Architecture and consumption

Next.js 16 + TypeScript. Server-rendered discovery; client components for forms only. Shared domain types and validation in `src/lib`, reusable UI in `src/components`. Read `docs/PHASE1.md` and this README first in future sessions; use targeted file reads and focused diffs to reduce repeated context. Keep the generated Next.js instructions in `AGENTS.md`.
