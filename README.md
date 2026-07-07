# 🧵 Royal Stitch Marketplace

A high-performance bespoke apparel and tailoring custom marketplace built with **Next.js 15 (App Router)**, **PostgreSQL (Supabase)**, **Clerk Authentication**, and **Razorpay Payments**.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green?style=flat-square&logo=supabase)](https://supabase.com/)
[![Clerk](https://img.shields.io/badge/Clerk-Auth-6C47FF?style=flat-square&logo=clerk)](https://clerk.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-Testing-7E9B2D?style=flat-square&logo=vitest)](https://vitest.dev/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

---

## ✨ Features

- **🛍️ Complete Catalog & Filters:** Responsive filtering and page-bounded pagination for browse/search.
- **🚀 Demo Mode Out-of-the-Box:** Run the application locally instantly using simulated data without needing any external API keys or DB setup.
- **🔒 Clerk Identity Protection:** Secure user and seller profiles. Automatically bypasses/degrades gracefully if keys are omitted.
- **⚡ Performance First:** Optimistic UI updates, server components (RSC) for initial page loads, and cursor-based DB queries.
- **💳 Payment Integration:** Razorpay secure billing flows with robust fallback verification mechanisms.
- **📬 Reliable Background Job Queue:** Postgres-backed task engine with retry logic and backoff.

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:
- **Node.js** >= 20.0.0
- **npm** or similar package manager

### Installation

1. Clone the repository and navigate to the root directory.
2. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally

To start the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) (or the port shown in your terminal) to view the application.

### Running Tests

To run the unit and integration tests using Vitest:
```bash
npm run test
```

---

## ⚙️ Environment Configuration

Copy `.env.example` to `.env.local` or `.env` and configure:

```ini
# Set to "true" to run with mock/demo data (no external services needed)
ENABLE_DEMO_MODE=true

# Clerk Auth (Optional)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Supabase (Optional)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Cloudinary Uploads (Optional)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=
```

---

## 📐 System Architecture & Design Details

Below are the detailed technical specifications and architectural layers of the Royal Stitch Marketplace.

<details>
<summary><b>1. Frontend Architecture</b> (App Router, Server Components, Optimistic UI)</summary>

The frontend uses Next.js 15 (App Router) to separate Server Components (RSC) and Client Components, reducing client-side JavaScript while preserving interactivity where required. This approach is chosen over fully client-rendered apps to improve initial load time and reduce hydration cost.

Server Components handle read-heavy operations such as product listings and category browsing. Data is fetched at render time, eliminating client-side request waterfalls and improving SEO.
Client Components are limited to interactive features such as cart updates, filters, and checkout, where browser state and real-time updates are required.

All UI is API-driven. No mock state is used. Every interaction (cart, checkout, orders) depends on backend responses to maintain consistency.

Optimistic UI is applied only to non-destructive actions like cart updates. The UI updates immediately, and the API call runs in the background. On failure (e.g., 409 due to stock mismatch), the client rolls back state and displays a retry message.

Performance is controlled through:
* Dynamic imports for heavy modules (e.g., payment SDK) to prevent blocking initial render
* Cursor-based pagination to avoid offset-scan degradation and keep query cost bounded
* Hydration boundaries to limit client-side JavaScript to interactive components only

**Degradation Behavior:**
Under high load or API latency, non-critical UI elements (e.g., recommendations) fall back to default content, while core flows (catalog and checkout) remain functional.
</details>

<details>
<summary><b>2. Database Architecture</b> (Supabase, postgres.js, Transactions)</summary>

The system uses PostgreSQL (via Supabase) with a split access strategy to balance development speed with transactional control.

Supabase client is used for standard CRUD operations where Row Level Security (RLS) enforces access automatically.
postgres.js is used for critical paths such as checkout, where explicit transaction control and performance tuning are required.

Index strategy is designed around query patterns:
* `products(category_id, created_at DESC)` supports category-based pagination without full table scans
* `orders(buyer_id, created_at DESC)` supports efficient user order history queries

Without these indices, queries degrade to O(n) scans. With indices, lookups remain logarithmic and bounded by page size.

Checkout is handled through a transactional flow:
* Inventory rows are locked using `SELECT ... FOR UPDATE`
* Stock is validated before deduction
* Order and order_items are created atomically
* Cart is cleared within the same transaction

If any step fails, PostgreSQL rolls back automatically, preventing partial state.

Aggregation (e.g., seller metrics, trending products) is performed at the database level using SQL/RPC instead of API-level loops, reducing memory overhead and network latency.

*Assumption:* system operates under moderate scale (<50k products, controlled write contention).

**Degradation Behavior:**
Under heavy load (e.g., connection pool saturation or lock contention), transactions may timeout. The API returns a 503, and clients retry with backoff.
</details>

<details>
<summary><b>3. Background Job System</b> (Queue Engine, Retry Policies)</summary>

A PostgreSQL-backed job queue is used to handle asynchronous tasks (emails, reconciliation, cleanup) without blocking API requests. This approach is chosen over external queues to reduce infrastructure complexity at current scale.

Jobs are stored in a `background_jobs` table with states:
`pending → processing → completed/failed`

Workers poll the table and claim jobs atomically, preventing duplicate execution.

**Retry policy:**
* Limited attempts (max 5)
* Exponential backoff
* Only transient failures are retried

Permanent failures are marked as `failed` and require manual inspection.

**Observability:**
* Each job logs `job_id`, `job_type`, and `error_message`
* Failures can be traced and replayed manually

**Degradation Behavior:**
If the worker crashes, jobs remain in the database and resume processing when the worker restarts.
</details>

<details>
<summary><b>4. Payment Infrastructure</b> (Razorpay, Webhooks, Idempotency)</summary>

The payment system ensures consistency between internal order state and external payment gateway behavior.

**Flow:**
1. Order is created in the database (pending state) before payment
2. Razorpay checkout is initiated on the client
3. Payment is verified via API (signature validation)
4. Webhook acts as fallback confirmation

Idempotency is enforced using a unique constraint on `razorpay_payment_id`.
Both client verification and webhook updates attempt to write, but duplicates are safely ignored.

**Recovery handling:**
* If client disconnects, webhook completes the flow
* If webhook fails, order times out and is marked failed
* A background job releases reserved inventory after a timeout

**Observability:**
* Payment attempts log `order_id`, `user_id`, and mismatch errors
* Failed or inconsistent payments trigger alerts

**Degradation Behavior:**
If webhook delivery fails, the system relies on client verification. If both fail, orders expire and require reconciliation.
</details>

<details>
<summary><b>5. Recommendation System</b> (Scoring, Cache TTL)</summary>

The system uses a rule-based scoring model instead of machine learning to avoid complexity and cold-start issues at current scale.

**Scoring:**
* Views (1x) → awareness
* Cart additions (4x) → intent
* Purchases (12x) → confirmed interest

Recommendations are limited to recent activity (e.g., last 7 days) to maintain relevance.

**Caching:**
* Results are cached with a short TTL (~120 seconds) to reduce repeated DB computation while keeping data reasonably fresh

This approach trades perfect personalization for simplicity, predictability, and low infrastructure cost.

**Degradation Behavior:**
If telemetry or scoring fails, the system falls back to static recommendations such as “New Arrivals.”
</details>

<details>
<summary><b>6. Error Surface Map</b> (Failure Responses)</summary>

| Flow       | Failure Scenario            | System Response                | User Experience                 | Data State |
| ---------- | --------------------------- | ------------------------------ | ------------------------------- | ---------- |
| Browse     | DB connection exhausted     | API returns 503                | "Catalog unavailable" + retry   | Safe       |
| Cart       | Rate limit hit (429)        | Request rejected               | Cart rolls back + retry message | Unchanged  |
| Checkout   | Item sold out               | Transaction rollback (409)     | "Item sold out" + redirect      | Consistent |
| Payment    | User closes browser         | Webhook fallback / timeout job | Order marked failed later       | Released   |
| Seller Ops | Unauthorized update attempt | RLS rejects operation (403)    | Unauthorized error              | Unchanged  |

Failures are categorized as:
* Network → retryable
* Client error (4xx) → user correction
* Server error (5xx) → fallback + retry
</details>

<details>
<summary><b>7. Security Model</b> (Auth JWTs, RLS, Input Verification)</summary>

Security is enforced at multiple layers to prevent misuse and data leaks.

**Authentication:**
* Clerk manages user sessions via JWT
* Middleware validates tokens before API execution

**Authorization:**
* Row Level Security (RLS) ensures users access only their own data
* API-level checks add defense in depth

**Input Validation:**
* All inputs validated via Zod schemas
* Invalid data rejected before DB interaction

**Rate Limiting:**
* Sliding window per IP or user
* Prevents abuse and protects backend resources

**Webhook Security:**
* Razorpay webhooks verified using HMAC-SHA256 signatures
* Invalid signatures are rejected immediately

**Observability:**
* Critical operations log `request_id`, `user_id`, and `order_id`
* Enables tracing across systems

**Degradation Behavior:**
Under high traffic or attack conditions, rate limiting drops excess requests while preserving core transactional flows.
</details>
