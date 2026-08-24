# PHASE 2 — Map-First Marketplace + Payout Truth

Runs AFTER: current 8.24 batch closes + shipping flow re-test passes.
Decided Aug 24 (Michael): webhook work joins the map/marketplace batch.

## 1. Map V1 — full spec in MAP-V1.md (build-ready, all decisions locked)
- Mobile: full-bleed Zillow-style map mode, floating search + filter ② (no pill bar),
  collapsed results sheet ("23 results"), tap-a-pin floating tile (tap-only; swipe = V2)
- Search-gated entry (Airbnb play): grid default, map opens after a search
- Basemap: outdoors-v12 (one-line swap) + pin size bump
- Viewport-aware result count on moveend (client-side, ~10 lines)
- Desktop: full-height map mode, floating search top-left, "Show list" top-right,
  restyled pin-anchored popup card, results chip bottom-center
- Keep map instance warm between grid/map toggles

## 2. Stripe payout webhooks — exact "Paid" state (~half day)
- New Connect-event webhook endpoint: payout.paid + payout.failed (fires on the
  HOST's connected account, not platform — separate endpoint config in Stripe)
- Correlation: unpack which transfers/bookings are inside each bank deposit
  (balance transaction listing per payout — same bundling logic as /dashboard/payouts)
- On payout.paid → stamp bookings paid_out_at → Earnings pill "Paid" becomes exact
  (replaces the 7-day approximation shipped 8/24, commit add69bc)
- On payout.failed → surface to host + admin (notification, not silent)
- Keep strict fail-closed signature verification (same standard as checkout webhook)

## 3. Marketplace polish riding along
- Listing card grid: hover states / consistency pass vs new map cards
- Restricted dates shown on public listing calendar (was shelved, fits here)

## Explicitly NOT Phase 2 (→ Phase 3 / backlog)
- Map V2: desktop split view (Zillow map-left/list-right, pin↔card hover sync),
  draggable bottom sheet, swipe carousel tile, search-as-you-move, clustering,
  custom Mapbox Studio brand style
- Auto-refund for unfulfilled bookings (cron + 100% guarantee) — scheduled with
  status-label language pass, per earlier roadmap
- Moderate security: /api/notify auth, server-side min/max days, admin auth upgrade
- Message consolidation (thread by user pair)

## Sequencing
1. Close out 8.24 batch (⋮ dropdown clipping, delivery instructions on booking
   confirmation page) → Michael re-tests shipping flow end-to-end
2. Go-live prereqs when first client confirms: Vercel Pro + Supabase Pro
3. Phase 2 batch day: map V1 first (biggest visible win), webhook second,
   polish last
