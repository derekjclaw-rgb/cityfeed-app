# City Feed — Security & Tech Debt Fixes

Last updated: July 24, 2026

## ✅ Completed (July 24, 2026)

### 1. Server-side checkout total validation
- Server recalculates total from `listings.price_per_day` in the database
- Client-provided `total` is ignored for real listings
- Prevents price manipulation via network request tampering

### 2. Payout endpoint triple guard
- **Status guard:** Only pays out bookings in `confirmed`, `active`, `pop_pending`, `pop_review`
- **Idempotency guard:** Blocks if `stripe_transfer_id` already exists (no double payouts)
- **POP guard:** Queries `pop_submissions` — no proof of posting, no money released

### 3. Listing update ownership check
- Compares `userId` to `listing.host_id` — returns 403 if mismatch
- Only the host can edit their own listing

---

## 🟡 Fix Soon (before marketing push)

### 4. Webhook signature verification
- **Issue:** Falls through to unverified JSON parse if Stripe signature fails
- **Risk:** Attacker could forge `checkout.session.completed` events to create fake bookings
- **Fix:** Remove the unverified fallback paths; require valid signature in production
- **Effort:** ~30 min

### 5. Upload endpoints — add auth
- **Issue:** `/api/listings/upload-image` and `/api/collateral/upload` accept any request — no authentication
- **Risk:** Anyone can upload files to Supabase Storage; client controls storage path
- **Fix:** Verify Supabase auth session before processing upload; validate file type + size
- **Effort:** ~45 min

### 6. Email endpoint — add auth
- **Issue:** `/api/email/send` is open — anyone can trigger any email type to any address
- **Risk:** Can be abused for spam
- **Fix:** Require valid auth session or internal secret
- **Effort:** ~15 min

### 7. Fee constants consolidation
- **Issue:** `0.07` hardcoded in checkout, payout, email, admin-finance instead of importing `BUYER_FEE_PCT`/`SELLER_FEE_PCT` from `lib/constants.ts`
- **Risk:** If fees ever change, 4+ files need manual updates — easy to miss one
- **Fix:** Import from constants everywhere; single source of truth
- **Files:** `app/api/checkout/route.ts`, `app/api/stripe/payout/route.ts`, `lib/email.ts`, `lib/admin-finance.ts`
- **Effort:** ~30 min

---

## 🟢 Fix Later (when there's real volume)

### 8. Auto-refund cron for stale escrow
- **Issue:** If host never uploads POP, advertiser's money sits in City Feed's Stripe account forever
- **Fix:** 30-day cron — if no POP after 30 days, auto-refund advertiser + notify both parties
- **Effort:** ~1 hr

### 9. Admin auth upgrade
- **Issue:** Admin login is a shared password; cookie value is literal string `'authenticated'`; no session tokens, no CSRF protection
- **Fix:** Generate random session tokens, store server-side, rotate on login
- **Effort:** ~1 hr

### 10. Rate limiting
- **Issue:** No rate limiting on any API endpoint
- **Fix:** Add rate limiting middleware (IP-based for public endpoints, user-based for authenticated)
- **Effort:** ~1 hr

---

## 📝 Notes
- Items 1-3 were identified and fixed during the July 24 codebase audit
- Items 4-7 should be tackled before any public marketing or paid acquisition
- Items 8-10 are scale problems — fix when transaction volume warrants it
- Full audit docs: `memory/cityfeed-audit/` (schema, Stripe, routes, API, components)
