# Vendor subscription rollout

The subscription code ships behind `SUBSCRIPTIONS_ENABLED=true`. Keep that flag off until the chosen gateway mode has validated credentials, plans and a public webhook. The owner has selected Live Mode for production; local Test Mode credentials must never be copied there. With the flag off, existing production registration and listings keep their current behavior. Full mandate authorization and provider webhook delivery remain unverified.

## Plans from the supplied PDF

The monthly prices below include GST, as confirmed by the owner. No additional GST is added to the plan charge. Tax invoices and accounting breakdowns need separate configuration.

| Plan | Monthly price | Portfolio photos | Categories | Service packages | Staff accounts |
| --- | ---: | ---: | ---: | ---: | ---: |
| Starter | ₹199 | 10 | 1 | 3 | 0 |
| Growth | ₹299 | 25 | 2 | 6 | 0 |
| Pro | ₹499 | 50 | 3 | 12 | 2 |
| Premium | ₹999 | 100 | Multiple relevant | Unlimited | 5 |

Registration records the selected plan and explicit AutoPay consent in a temporary `registrations` record. No vendor User or normal session is created at this stage. Email verification grants a limited setup cookie; login resumes unfinished setup instead of opening the dashboard. The two-calendar-month trial schedule is calculated when Razorpay Checkout is opened, and its exact first debit date is displayed. Checkout expires after 30 minutes if not authorized. After email verification, the vendor must authorize a Razorpay subscription. The Razorpay `start_at` time is the first paid cycle; no plan fee is requested up front. Razorpay may process a nominal authorization transaction. The server verifies Checkout's signature and refreshes the subscription from Razorpay. It creates the vendor account only for an `authenticated` or `active` mandate with matching registration ID, subscription ID, plan, first debit date, quantity and cycle count. A correct callback signature alone cannot activate an un-authorized mandate. Closing, failing or skipping Checkout leaves registration incomplete. A status recovery action and signed webhook handle a lost browser callback. Duplicate activation is idempotent. Signed webhooks keep the local status current. A daily job emails a reminder within seven days of the first charge. A vendor can cancel immediately; a new mandate does not grant another free trial.

The current app enforces the photo limits and subscription status for new vendors when subscriptions are enabled. It has one primary category and image uploads only. Additional categories, service packages, video portfolios, reviews, offers, analytics, staff accounts, branch management, and tiered placement/support need product work before these PDF benefits can be advertised as live features. Existing approved accounts without a subscription record are grandfathered until a migration policy is chosen.

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

Use `SUBSCRIPTIONS_ENABLED=true` only when all Razorpay credentials, plan IDs and the webhook secret are configured. Missing configuration with the flag enabled fails registration closed instead of allowing a free account. With the flag off, the current legacy production registration remains available. Existing accounts are not migrated automatically.

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

On 28 September 2026 the Live credentials were accepted by the plan API. The four Live plans were created and fetched with matching monthly INR amounts. No Live subscription or customer charge was created by setup. The rollout remains gated pending provider webhook delivery and owner-controlled mandate authorization.
