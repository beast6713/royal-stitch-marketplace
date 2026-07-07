# Production Hardening Notes

## Before vs After

Before:
- Prepaid checkout created a Razorpay order first, then tried to create marketplace orders after payment success.
- Webhooks updated orders directly and could process the same event more than once.
- Demo/localStorage fallback could hide production outages.
- Product and order reads were mostly unbounded.
- Telemetry accepted arbitrary event names and ranking relied on static product fields.

After:
- Prepaid checkout creates a local `pending` order first through `place_order_transaction`, reserves stock, then creates a Razorpay order.
- Payment verification and webhooks both use `confirm_payment_transaction`, which is idempotent by `razorpay_payment_id`.
- Webhooks persist `x-razorpay-event-id` before mutating orders, so duplicate events become no-ops.
- Failed transient operations use bounded retry, exponential backoff, and small circuit breakers.
- Product reads and seller metrics are cached; API list reads have explicit limits and offsets.
- Trending recommendations use real telemetry: `views * 1 + add_to_cart * 4 + purchases * 12`.

## Schema Changes

Run:

```sql
-- after supabase/schema.sql
\i supabase/production_hardening.sql
\i supabase/seller_metrics.sql
```

Key additions:
- `orders.idempotency_key`, `orders.payment_provider`, `orders.payment_expires_at`, `orders.paid_at`, `orders.failure_reason`.
- `payments` for provider payment attempts and idempotent captured-payment records.
- `payment_webhook_events` keyed by Razorpay event id.
- `audit_logs` for critical actions.
- `background_jobs` for confirmation email jobs, reconciliation, and abandoned-order release.
- Indexes:
  - `products(category_id, created_at desc)`
  - `orders(buyer_identifier, created_at desc)`
  - `order_items(seller_id)`
  - `telemetry_events(product_id, event_name, created_at desc)`

## API Flow

COD:
1. `POST /api/checkout`
2. Validates address and idempotency key.
3. Calls `place_order_transaction`.
4. Creates order with `payment_status = cod_due`.
5. Clears cart and queues `order_confirmation_email`.

Prepaid Razorpay:
1. `POST /api/payments/razorpay/order`
2. Calls `place_order_transaction` with `payment_status = pending`.
3. Creates Razorpay order with local order id in notes.
4. Stores `razorpay_order_id` on the local order.
5. Client opens Razorpay Checkout.
6. `POST /api/payments/razorpay/verify`
7. Verifies `order_id|payment_id` HMAC signature.
8. Calls `confirm_payment_transaction`.
9. Marks order `paid`, inserts `payments`, clears cart, queues confirmation email.

Webhook:
1. `POST /api/webhooks/razorpay`
2. Verifies raw body HMAC from `x-razorpay-signature`.
3. Requires and stores `x-razorpay-event-id`.
4. Rejects stale payloads when `created_at` is present.
5. Processes `payment.captured`, `order.paid`, and `payment.failed`.

## Failure Handling

Razorpay order creation fails:
- Local order remains `pending`.
- A delayed `release_abandoned_order` job is queued.
- Retrying with the same idempotency key reuses the same local order.

Payment succeeds but DB confirmation fails:
- `/verify` returns `202 reconciliation_pending`.
- A `payment_reconciliation` job is queued using the Razorpay payment id.
- Webhook can also complete the same transition later because confirmation is idempotent.

Duplicate webhook:
- `payment_webhook_events.event_id` primary key catches it.
- Handler returns `{ status: "duplicate" }` without mutating orders.

Payment timeout or abandonment:
- `release_abandoned_order` calls `expire_pending_order`.
- Stock is released only if the order is still unpaid.
- Order becomes `cancelled` and `payment_status = abandoned`.

Seller shipping update:
- Sellers can update only their own `order_items`.
- Orders cannot ship until `payment_status` is `paid` or `cod_due`.
- Parent order becomes `shipped` or `delivered` from child item states.

## Why Transaction RPC

The order RPC keeps stock deduction, order creation, order item splitting, idempotency, and cart cleanup in one PostgreSQL transaction. This is the safest place for those writes because row locks (`FOR UPDATE`) can prevent overselling when two buyers try to purchase the same stock.

## Multi-Vendor Splitting

The buyer gets one parent `orders` row. Each seller receives their own `order_items` rows under that order. Seller dashboards query `order_items.seller_id`, while buyer history queries the parent order and joins all items. This keeps checkout simple while still giving each seller an isolated operational view.

## Tradeoffs

- Stock is reserved at pending-order time, not after payment. This prevents payment-without-inventory but requires abandoned-order release jobs.
- Background jobs are DB-backed and lightweight, not a full queue system. That is enough for a student-level production-aware system and can later be replaced by a managed queue.
- The rate limiter and circuit breakers are process-local. They protect the app from basic bursts and cascading failures but are not a substitute for edge or Redis-backed limits at high scale.
- Product listing caching uses short TTLs to reduce Supabase query load while keeping seller changes reasonably fresh.
