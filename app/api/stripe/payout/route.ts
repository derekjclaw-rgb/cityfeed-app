import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'

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
        id, total_price, platform_fee, status, stripe_payment_intent_id,
        host_id, advertiser_id,
        host:profiles!bookings_host_id_fkey(stripe_account_id, full_name),
        listings(title)
      `)
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const host = (booking as any).host
    const stripeAccountId = host?.stripe_account_id

    if (!stripeAccountId) {
      return NextResponse.json({ error: 'Host has not connected Stripe account' }, { status: 400 })
    }

    // Calculate payout: subtotal (pre-buyer-fee) - 7% seller fee
    // total_price = subtotal + buyer_fee (both are 7% of subtotal)
    // So subtotal = total_price - platform_fee
    const totalAmount = booking.total_price ?? 0
    const buyerFee = (booking as Record<string, unknown> & { platform_fee?: number }).platform_fee ?? Math.round(totalAmount / 1.07 * 0.07 * 100) / 100
    const subtotal = totalAmount - buyerFee
    const sellerFee = Math.round(subtotal * 0.07 * 100) // cents (7% of subtotal only)
    const payoutAmount = Math.round(subtotal * 100) - sellerFee // cents

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

    // Update booking with payout info and status completed
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'completed',
        stripe_transfer_id: transfer.id,
        payout_amount: payoutAmount / 100,
        payout_at: new Date().toISOString(),
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

    // Notify host via email
    const { data: hostProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', booking.host_id)
      .single()

    const listingTitle = (booking as Record<string, unknown> & { listings?: { title?: string } }).listings?.title ?? 'your listing'

    if (hostProfile?.email) {
      sendEmail({
        type: 'pop_approved',
        hostEmail: hostProfile.email,
        listingTitle,
        amount: payoutAmount / 100,
      }).catch(err => console.warn('[Payout] Email notification failed:', err))
    }

    // Auto-message in chat to confirm payout initiated
    const payoutMsg = `💰 Your payout of $${(payoutAmount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} has been initiated for "${listingTitle}". Funds will arrive in 2–3 business days.`
    await supabase.from('messages').insert({
      booking_id,
      sender_id: booking.advertiser_id,
      recipient_id: booking.host_id,
      content: payoutMsg,
    }).then(({ error }) => {
      if (error) console.warn('[Payout] Auto-message insert failed:', error.message)
    })

    return NextResponse.json({
      success: true,
      transfer_id: transfer.id,
      payout_amount: payoutAmount / 100,
    })
  } catch (err) {
    console.error('[Payout] Error:', err)
    return NextResponse.json({ error: 'Failed to process payout' }, { status: 500 })
  }
}
