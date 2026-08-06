-- Add sent_as_role to messages table
-- Tracks which dashboard mode (host/advertiser) the sender was in
-- Critical for self-booking conversations where sender_id = recipient_id
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sent_as_role text;
