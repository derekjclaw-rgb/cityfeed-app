import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

function getStripe() { return new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2026-02-25.clover' }) }
function getSupabase() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '') }

/**
 * GET /api/checkout/booking-status?session_id=cs_xxx
 *
 * After a successful Stripe Checkout, the booking is created by the webhook
 * (asynchronously). The success page calls this endpoint to find the real
 * booking_id by looking up the payment_intent on the session and matching
 * it against the bookings table.
 *
 * Returns { booking_id: string } once the webhook has created it, or
 * { pending: true } while still waiting (client should retry).
 */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id')
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
  }

  try {
    const stripe = getStripe()
    const supabase = getSupabase()

    // Retrieve the Stripe Checkout Session to get the payment_intent
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    const paymentIntentId = session.payment_intent as string | null

    if (!paymentIntentId) {
      // Session exists but no payment_intent yet — still processing
      return NextResponse.json({ pending: true })
    }

    // Look for a booking created with this payment_intent (by the webhook)
    const { data: booking } = await supabase
      .from('bookings')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .maybeSingle()

    if (booking?.id) {
      return NextResponse.json({ booking_id: booking.id })
    }

    // Webhook hasn't fired yet — client should retry
    return NextResponse.json({ pending: true })
  } catch (err) {
    console.error('[booking-status] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
