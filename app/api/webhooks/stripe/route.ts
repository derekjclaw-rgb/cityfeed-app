import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2026-02-25.clover' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    // Dev fallback: process without signature verification
    console.warn('[Stripe Webhook] No signature or secret — processing without verification (dev only)')
    try {
      const event = JSON.parse(body) as Stripe.Event
      await handleEvent(event)
      return NextResponse.json({ received: true })
    } catch {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  await handleEvent(event)
  return NextResponse.json({ received: true })
}

async function handleEvent(event: Stripe.Event) {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const bookingId = session.metadata?.booking_id

    if (!bookingId) {
      console.error('No booking_id in session metadata')
      return
    }

    // Update booking status to confirmed
    const { data: booking, error } = await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        stripe_session_id: session.id,
        stripe_payment_intent: session.payment_intent as string,
      })
      .eq('id', bookingId)
      .select('*, listings(title, host_id), profiles!advertiser_id(full_name)')
      .single()

    if (error) {
      console.error('Failed to update booking:', error)
      return
    }

    console.log(`[Stripe Webhook] Booking ${bookingId} confirmed`)

    // Trigger email notifications
    if (booking) {
      sendEmail({
        type: 'booking_confirmed',
        advertiserEmail: 'advertiser@example.com', // Phase 4: pull from profile
        listingTitle: booking.listings?.title ?? 'your listing',
        dates: `${booking.start_date} → ${booking.end_date}`,
        total: booking.total_amount,
      })
    }
  }
}
