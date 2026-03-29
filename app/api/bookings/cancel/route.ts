import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2026-02-25.clover' })
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )
}

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  const supabase = getSupabase()
  try {
    const { booking_id, reason, user_id } = await req.json()

    if (!booking_id || !user_id) {
      return NextResponse.json({ error: 'Missing booking_id or user_id' }, { status: 400 })
    }

    // Fetch booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, status, start_date, total_price, stripe_payment_intent, host_id, advertiser_id, listings(title)')
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Auth check: must be advertiser or host
    const isAdvertiser = booking.advertiser_id === user_id
    const isHost = booking.host_id === user_id
    if (!isAdvertiser && !isHost) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Can only cancel active/confirmed/pending bookings
    const cancellableStatuses = ['pending_payment', 'confirmed', 'active', 'pending']
    if (!cancellableStatuses.includes(booking.status)) {
      return NextResponse.json({ error: `Cannot cancel a booking with status: ${booking.status}` }, { status: 400 })
    }

    // Determine refund amount based on cancellation policy
    const now = new Date()
    const campaignStart = new Date(booking.start_date)
    const daysUntilStart = (campaignStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    const totalAmountCents = Math.round((booking.total_price ?? 0) * 100)

    let refundAmountCents = 0
    let refundPolicy = ''

    if (now >= campaignStart) {
      // Campaign already started — no refund
      refundAmountCents = 0
      refundPolicy = 'no_refund'
    } else if (daysUntilStart > 7) {
      // More than 7 days: full refund minus 5% processing fee
      refundAmountCents = Math.round(totalAmountCents * 0.95)
      refundPolicy = 'full_refund_minus_fee'
    } else {
      // Less than 7 days: 50% refund
      refundAmountCents = Math.round(totalAmountCents * 0.5)
      refundPolicy = 'half_refund'
    }

    let refundId: string | null = null

    // Process Stripe refund if applicable
    if (refundAmountCents > 0 && booking.stripe_payment_intent) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: booking.stripe_payment_intent,
          amount: refundAmountCents,
          reason: 'requested_by_customer',
          metadata: {
            booking_id,
            cancelled_by: user_id,
            policy: refundPolicy,
            reason: reason ?? 'Not provided',
          },
        })
        refundId = refund.id
      } catch (stripeErr) {
        console.error('[Cancel] Stripe refund error:', stripeErr)
        // Continue with cancellation even if refund fails — log the error
      }
    }

    // Update booking status
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: user_id,
        cancel_reason: reason ?? null,
        refund_id: refundId,
        refund_amount: refundAmountCents / 100,
        refund_policy: refundPolicy,
      })
      .eq('id', booking_id)

    if (updateError) {
      console.error('[Cancel] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
    }

    // If host cancelled, flag their profile (hosts who cancel frequently affect their reputation)
    if (isHost) {
      await supabase.rpc('increment_host_cancellations', { host_id: user_id }).then(({ error }) => {
        if (error) console.warn('[Cancel] Could not increment host cancellations (RPC may not exist):', error.message)
      })
    }

    return NextResponse.json({
      success: true,
      refund_amount: refundAmountCents / 100,
      refund_policy: refundPolicy,
      refund_id: refundId,
      message: refundAmountCents > 0
        ? `Booking cancelled. Refund of $${(refundAmountCents / 100).toFixed(2)} will appear in 5-10 business days.`
        : 'Booking cancelled. No refund applies per our cancellation policy.',
    })
  } catch (err) {
    console.error('[Cancel] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
