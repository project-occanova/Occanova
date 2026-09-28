# Razorpay Standard Web Checkout

Next.js App Router routes use the official Node SDK. The existing subscription Checkout and its script loader are reused; one-time orders do not create AutoPay mandates, activate vendor accounts, change subscription plans or grant plan benefits.

## Configuration

The ignored `.env` file contains placeholders. Next.js gives `.env.local` higher precedence. Supply a matching server-only `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`, then set `PAYMENT_CHECKOUT_ENABLED=true` and restart the server. On Vercel, configure the variables for the intended environment and redeploy. Production refuses Test keys. `.env.razorpay-live.local` is a credential preparation file; Next.js does not automatically load it. Transfer validated Live values into Vercel Production rather than assuming that saving that file configures the application.

The create-order endpoint returns the public Key ID associated with the stored order, so a `NEXT_PUBLIC_RAZORPAY_KEY_ID` variable is unnecessary. The secret never reaches the client. Configure Razorpay to capture payments automatically; authorized but uncaptured payments show a pending state.

## Endpoints

Both endpoints require a verified vendor session, a matching Origin, writable deployment, enabled payment configuration, and rate limits. Errors return JSON with private/no-store caching. Invalid fields or signatures return 400, gateway authentication failures return 401, and other gateway errors return 500.

- `POST /api/create-order` accepts `{ "amount": 100, "currency": "INR" }`. The amount is integer paise, from 100 to 10000000 (₹1 to ₹1,00,000). A unique receipt is generated on the server. It creates the gateway order and stores its owner, price, currency and key ID in the existing MongoDB-backed state (or local preview JSON). It returns `{ order_id, amount, currency, key_id }`.
- `POST /api/verify-payment` accepts `razorpay_payment_id`, `razorpay_order_id`, and `razorpay_signature`. It checks ownership and uses the stored order ID to compute HMAC-SHA256 of `order_id|payment_id`. It also fetches the payment and validates its order, amount, currency and captured state before recording `paid`. A replay of the same paid payment succeeds without duplicating effects. An authorized payment returns 202 with `success:false`.

The UI at `/dashboard/payments` allows a vendor to enter a one-time amount agreed with Occanova. No product or service fulfillment is attached to this general payment screen. If it is later used to sell a specific product, resolve its price from a server-owned catalog instead of trusting an editable amount. The dashboard shows the link only when one-time payments are enabled.

## Test steps

1. Use current **Test Mode** keys on localhost or a non-production staging deployment, enable `PAYMENT_CHECKOUT_ENABLED`, and run `npm run dev`.
2. Sign in to a verified vendor account and open `/dashboard/payments`.
3. Enter ₹1, press Pay and complete Razorpay's Test Checkout with its official test instruments. Verify the success message and payment reference. Close the modal and exercise a failed payment as separate checks. Retry uses the same order while the page remains open.
4. If authorization is awaiting capture or confirmation fails, use **Check payment status** before paying again.
5. Run `npm test`, `npm run typecheck`, and `npm run build`. Automated tests cover amount validation, signature forgery, ownership, payment tampering, capture status, replay and production mode guards.

Before opening Live payments, validate the current Live credentials and complete a deliberate owner-controlled transaction. Order creation alone does not move money. Browser callback loss is not automatically reconciled by this one-time flow; before adding fulfillment, add payment webhooks and reconciliation. Existing `/api/billing/webhook` handles subscriptions only.

Official integration guide: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/

## Verification on 28 September 2026

The 55-test suite, TypeScript and production build pass. Chrome checks at 390, 820 and 1440 pixels verified content, console health, no overflow, amount validation, cancellation, failed-payment messaging, order reuse, and pending-to-success recovery with a simulated Checkout. An isolated server also created a real ₹1 Razorpay Test order through `/api/create-order`; `/api/verify-payment` rejected a forged signature with HTTP 400 and left the order unpaid. Local fixture records were removed. No charge or Live transaction was created by these checks. Completing actual provider Checkout and capture remains an owner-controlled check.

Live credentials and the four monthly subscription plans have been validated and configured in Vercel Production. Both `PAYMENT_CHECKOUT_ENABLED` and `SUBSCRIPTIONS_ENABLED` remain false pending final provider setup. The subscription webhook accepts signed delivery while registration is paused.
