
# Zap Gas MVP — Build Plan

A single Lovable app serving three surfaces (customer, driver, admin) from one Lovable Cloud backend. Full end-to-end skeleton: every core flow wired, payments stubbed, real map tracking, real auth, real database. Depth per feature is deliberately shallow so the whole system stands up in one build.

## Design direction

- Mobile-first PWA, Uber-style clean UI
- Brand: Zap Gas — deep navy + electric yellow/lime accent (energy/gas theme), rounded, high contrast
- Typography: Space Grotesk (display) + Inter (body)
- Bottom-tab nav for customer & driver apps; sidebar for admin
- Dark-friendly semantic tokens in `src/styles.css`

## Backend (Lovable Cloud)

Enable Cloud. Tables (all with RLS + user_roles pattern):

- `profiles` — id (auth.users), full_name, phone, avatar_url
- `user_roles` — user_id, role enum (`customer`, `driver`, `admin`)
- `addresses` — user_id, label, lat, lng, formatted_address, is_default
- `cylinder_sizes` — enum-ish reference (9kg, 19kg, 48kg) with base_price
- `orders` — customer_id, driver_id, cylinder_size, qty, address_id, status (pending/assigned/en_route/arriving/delivered/cancelled), urgent, eta, total, loyalty_applied, created_at
- `order_events` — order_id, status, note, lat, lng, created_at (tracking timeline)
- `proof_of_delivery` — order_id, photo_url, signature_url, delivered_at
- `subscriptions` — customer_id, plan (2/3 cyl), cylinder_size, billing_cycle, usage_frequency_days, next_refill_date, status
- `subscription_refills` — subscription_id, scheduled_date, order_id, status
- `loyalty_credits` — customer_id, credits, lifetime_earned, free_cylinders_redeemed
- `loyalty_events` — customer_id, type (earn/redeem), order_id, created_at
- `driver_locations` — driver_id, lat, lng, updated_at (realtime)
- `notifications` — user_id, title, body, read, created_at
- `support_messages` — user_id, from_role, message, created_at

Storage buckets: `pod-photos`, `signatures`, `avatars`.

Realtime enabled on `orders`, `order_events`, `driver_locations` for live tracking.

Server functions (`createServerFn`): create order, assign driver, update order status, run loyalty ledger, compute next refill date, admin actions.

## Auth

- Email/password + Google OAuth (via `lovable.auth.signInWithOAuth`)
- `supabase--configure_social_auth` for Google
- `/auth` public route (sign in / sign up)
- `_authenticated/` protected subtree
- On first sign-up: role defaults to `customer`; admin promotes drivers/admins from dashboard

## Google Maps

Enable connector. Uses:
- Customer: address geocoding + autocomplete, live driver map on order tracking
- Driver: navigation link out to Google Maps app
- Admin: fleet map view

## Routes

Customer (mobile PWA, bottom tabs):
- `/` — landing + auth CTA (public marketing)
- `/auth` — sign in/up
- `/app` — home: quick order + subscription status + loyalty progress
- `/app/order` — new on-demand order flow (size → address → confirm)
- `/app/order/$id` — live tracking with map + status timeline
- `/app/orders` — history
- `/app/subscription` — manage plan, next refill, billing history
- `/app/subscription/new` — sign up for 2 or 3 cylinder plan
- `/app/loyalty` — credits, progress bar, history
- `/app/profile` — addresses, payment methods (stub), notifications, support

Driver (`/driver/*`, role-gated):
- `/driver` — today's deliveries
- `/driver/job/$id` — job detail, status updates, POD capture
- `/driver/history` — completed jobs + basic stats

Admin (`/admin/*`, role-gated, sidebar):
- `/admin` — dashboard KPIs
- `/admin/orders` — all orders, assign driver, change status
- `/admin/subscriptions` — active plans, upcoming refills
- `/admin/drivers` — driver list + fleet map
- `/admin/customers` — customer list, loyalty balances
- `/admin/loyalty` — global loyalty ledger
- `/admin/support` — inbox

## Loyalty logic

Server function fires on order `delivered`:
1. If order was flagged `loyalty_applied=true`, log redeem event; do NOT earn credit
2. Otherwise increment `credits` and log earn event; if credits hit 10, reset to 0, increment `free_cylinders_redeemed`, notify user, mark next eligible order to apply discount

## Subscription refill scheduling

Simple heuristic: at signup, `next_refill_date = today + usage_frequency_days`. After each swap delivery, `next_refill_date = delivered_at + usage_frequency_days - 3` (3-day buffer). Daily cron simulated via server fn admin can trigger; production cron optional later.

## Payments (stubbed)

Payment step in checkout shows a mock card form + "Pay (stub)" button; writes `payment_status='mock_paid'`. Same for subscription billing. Clear TODO markers to swap for Stripe later.

## Notifications

In-app notifications table + toast on realtime insert. Web Push deferred (needs service worker + VAPID; called out as follow-up).

## PWA

Manifest-only installability (name, icons, theme, standalone). No offline SW in v1 — matches PWA skill default.

## Out of scope for v1 (called out in UI/comments)

- Real payment processing
- SMS/email delivery of notifications
- Push notifications
- Route optimization
- Complex depletion ML — heuristic only

## Technical notes

- TanStack Start file-based routes; `_authenticated/` uses managed layout
- TanStack Query for all data reads
- Realtime subscriptions for order tracking + driver location
- shadcn components themed via `styles.css` tokens; no ad-hoc colors
- Zod validation on all server fn inputs
- Seed: default cylinder sizes + one demo admin note in README

## Build order

1. Cloud enable + Google Maps + Google social auth
2. Schema migration + RLS + roles + seed
3. Design system in `styles.css` + shared layout shells
4. Auth pages + role bootstrap
5. Customer: home, order flow, tracking, history
6. Loyalty module
7. Subscription module
8. Driver app
9. Admin dashboard
10. PWA manifest + polish + landing page + SEO metadata

This is a large first pass — expect to iterate on each surface after review.
