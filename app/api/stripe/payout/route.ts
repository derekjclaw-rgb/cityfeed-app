/**
 * /api/stripe/payout — Escrow payout trigger
 *
 * ESCROW MODEL: Money stays in City Feed's platform account after checkout.
 * This route transfers funds to the host ONLY after they upload Proof of Posting (POP).
 * Called automatically by the POP upload flow in bookings/[id]/page.tsx.
 *
 * Flow:
 *   1. Advertiser pays → money goes to City Feed platform (no destination charge)
 *   2. Host uploads POP → this route fires → stripe.transfers.create() to host
 *   3. Host gets paid, advertiser is protected
 *
 * Safety: If host never uploads POP, money stays in platform. Cron can auto-refund.
 */
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { getBookingFinancials } from '@/lib/fees'

function getStripe() { return new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2026-02-25.clover' }) }
function getSupabase() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '') }
export async function POST(req: NextRequest) {
  const stripe = getStripe()
  const supabase = getSupabase()
  try {
    const { booking_id } = await req.json()

    if (!booking_id) {
      return NextResponse.json({ error: 'Missing booking_id' }, { status: 400 })
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
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // SECURITY: Status guard — only pay out eligible bookings
    // 'completed' included as safety net (idempotency guard prevents double payouts)
    const PAYOUT_ELIGIBLE = ['confirmed', 'active', 'pop_pending', 'pop_review', 'completed']
    if (!PAYOUT_ELIGIBLE.includes(booking.status)) {
      return NextResponse.json({ error: `Booking status "${booking.status}" is not eligible for payout` }, { status: 400 })
    }

    // SECURITY: Idempotency guard — prevent double payouts
    if (booking.stripe_transfer_id) {
      return NextResponse.json({ error: 'Payout already processed', transfer_id: booking.stripe_transfer_id }, { status: 409 })
    }

    // SECURITY: POP guard — must have proof of posting before releasing funds
    // Check storage bucket (where POP files actually live), not pop_submissions table
    const { data: popFiles, error: popListError } = await supabase.storage
      .from('booking-collateral')
      .list(`pop/${booking_id}`, { limit: 1 })

    const hasPOP = !popListError && popFiles && popFiles.length > 0
    if (!hasPOP) {
      return NextResponse.json({ error: 'No proof of posting submitted — cannot release funds' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const host = (booking as any).host
    const stripeAccountId = host?.stripe_account_id

    if (!stripeAccountId) {
      return NextResponse.json({ error: 'Host has not connected Stripe account' }, { status: 400 })
    }

    // Payout comes from the SINGLE SOURCE OF TRUTH (lib/fees.ts):
    // stored itemized amounts → hostPayout = (subtotal + print fee) − seller fee.
    // Legacy bookings (no stored columns) derive under the old fee model.
    const fin = getBookingFinancials(booking)
    const payoutAmount = Math.round(fin.hostPayout * 100) // cents

    if (payoutAmount <= 0) {
      return NextResponse.json({ error: 'Payout amount too low' }, { status: 400 })
    }

    // Create a Stripe Transfer to the host's account
    const transfer = await stripe.transfers.create({
      amount: payoutAmount,
      currency: 'usd',
      destination: stripeAccountId,
      metadata: {
        booking_id: booking_id,
        host_id: booking.host_id,
        listing_title: (booking as Record<string, unknown> & { listings?: { title?: string } }).listings?.title ?? '',
      },
    })

    // Update booking with EXACT amounts from Stripe response (not calculated estimates)
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'completed',
        stripe_transfer_id: transfer.id,
        payout_amount: transfer.amount / 100, // exact cents from Stripe
        payout_at: new Date(transfer.created * 1000).toISOString(), // Stripe epoch → ISO
      })
      .eq('id', booking_id)

    if (updateError) {
      console.error('[Payout] Failed to update booking:', updateError)
    }

    // Log payout event
    await supabase.from('payout_logs').insert({
      booking_id,
      host_id: booking.host_id,
      stripe_transfer_id: transfer.id,
      amount: payoutAmount / 100,
      status: 'completed',
      created_at: new Date().toISOString(),
    }).then(({ error }) => {
      if (error) console.warn('[Payout] Log insert failed (table may not exist yet):', error.message)
    })

    const listingTitle = (booking as Record<string, unknown> & { listings?: { title?: string } }).listings?.title ?? 'your listing'

    // Host confirmation email — sent SERVER-SIDE here (2026-08-15) because the old
    // client-side send from the POP upload flow was unreliable (never arrived).
    // Includes the exact NET payout amount from the Stripe transfer — no fee itemization.
    // Single email: pop_approved stays dead (Michael killed it 2026-08-10).
    try {
      const { data: hostProfile } = await supabase
        .from('profiles').select('email').eq('id', booking.host_id).single()
      if (hostProfile?.email) {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.cityfeed.io'
        await fetch(`${baseUrl}/api/email/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'pop_submitted_host',
            hostEmail: hostProfile.email,
            listingTitle,
            bookingId: booking_id,
            amount: transfer.amount / 100,
          }),
        }).catch(err => console.warn('[Payout] Host POP email failed:', err))
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
      href: `/dashboard/bookings/${booking_id}`,
    }).then(({ error }) => {
      if (error) console.warn('[Payout] Notification insert failed:', error.message)
    })

    return NextResponse.json({
      success: true,
      transfer_id: transfer.id,
      payout_amount: payoutAmount / 100,
    })
  } catch (err) {
    console.error('[Payout] Error:', err)
    const message = err instanceof Error ? err.message : 'Failed to process payout'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
