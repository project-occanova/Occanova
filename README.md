# Occanova — Phase 1 foundation

A working Phase 1 application using the supplied logo and green/ivory palette. It supports a local JSON preview and a production MongoDB backend.

## Run

```powershell
npm install
$env:LOCAL_PREVIEW='true'
npm run dev
```

Open http://127.0.0.1:3000. `LOCAL_PREVIEW=true` exposes test-only verification/reset links; never enable it on a public host. Use invented test data. Local records persist in ignored `data/preview.json`.

On Vercel, the app remains read-only until a MongoDB connection variable (`MONGODB_URI`, Vercel Marketplace's `ATLAS_MONGODB_URI`, `ATLAS_URL`, or `MONGODB_URL`) is configured. Existing account access, vendor profiles, administration and shared rate limiting then become writable. Public registration and enquiries also require Resend plus the explicit `PUBLIC_INTAKE_ENABLED=true` launch switch.

## Production backend

1. Connect MongoDB Atlas through Vercel (`ATLAS_MONGODB_URI`) or provide the connection string as `MONGODB_URI`/`MONGODB_URL`.
2. Set `MONGODB_DB=occanova`, `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_SITE_URL`, `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Keep `PUBLIC_INTAKE_ENABLED=false` and `SITE_INDEXABLE=false` until real vendor content and company-approved legal copy are live. Set each switch to `true` only after its launch review and redeploy.
3. For uploads, set the `S3_*` variables and a strong `CRON_SECRET` from `.env.example`. Keep the bucket private. Vendor uploads pass through the authenticated application API and are limited to 4 MB per file.
4. Run `npm run backend:check`. The first connection creates the normalized collections, indexes, TTL cleanup and seed taxonomy.
5. Visit `/admin/login` after deployment. The configured administrator is provisioned on first access. Keep `LOCAL_PREVIEW` unset or false in production.

The database uses separate collections for vendors, users, enquiries, sessions, one-time tokens, categories, locations and audit events. Mutations run in MongoDB transactions; session/token expiry uses TTL indexes. Resend sends verification, password-reset and enquiry emails. S3-compatible storage validates file type and size, keeps verification documents private, and serves downloads through five-minute URLs; public portfolio media is available only for approved listings. Replaced files are deleted after a successful profile save; a protected daily job removes uploads that remain unreferenced for more than 24 hours.

## Working flows

- Homepage, category/city discovery, search, pagination, empty states and public profiles.
- Only approved/published vendors appear; Featured vendors use manual priority and optional dates.
- Validated, consent-based enquiries; vendor and admin enquiry status updates.
- Vendor registration, local email verification/reset, hashed passwords, revocable HttpOnly sessions, login/logout.
- Vendor profile save/review submission with up to 25 operating locations, removable uploads and automatic orphan cleanup; edits remove the existing publication pending review.
- Protected admin profile editing, review, approve/reject/suspend/inactivate, reversible account deactivation, publication/Featured controls, taxonomy activation and audit log.
- Responsive public/vendor/admin interfaces; editable vendor SEO, social metadata, structured business data, dynamic public-profile sitemap, draft terms/privacy and launch-safe indexing controls.
- Public API and enquiry forms use explicit field allowlists; enquiry tables receive only the vendor names needed for their authorized rows. Private media redirects use `private, no-store`.

## Admin setup

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` (12+ characters) as protected production variables. The configured administrator is provisioned on the first `/admin/login` request; the script remains available for manual environments. No default or public credentials are installed. Administrators sign in through the separate `/admin/login` entry, and can use the email reset flow when the original secret is unavailable. The public `/login` route accepts vendor accounts only. Vendor accounts cannot access admin data or controls.

## Checks

`npm run typecheck`, `npm test`, `npm run build`. Use `npm run release:check` for a compact production smoke test; set `SITE_URL` to check another deployment. Set `EXPECT_INTAKE=true` and `EXPECT_INDEXABLE=true` only after their corresponding launch switches are enabled.

## Remaining Phase 1 work

1. Comprehensive release UAT with the approved production content and configured external services.
2. Confirm real vendors, prices/contact details, company-approved legal copy and licensed production photography.
3. Configure production email, private storage, monitoring, MongoDB backup/restore and service ownership handover.

The demonstration cities Kochi, Thrissur and Kozhikode are provisional. Photography is externally hosted illustrative Unsplash content; no claim is made that it belongs to a vendor. Sample listings cannot receive enquiries. No emails, WhatsApp messages or purchases are performed automatically.

## Architecture and consumption

Next.js 16 + TypeScript. Server-rendered discovery; client components for forms only. Shared domain types and validation in `src/lib`, reusable UI in `src/components`. Read `docs/PHASE1.md` and this README first in future sessions; use targeted file reads and focused diffs to reduce repeated context. Keep the generated Next.js instructions in `AGENTS.md`.
