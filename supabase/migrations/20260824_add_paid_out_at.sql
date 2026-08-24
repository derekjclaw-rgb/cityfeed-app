-- Phase 2: exact payout truth (Aug 24, 2026)
-- Stamped by /api/webhooks/stripe-connect when Stripe fires payout.paid on a
-- host's connected account — the moment the bank deposit actually lands.
-- The Earnings pill shows exact "Paid" from this instead of a 7-day approximation.

alter table public.bookings
  add column if not exists paid_out_at timestamptz;

comment on column public.bookings.paid_out_at is
  'When the Stripe bank payout containing this booking''s transfer actually landed (payout.paid webhook). Null = not yet landed or pre-webhook legacy.';
