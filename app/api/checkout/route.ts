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
    let hostId: string | null = null
    let buyNowEnabled = false

    if (!isMockListing) {
      // Check date availability BEFORE creating the Stripe session (prevents phantom blocked dates)
      const { data: conflictingBookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('listing_id', listingId)
        .neq('status', 'cancelled')
        .lte('start_date', endDate)
        .gte('end_date', startDate)
        .limit(1)

      if (conflictingBookings && conflictingBookings.length > 0) {
        return NextResponse.json({ error: 'These dates are no longer available' }, { status: 409 })
      }

      // Look up the listing to get host_id and buy_now_enabled
      const { data: listing } = await supabase
        .from('listings')
        .select('host_id, buy_now_enabled')
        .eq('id', listingId)
        .single()

      hostId = listing?.host_id ?? null
      buyNowEnabled = listing?.buy_now_enabled ?? false

      // Fetch host's Stripe connected account for destination charges
      if (hostId) {
        const { data: hostProfile } = await supabase
          .from('profiles')
          .select('stripe_account_id')
          .eq('id', hostId)
          .single()
        hostStripeAccountId = hostProfile?.stripe_account_id ?? null
      }
    }

    // Truncate listing title to stay within Stripe metadata 500-char-per-value limit
    const safeTitleForMeta = (listingTitle ?? '').slice(0, 490)

    // Create Stripe Checkout session. Booking is NOT created yet — it will be created in the
    // webhook handler AFTER payment succeeds, preventing phantom/orphaned bookings.
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
      // booking_id=pending — the real ID is unknown until the webhook creates it post-payment
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://cityfeed-app.vercel.app'}/booking/success?session_id={CHECKOUT_SESSION_ID}&booking_id=pending`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://cityfeed-app.vercel.app'}/marketplace/${listingId}/book`,
      metadata: {
        listing_id: listingId,
        user_id: userId,
        host_id: hostId ?? '',
        start_date: startDate,
        end_date: endDate,
        days: String(days),
        price_per_day: String(pricePerDay),
        total: String(total),
        platform_fee: String(platformFee),
        buy_now_enabled: String(buyNowEnabled),
        listing_title: safeTitleForMeta,
        is_mock: String(isMockListing),
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Checkout error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
