/**
 * lib/payout.ts — Extracted payout logic for server-side callers.
 *
 * Shared by:
 *   - /api/stripe/payout (HTTP route, for client-side POP upload flow)
 *   - /api/cron/auto-approve (direct function import, no HTTP round-trip)
 *
 * ESCROW MODEL: Money stays in City Feed's platform account after checkout.
 * This function transfers funds to the host ONLY after Proof of Posting (POP).
 */
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { getBookingFinancials } from '@/lib/fees'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2026-02-25.clover' })
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )
}

export interface PayoutResult {
  success: boolean
  transfer_id?: string
  payout_amount?: number
  error?: string
  status?: number
  already_paid?: boolean
}

/**
 * Process payout for a booking. Idempotent — returns early if already paid.
 *
 * Callers: cron auto-approve (direct import), POP upload flow (via HTTP route).
 */
export async function processBookingPayout(bookingId: string): Promise<PayoutResult> {
  const stripe = getStripe()
  const supabase = getSupabase()

  if (!bookingId) {
    return { success: false, error: 'Missing booking_id', status: 400 }
  }

  // Fetch booking with host profile
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select(`
      id, total_price, platform_fee, subtotal, buyer_fee, seller_fee, print_fee_charged,
      status, stripe_payment_intent_id, stripe_transfer_id,
      host_id, advertiser_id,
      host:profiles!bookings_host_id_fkey(stripe_account_id, full_name),
      listings(title)
    `)
    .eq('id', bookingId)
    .single()

  if (bookingError || !booking) {
    return { success: false, error: 'Booking not found', status: 404 }
  }

  // SECURITY: Status guard — only pay out eligible bookings
  const PAYOUT_ELIGIBLE = ['confirmed', 'active', 'pop_pending', 'pop_review', 'completed']
  if (!PAYOUT_ELIGIBLE.includes(booking.status)) {
    return { success: false, error: `Booking status "${booking.status}" is not eligible for payout`, status: 400 }
  }

  // SECURITY: Idempotency guard — prevent double payouts
  if (booking.stripe_transfer_id) {
    return { success: true, transfer_id: booking.stripe_transfer_id, already_paid: true }
  }

  // SECURITY: POP guard — must have proof of posting before releasing funds
  const { data: popFiles, error: popListError } = await supabase.storage
    .from('booking-collateral')
    .list(`pop/${bookingId}`, { limit: 1 })

  const hasPOP = !popListError && popFiles && popFiles.length > 0
  if (!hasPOP) {
    return { success: false, error: 'No proof of posting submitted — cannot release funds', status: 400 }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const host = (booking as any).host
  const stripeAccountId = host?.stripe_account_id

  if (!stripeAccountId) {
    return { success: false, error: 'Host has not connected Stripe account', status: 400 }
  }

  const fin = getBookingFinancials(booking)
  const payoutAmount = Math.round(fin.hostPayout * 100) // cents

  if (payoutAmount <= 0) {
    return { success: false, error: 'Payout amount too low', status: 400 }
  }

  // Create a Stripe Transfer to the host's account
  const transfer = await stripe.transfers.create({
    amount: payoutAmount,
    currency: 'usd',
    destination: stripeAccountId,
    metadata: {
      booking_id: bookingId,
      host_id: booking.host_id,
      listing_title: (booking as Record<string, unknown> & { listings?: { title?: string } }).listings?.title ?? '',
    },
  })

  // Update booking with EXACT amounts from Stripe response
  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      status: 'completed',
      stripe_transfer_id: transfer.id,
      payout_amount: transfer.amount / 100,
      payout_at: new Date(transfer.created * 1000).toISOString(),
    })
    .eq('id', bookingId)

  if (updateError) {
    console.error('[Payout] Failed to update booking:', updateError)
  }

  // Log payout event
  await supabase.from('payout_logs').insert({
    booking_id: bookingId,
    host_id: booking.host_id,
    stripe_transfer_id: transfer.id,
    amount: payoutAmount / 100,
    status: 'completed',
    created_at: new Date().toISOString(),
  }).then(({ error }) => {
    if (error) console.warn('[Payout] Log insert failed (table may not exist yet):', error.message)
  })

  const listingTitle = (booking as Record<string, unknown> & { listings?: { title?: string } }).listings?.title ?? 'your listing'

  // Host confirmation email — sent SERVER-SIDE (2026-08-15)
  try {
    const { data: hostProfile } = await supabase
      .from('profiles').select('email').eq('id', booking.host_id).single()
    if (hostProfile?.email) {
      const { sendEmail } = await import('@/lib/email')
      await sendEmail({
        type: 'pop_submitted_host',
        hostEmail: hostProfile.email,
        listingTitle,
        bookingId,
        amount: transfer.amount / 100,
      })
    }
  } catch (err) {
    console.warn('[Payout] Host POP email error (non-fatal):', err)
  }

  // Payout notification via dashboard
  await supabase.from('notifications').insert({
    user_id: booking.host_id,
    type: 'payout_initiated',
    title: 'Payout initiated',
    body: `$${(payoutAmount / 100).toFixed(2)} payout for "${listingTitle}" is on its way.`,
    href: `/dashboard/bookings/${bookingId}`,
  }).then(({ error }) => {
    if (error) console.warn('[Payout] Notification insert failed:', error.message)
  })

  return {
    success: true,
    transfer_id: transfer.id,
    payout_amount: payoutAmount / 100,
  }
}
