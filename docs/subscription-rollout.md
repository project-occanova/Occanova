# Vendor subscription rollout

The subscription code ships behind `SUBSCRIPTIONS_ENABLED=true`. Keep that flag off until the chosen gateway mode has validated credentials, plans and a public webhook. The owner has selected Live Mode for production; local Test Mode credentials must never be copied there. With the flag off, new production registrations are unavailable; existing accounts keep their current behavior. Full mandate authorization and provider webhook delivery remain unverified.

## Plans from the supplied PDF

The monthly prices below include GST, as confirmed by the owner. No additional GST is added to the plan charge. Tax invoices and accounting breakdowns need separate configuration.

| Plan | Monthly price | Portfolio photos | Categories | Service packages | Staff accounts |
| --- | ---: | ---: | ---: | ---: | ---: |
| Starter | ₹199 | 10 | 1 | 3 | 0 |
| Growth | ₹299 | 25 | 2 | 6 | 0 |
| Pro | ₹499 | 50 | 3 | 12 | 2 |
| Premium | ₹999 | 100 | Multiple relevant | Unlimited | 5 |

Registration records the selected plan and explicit AutoPay consent in a temporary `registrations` record. No vendor User or normal session is created at this stage. Email verification grants a limited setup cookie; login resumes unfinished setup instead of opening the dashboard. The two-calendar-month trial schedule is calculated when Razorpay Checkout is opened, and its exact first debit date is displayed. Checkout expires after 30 minutes if not authorized. After email verification, the vendor must authorize a Razorpay subscription. The Razorpay `start_at` time is the first paid cycle; no plan fee is requested up front. Razorpay may process a nominal authorization transaction. The server verifies Checkout's signature and refreshes the subscription from Razorpay. It creates the vendor account only for an `authenticated` or `active` mandate with matching registration ID, subscription ID, plan, first debit date, quantity and cycle count. A correct callback signature alone cannot activate an un-authorized mandate. Closing, failing or skipping Checkout leaves registration incomplete. A status recovery action and signed webhook handle a lost browser callback. Duplicate activation is idempotent. Signed webhooks keep the local status current. A daily job emails a reminder within seven days of the first charge. A vendor can cancel immediately; a new mandate does not grant another free trial.

The current app enforces the selected plan's photo limits during both the free trial and paid subscription. Trial messaging prominently shows ₹0 plan fees for two months, followed by the selected monthly price including GST. Profile saves, review submissions, upload access, administrator approval and public listing visibility share server-owned entitlement checks; a profile payload cannot select a higher plan. Cancelled, failed, unfinished and expired subscriptions cannot upload or save, and an authenticated mandate without a future trial end cannot retain trial access indefinitely. An over-limit profile after a downgrade is hidden until the owner removes the extra photos; photos are not automatically deleted. Owners can refresh authoritative gateway status in Plan & billing. Existing approved accounts without a subscription record retain their legacy 12-photo allowance until a migration policy is chosen.

The owner chose to enforce existing features first. The app has one primary category and image uploads. Additional categories, service packages, video portfolios, reviews, offers, analytics, staff accounts, branch management, and tiered placement/support need product work before these PDF benefits can be advertised as live features. Uploads use the saved portfolio count: save any removals before uploading replacement photos at the limit. Profile saves recheck the current account's plan within the write transaction to prevent a concurrent plan change from bypassing its limit.

Trial and entitlement validation: 60 automated tests and the production build pass. Isolated local API checks reject forged quota/plan fields, over-limit saves and uploads, cancelled/expired trial drafts, and administrator approval of ineligible profiles. Valid Starter and Pro saves succeed. Browser checks at 390, 820 and 1440 pixels verify the trial banner, selected pricing, consent reset, readable contrast and no horizontal overflow. Dashboard checks cover trial usage, locked subscriptions and removing photos after a downgrade. No real mandate, charge, email or storage upload was made during these checks.

## Test-mode setup before launch

1. In Razorpay Test Mode, create four **monthly** plans with interval `1`, currency `INR`, and amounts `19900`, `29900`, `49900`, and `99900` paise. Record their `plan_...` IDs.
2. Configure the four `RAZORPAY_PLAN_*` variables, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and a separate `RAZORPAY_WEBHOOK_SECRET`. Keep `SUBSCRIPTIONS_ENABLED=false` until integration and legal review finish. Use test keys only on a staging deployment.
3. Configure a test webhook at `/api/billing/webhook` for subscription lifecycle events (`subscription.authenticated`, `subscription.activated`, `subscription.charged`, `subscription.pending`, `subscription.halted`, `subscription.cancelled`, `subscription.completed`, `subscription.expired`). Keep the webhook secret out of client code.
4. Test registration, email verification, mandate authorization, duplicate Checkout callbacks, webhook replay, cancellation, failed debit, and a first-charge reminder in staging. Inspect the Razorpay subscription start time and final amount. Never use a live key for this test.
5. Approve billing terms, cancellation/refund wording, privacy policy, and whether existing vendors must migrate. Only then enable subscriptions and deploy.

Razorpay subscriptions have a finite `total_count`; the implementation requests 96 monthly cycles after the trial. Renewing beyond that period needs a new authorization. The account must have Razorpay Subscriptions and the desired recurring payment methods enabled. Razorpay's actual Checkout terms and mandate details control the final debit.

## Local connection helper

Add your Razorpay **Test Mode** key pair to the ignored `.env.local` file:

```dotenv
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_test_key_secret
```

From the project folder run `npm run billing:setup`. This command refuses live keys, checks the account's plan API, reuses matching Occanova monthly plans, creates missing plans at the PDF prices, and saves the four plan IDs locally. It generates a local webhook secret if absent and does not enable billing. Retry is safe after a partial failure because it searches all existing plans first. `npm run billing:check` only reads Razorpay and reports configuration without displaying secrets.

Restart the local server after changing environment variables. For the local Checkout test only, set `SUBSCRIPTIONS_ENABLED=true` and ensure `NEXT_PUBLIC_SITE_URL` matches your local origin. Do not copy Test Mode settings into production. A real webhook delivery test still needs an approved public staging URL or temporary tunnel; creating a secret locally does not configure a webhook in Razorpay. Keep the rollout flag off until mandate authorization, cancellation, callback verification and webhook delivery have passed.

## Connection checked on 28 September 2026

Razorpay Test Mode credentials are saved only in ignored `.env.local`. All four monthly plan IDs were created and fetched back with the expected INR amounts. A temporary Starter subscription was created with its first paid cycle exactly two calendar months in the future, fetched back with zero paid cycles, then cancelled and fetched back to confirm cancellation. The local preview enables mandatory subscription registration with Test Mode keys. The production rollout flag has not changed. That initial connection check did not push or deploy. The gated subscription implementation was subsequently deployed in commit 9bf36a0 with production billing disabled.

`npm run billing:smoke` repeats this gateway check with test credentials only and customer notifications disabled. It creates and cancels one temporary test subscription. This does not verify an actual card/UPI mandate, a successful charge, failed-debit handling, or webhook delivery. These still require a local Checkout session and a public Test Mode webhook endpoint before rollout.

## Mandatory registration setup

Use `SUBSCRIPTIONS_ENABLED=true` only when all Razorpay credentials, plan IDs and the webhook secret are configured. Missing configuration with the flag enabled fails registration closed instead of allowing a free account. With the flag off, new production registrations fail closed; the legacy registration branch is limited to local previews. Existing accounts are not migrated automatically.

Incomplete records without a gateway subscription expire after 24 hours. Gateway-linked records are retained so delayed authorization cannot orphan an AutoPay mandate. The vendor can log in to renew the limited setup session and resume. A future cleanup job must cancel abandoned created mandates before deleting their registration records; automated cleanup is not implemented yet. Completed records are removed after the browser receives a normal session; webhook-only completion still allows normal login.

Checkout retries reuse an unexpired created subscription. Changing plans cancels the old unfinished subscription before creating another. Reauthorizing an existing vendor preserves remaining trial time and never adds two more free months. The website security policy explicitly allows Razorpay checkout and its CDN script, API frame, and API/telemetry connections.

Validation: 49 automated tests pass, including pending signup, consent, email-only denial, mandate ownership/schedule validation, duplicate activation, server plan-price validation, retry, plan change and trial reuse. Browser testing at 390, 820 and 1440 pixels verifies registration and setup rendering without horizontal overflow. A pending signup is rejected from the dashboard and profile API. Invalid callback signatures and correctly signed callbacks for still-created mandates do not activate accounts. Local signed-webhook checks also reject invalid signatures and use authoritative gateway state on event replay, so a still-created mandate cannot be activated by an event payload claiming it is active. Public delivery from Razorpay remains a separate staging check before production billing is enabled.

The final Test Mode Checkout attempt successfully loaded the official card-entry screen without application errors or CSP errors. Razorpay then requested an OTP during card setup; authorization was not completed. The disposable registration remained absent from Users throughout. Its unfinished Test Mode mandate was cancelled and fetched back as cancelled, and only its own local fixture records were removed. Complete the next test with the owner’s own contact details in Checkout; never send an OTP or payment secret through chat.

## Live Mode configuration

The owner requested Live Mode. Keep Live credentials separate in ignored `.env.razorpay-live.local`:

```dotenv
RAZORPAY_KEY_ID=rzp_live_your_key_id
RAZORPAY_KEY_SECRET=your_live_key_secret
```

Run `npm run billing:live:check` to validate Live keys and plans, or `npm run billing:live:setup` to create/reuse the four Live monthly plans and generate a separate Live webhook secret. These commands do not create subscriptions or charge customers. The default Test command continues to refuse Live credentials. Test and Live plan IDs are not interchangeable.

Transfer only the Live key pair, four Live plan IDs and matching webhook secret to Vercel Production. Configure the Live webhook in Razorpay Dashboard for `https://www.occanova.com/api/billing/webhook`, using the subscription events listed above. The handler accepts signed delivery when billing is configured, even while new subscription signups are disabled. The endpoint must be reachable without Vercel deployment protection. Complete authorization with the owner's own contact and payment details in Checkout; bank OTPs stay in Checkout. Use a separate `CRON_SECRET` for the daily first-charge reminder job. Never report the provider integration as verified until an authorized mandate and actual webhook delivery have passed.

On 28 September 2026 the Live credentials were accepted by the plan API. The four Live plans were created and fetched with matching monthly INR amounts. No Live subscription or customer charge was created by setup. The owner confirmed the Live dashboard webhook was saved. The deployed endpoint accepted a signed no-op probe (200) and rejected a forged signature (401); this verifies the handler and matching secret, not provider delivery.

The tested production deployment was rebuilt with `SUBSCRIPTIONS_ENABLED=true`. Public health reports database, email, storage and subscriptions enabled. Registration shows all four plans at 390, 820 and 1440 pixels, requires fresh consent when changing plans, and has no horizontal overflow, framework overlay or browser errors. These checks did not submit an account or mandate. The final check is an owner-controlled Live signup, email verification, bank mandate authorization, and a real subscription lifecycle webhook. General one-time payments remain disabled in production.

## Website and billing audit — 29 September 2026

Billing status recovery now validates the stored mandate, plan, first-debit schedule, quantity and cycle count before updating access. Authorized or previously paid mandates retain a used-trial marker through cancellation and recovery. Concurrent setup requests use a short transactional lease; if a newly created mandate cannot be saved, the application attempts to cancel it without cancelling a reused mandate.

Unfinished registrations support password resets without activating an account. Pending mandates expose a status-recovery button. Public directory, vendor studio and administrator visibility use the same subscription and portfolio eligibility checks. File uploads validate format signatures before storage, email calls have a timeout, and server renders reuse their state read. Large portfolios use a two-photo preview and an expandable, lazy-loaded gallery.

Terms and Privacy now describe the current service, two-calendar-month trial, GST-inclusive plan prices, cancellation and refunds. The support address is info@occanova.com. Billed subscription cycles are generally non-refundable, with review of duplicate/incorrect charges and substantiated service issues, while preserving remedies required by law. The owner must ensure this mailbox receives customer requests.

Validation: 70 automated tests and a production build pass. Isolated browser/API fixtures cover pending-registration password recovery, signature and plan mismatch rejection, mandate status recovery, cancellation, file rejection, search filters and administrator visibility. Public pages and both studios were checked at 390, 820 and 1440 pixels. Large-portfolio checks cover all 100 Premium photos. Fixtures and gateway mocks never create a live mandate or charge, send email or write to production storage. Owner-controlled bank authorization and real Razorpay webhook delivery remain outstanding.

## Vendor review experience — 29 September 2026

Forms validate when submitted and clear validation feedback when edited. Save draft accepts incomplete bounded profile data; full profile validation is required for submission and administrator approval. Submitted profiles have a timestamp, enter the pending queue and produce an account notification and an attempted email receipt. Pending queue and vendor status changes are checked in the background every 45 seconds and when the window regains focus; dirty forms are preserved until the user explicitly refreshes.

Approval, requested changes and publication changes create private account notifications, with the latest 30 retained. A new unread approval shows an accessible dashboard dialog once acknowledged. Notifications are visible only to the owning account. Email sends use the registered account address, a short delivery lease and a stable Resend idempotency key. A failed email does not roll back approval; administrators can retry from the review page. The delivery label means provider acceptance, not confirmed inbox receipt. Resend keeps idempotency keys for 24 hours: https://resend.com/docs/dashboard/emails/idempotency-keys . No new environment variables are required beyond the existing Resend sender configuration.

Validation: 76 automated tests pass. Isolated browser checks exercise registration warnings only on submit, partial drafts, blocking incomplete approval, submission receipts, automatic admin queue updates, change requests, re-submission, failed approval email and retry, approval dialog acknowledgement, owner-only notice access and dirty-form protection. Vendor and admin layouts are checked at 390, 820 and 1440 pixels. Mail is mocked in these checks; no production vendor decisions or live email sends are used for testing.
## Dashboard usability — 29 September 2026

- The vendor profile editor now has sticky Preview, Save draft and Submit for review controls, with an unsaved-changes indicator and save feedback beside the controls. A browser reload/close warning protects unsaved edits; uploads and removal actions also block automatic workspace refresh until saved.
- Preview reads the current form values without saving or submitting. It includes business information, logo and portfolio photos, and excludes private verification documents. Escape or Close returns to editing. Existing review, publication and plan limits remain unchanged.
- Vendor and super-admin enquiry inboxes support search, status filters with counts, contact shortcuts, readable dates and expandable messages. Status changes use the existing authenticated endpoint, show progress and confirmation, and refresh saved data. Mobile uses cards; tablet and desktop use a table.
- Validation: 76 existing automated tests and production build passed. Isolated Playwright checks at 390, 820 and 1440 px covered unsaved preview, dialog focus, sticky controls, search/filter/empty states, contact links, persisted vendor/admin status changes, failed-save feedback and portfolio rendering. The review/approval/email-retry regression flow also passed with a mocked email provider. No production decisions, emails, payments or fixture accounts were created.

## Vendor registration release checks — 29 September 2026

Signup now reports delayed verification email accurately, prefills the resend address, normalizes email and legacy Indian phone formats for duplicate protection, rejects malformed phone numbers and filled bot fields, and disables editing during submission. Registration, resend and password recovery share a three-request recipient budget per 15 minutes; invalid signup fields do not consume that email budget. Normal IP limits still apply.

Production registration fails closed when AutoPay is disabled or misconfigured. A Vercel Production deployment refuses Test Mode keys. Health exposes the non-secret billing mode, and release checks can require `EXPECT_SUBSCRIPTIONS=true` and `EXPECT_BILLING_MODE=live`. Checkout recovery explicitly describes the saved mandate plan when the vendor selects a different plan; closing Checkout explains how to resume or check authorization. Database errors in registration setup return a recoverable JSON response.

Super-admin Registration progress shows unfinished email/AutoPay setup and verified accounts without a business profile, with the latest ten registrations visible. Workspace version updates include registration and account activation changes. Credentials, verification hashes and setup-session hashes are never sent to this panel.

Verification: 81 automated tests and a production build pass. Isolated Playwright browser/API checks at 390, 820 and 1440 px cover signup, consent reset, email verification, pending-account denial, recipient rate limits, Checkout schedule, invalid/unapproved callback denial, dismissal, recovery to the original agreed plan, quota enforcement, signed lifecycle replay and stale-event handling. Gateway and mail are mocked. Live public release checks pass; a read-only check using the existing local Live credential file confirms all four gateway plan prices. No live mandate, charge, email or production fixture account is created by QA.

Before inviting vendors, the owner must finish one Live signup at https://www.occanova.com/register using their own email and bank details. Confirm verification email receipt, account activation, the agreed plan and exact first-debit date in the studio and Razorpay, and a successful real lifecycle webhook to `/api/billing/webhook`. Bank OTPs stay in Checkout. If the test account is disposable, cancel its mandate through Plan & billing and confirm cancellation in Razorpay. Handler probes and simulated webhooks do not prove actual provider delivery. Search indexing remains disabled for the vendor-registration rollout.

## Email verification recovery — 29 September 2026

The verification page includes an inline resend form, login and support options for expired, invalid or missing links. New links are independently valid for 24 hours; requesting another link does not invalidate an earlier unexpired link. Failed email delivery revokes only that send's unused token. Consumed links remain bounded receipts: reopening one explains that verification succeeded, and only an existing valid setup cookie can resume without password login. Reusing a link never issues or rotates another setup session. Opening the email link with GET does not consume it; verification requires the explicit button.

Pending registrations without a mandate are retained for recovery for 30 days, separately from the 24-hour verification/session deadlines. Existing records are migrated once on deployment to update their MongoDB TTL; registration cleanup and admin progress use the recovery deadline. Records already deleted by the previous TTL cannot be restored and require registration again. Resending does not verify email, activate a vendor, change a plan or reset the trial. Existing recipient and IP rate limits remain active, and unknown/already-verified addresses share a generic resend response with login guidance. Verification emails now include recovery links.

Validation: 94 automated tests and the production build pass. Isolated Playwright checks cover expired-link recovery through email verification to AutoPay setup, double-click protection, repeated verification in the same/new browser, password login recovery, concurrent links, failed mail delivery, legacy accounts, missing links, prefilled resend, rate limits and non-enumerating successful responses. Mobile, tablet and desktop layouts are checked at 390, 820 and 1440 px. Mail is mocked; no production fixture account, email, payment or mandate is created. Real recipient inbox delivery remains provider-dependent.
