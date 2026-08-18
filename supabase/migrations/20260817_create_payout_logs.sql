-- ============================================================================
-- Migration: payout_logs table
-- Created: 2026-08-17
-- Purpose: Persist payout event logs written by /api/stripe/payout
--
-- HOW TO RUN: Execute manually in the Supabase SQL Editor (Dashboard → SQL).
-- This file is NOT auto-applied by any CI/CD pipeline.
--
-- The existing payout route (app/api/stripe/payout/route.ts) already inserts
-- into this table — it catches the error if the table doesn't exist yet.
-- Once this migration runs, those inserts will start persisting.
-- ============================================================================

CREATE TABLE IF NOT EXISTS payout_logs (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id    uuid          NOT NULL,
  host_id       uuid          NOT NULL,
  stripe_transfer_id text     NOT NULL,
  amount        numeric(10,2) NOT NULL,
  status        text          NOT NULL DEFAULT 'completed',
  created_at    timestamptz   NOT NULL DEFAULT now()
);

-- Indexes for common admin queries
CREATE INDEX IF NOT EXISTS payout_logs_booking_id_idx ON payout_logs (booking_id);
CREATE INDEX IF NOT EXISTS payout_logs_host_id_idx    ON payout_logs (host_id);
CREATE INDEX IF NOT EXISTS payout_logs_created_at_idx ON payout_logs (created_at DESC);

-- RLS: enabled, service-role-only (no user-facing policies)
ALTER TABLE payout_logs ENABLE ROW LEVEL SECURITY;
-- No RLS policies = only the service role key can read/write.
