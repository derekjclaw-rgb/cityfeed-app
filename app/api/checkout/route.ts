import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

function getStripe() { return new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2026-02-25.clover' }) }
function getSupabase() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '') }
export async function POST(req: NextRequest) {
  const stripe = getStripe()
  const supabase = getSupabase()
  try {
    const body = await req.json()
    const { listingId, startDate, endDate, days, total, userId, listingTitle, pricePerDay } = body

    if (!listingId || !startDate || !endDate || !userId || !total) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if this is a mock listing (simple numeric ID vs UUID)
    const isMockListing = /^\d+$/.test(listingId)
    let bookingId = `mock-${listingId}-${Date.now()}`

    // Calculate fees up front
    // subtotal = days * pricePerDay (base cost before buyer fee)
    // buyer fee = 7% of subtotal (charged to advertiser on top of subtotal)
    // seller fee = 7% of subtotal (deducted from host payout)
    // City Feed keeps both fees via Stripe Connect application_fee_amount
    const subtotal = days * pricePerDay
    const buyerFee = Math.round(subtotal * 0.07 * 100) / 100
    const sellerFee = Math.round(subtotal * 0.07 * 100) / 100
    const applicationFeeCents = Math.round((buyerFee + sellerFee) * 100)
    const platformFee = Math.round((buyerFee + sellerFee) * 100) / 100

    let hostStripeAccountId: string | null = null

    if (!isMockListing) {
      // Create a real booking record for real listings
      // Look up the listing to get the host_id and buy_now_enabled
      const { data: listing } = await supabase
        .from('listings')
        .select('host_id, buy_now_enabled')
        .eq('id', listingId)
        .single()

      // Fetch host's Stripe connected account for destination charges
      if (listing?.host_id) {
        const { data: hostProfile } = await supabase
          .from('profiles')
          .select('stripe_account_id')
          .eq('id', listing.host_id)
          .single()
        hostStripeAccountId = hostProfile?.stripe_account_id ?? null
      }

      // If buy_now_enabled, skip host approval — set to confirmed immediately
      const initialStatus = listing?.buy_now_enabled ? 'confirmed' : 'pending'

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          listing_id: listingId,
          advertiser_id: userId,
          host_id: listing?.host_id,
          start_date: startDate,
          end_date: endDate,
          total_price: total,
          // platform_fee = buyer fee (7%) + seller fee (7%) — City Feed's total cut
          platform_fee: platformFee,
          status: initialStatus,
        })
        .select('id')
        .single()

      if (bookingError) {
        console.error('Booking insert error:', bookingError)
        return NextResponse.json({ error: bookingError.message }, { status: 500 })
      }
      bookingId = booking.id
    }

    // Create Stripe Checkout session with destination charges.
    // If the host has connected their Stripe account, Stripe automatically splits the payment:
    //   - City Feed keeps application_fee_amount (buyer fee + seller fee)
    //   - The remainder is transferred to the host's connected account immediately
    // If the host has NOT connected Stripe yet, the full amount goes to the platform (fallback).
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: listingTitle,
              description: `Ad placement booking: ${startDate} → ${endDate} (${days} days)`,
            },
            unit_amount: Math.round(total * 100), // cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      // Destination charge: auto-split payment to host at checkout time
      ...(hostStripeAccountId ? {
        payment_intent_data: {
          application_fee_amount: applicationFeeCents, // City Feed keeps this (buyer fee + seller fee)
          transfer_data: {
            destination: hostStripeAccountId, // Host receives the remainder automatically
          },
        },
      } : {}),
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://cityfeed-app.vercel.app'}/booking/success?session_id={CHECKOUT_SESSION_ID}&booking_id=${bookingId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://cityfeed-app.vercel.app'}/marketplace/${listingId}/book`,
      metadata: {
        booking_id: bookingId,
        listing_id: listingId,
        user_id: userId,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Checkout error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
