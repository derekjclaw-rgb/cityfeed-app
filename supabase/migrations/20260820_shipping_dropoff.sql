-- 2026-08-20: Add dropped_off_at column for drop-off delivery tracking
-- Run this in the Supabase SQL Editor before deploying.
-- Existing columns delivery_mode, shipped_at, received_at, tracking_number already exist.

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS dropped_off_at timestamptz DEFAULT NULL;
