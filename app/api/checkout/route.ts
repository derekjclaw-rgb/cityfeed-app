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

    if (!isMockListing) {
      // Create a real booking record for real listings
      // Look up the listing to get the host_id
      const { data: listing } = await supabase
        .from('listings')
        .select('host_id')
        .eq('id', listingId)
        .single()

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          listing_id: listingId,
          advertiser_id: userId,
          host_id: listing?.host_id,
          start_date: startDate,
          end_date: endDate,
          total_price: total,
          platform_fee: Math.round(days * pricePerDay * 0.07 * 100) / 100,
          status: 'pending',
        })
        .select('id')
        .single()

      if (bookingError) {
        console.error('Booking insert error:', bookingError)
        return NextResponse.json({ error: bookingError.message }, { status: 500 })
      }
      bookingId = booking.id
    }

    // Create Stripe Checkout session
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
