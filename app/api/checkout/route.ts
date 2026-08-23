import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { computeBookingFinancials, bookingDays } from '@/lib/fees'

function getStripe() { return new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2026-02-25.clover' }) }
function getSupabase() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '') }

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  const supabase = getSupabase()
  try {
    const body = await req.json()
    const { listingId, startDate, endDate, total, userId, listingTitle, pricePerDay, host_prints, print_fee } = body

    if (!listingId || !startDate || !endDate || !userId || !total) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // SERVER-SIDE DAY COUNT — never trust client-provided `days`.
    // A tampered payload could send days=1 with a month-long date range and
    // get the full range stored while paying for one day. Recompute from dates.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || endDate < startDate) {
      return NextResponse.json({ error: 'Invalid dates' }, { status: 400 })
    }
    const days = bookingDays(startDate, endDate)

    // Check if this is a mock listing (simple numeric ID vs UUID)
    const isMockListing = /^\d+$/.test(listingId)

    // Fee model (see lib/fees.ts): 7% buyer + 7% seller fee, both on
    // (subtotal + print fee). Computed ONCE here, stored on the booking,
    // and read everywhere else. City Feed holds funds in escrow until POP.
    let fin = computeBookingFinancials(pricePerDay, days, host_prints && print_fee ? Number(print_fee) : 0)

    let hostId: string | null = null
    let buyNowEnabled = false

    if (!isMockListing) {
      // Check date availability BEFORE creating the Stripe session (prevents phantom blocked dates)
      const { data: conflictingBookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('listing_id', listingId)
        .in('status', ['pending', 'confirmed', 'active', 'pop_pending', 'pop_review', 'completed'])
        .lte('start_date', endDate)
        .gte('end_date', startDate)
        .limit(1)

      if (conflictingBookings && conflictingBookings.length > 0) {
        return NextResponse.json({ error: 'These dates are no longer available' }, { status: 409 })
      }

      // Look up the listing to get host_id, buy_now_enabled, and print fields
      const { data: listing } = await supabase
        .from('listings')
        .select('host_id, buy_now_enabled, requires_print, offers_printing, print_fee, price_per_day')
        .eq('id', listingId)
        .single()

      hostId = listing?.host_id ?? null
      buyNowEnabled = listing?.buy_now_enabled ?? false

      // SERVER-SIDE PRICE VALIDATION — never trust client-provided numbers.
      // Recompute everything from the listing's actual DB values.
      if (listing?.price_per_day != null) {
        const wantsHostPrint = !!host_prints
        const serverPrintFee = (wantsHostPrint && listing.offers_printing && listing.print_fee) ? Number(listing.print_fee) : 0
        fin = computeBookingFinancials(Number(listing.price_per_day), days, serverPrintFee)
      }

      // Note: host's Stripe account is not needed at checkout time (escrow model)
      // Payout happens later via /api/stripe/payout after POP upload
    }

    const hostPrintsRequested = !!host_prints

    // Truncate listing title to stay within Stripe metadata 500-char-per-value limit
    const safeTitleForMeta = (listingTitle ?? '').slice(0, 490)

    // ESCROW MODEL: Money stays in City Feed's platform account until host uploads
    // Proof of Posting (POP). Only then does /api/stripe/payout transfer funds to host.
    // This protects advertisers — no POP = no payment to host.
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
            unit_amount: Math.round(fin.advertiserTotal * 100), // cents — server-computed total
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      // NO destination charge — money stays in platform (escrow) until POP is uploaded
      // Payout to host is triggered by /api/stripe/payout after POP upload
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
        total: String(fin.advertiserTotal),
        platform_fee: String(fin.platformRevenue),
        subtotal: String(fin.subtotal),
        buyer_fee: String(fin.buyerFee),
        seller_fee: String(fin.sellerFee),
        buy_now_enabled: String(buyNowEnabled),
        listing_title: safeTitleForMeta,
        is_mock: String(isMockListing),
        host_prints: String(hostPrintsRequested),
        print_fee: String(fin.printFee),
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Checkout error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
