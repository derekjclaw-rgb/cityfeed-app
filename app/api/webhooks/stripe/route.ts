import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'

function getStripe() { return new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2026-02-25.clover' }) }
function getSupabase() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '') }

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  const supabase = getSupabase()
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.warn('[Stripe Webhook] No signature or secret — processing without verification')
    try {
      const event = JSON.parse(body) as Stripe.Event
      await handleEvent(event)
      return NextResponse.json({ received: true })
    } catch (err) {
      console.error('[Stripe Webhook] No-sig path error:', err)
      return NextResponse.json({ error: String(err) }, { status: 500 })
    }
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    // Signature verification failed — try parsing as v2 Event Destination format
    console.warn('[Stripe Webhook] Classic signature failed, attempting v2 parse:', (err as Error).message)
    try {
      event = JSON.parse(body) as Stripe.Event
      if (!event.type || !event.data) {
        return NextResponse.json({ error: 'Invalid event payload' }, { status: 400 })
      }
      console.log('[Stripe Webhook] Parsed as v2 event:', event.type)
    } catch {
      console.error('Webhook signature verification failed and v2 parse failed')
      return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
    }
  }

  try {
    await handleEvent(event)
    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[Stripe Webhook] handleEvent error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

async function handleEvent(event: Stripe.Event) {
  const supabase = getSupabase()

  console.log('[Stripe Webhook] Event type:', event.type)
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const meta = session.metadata ?? {}
    console.log('[Stripe Webhook] Metadata:', JSON.stringify(meta))
    console.log('[Stripe Webhook] booking_id in meta:', meta.booking_id)

    // ──────────────────────────────────────────────────────────────────────────
    // LEGACY PATH: session created before this fix — booking already exists.
    // Detect by presence of booking_id in metadata (old sessions had it set).
    // ──────────────────────────────────────────────────────────────────────────
    if (meta.booking_id && meta.booking_id !== 'pending') {
      const bookingId = meta.booking_id
      const { data: booking, error } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          stripe_payment_intent_id: session.payment_intent as string,
        })
        .eq('id', bookingId)
        .select('*, listings(title, host_id, images, category)')
        .single()

      if (error) {
        console.error('[Stripe Webhook] Legacy: Failed to update booking:', error)
        return
      }

      console.log(`[Stripe Webhook] Legacy booking ${bookingId} confirmed`)
      if (booking) await sendBookingNotifications(supabase, booking, bookingId, 'confirmed')
      return
    }

    // ──────────────────────────────────────────────────────────────────────────
    // NEW PATH: booking_id is absent or 'pending' — create the booking now.
    // ──────────────────────────────────────────────────────────────────────────
    const {
      listing_id: listingId,
      user_id: userId,
      host_id: hostId,
      start_date: startDate,
      end_date: endDate,
      total,
      platform_fee: platformFee,
      buy_now_enabled: buyNowEnabledStr,
      is_mock: isMockStr,
      host_prints: hostPrintsStr,
      print_fee: printFeeStr,
    } = meta

    // Skip booking creation for mock listings
    if (isMockStr === 'true') {
      console.log('[Stripe Webhook] Mock listing — skipping booking creation')
      return
    }

    if (!listingId || !userId || !startDate || !endDate || !total) {
      console.error('[Stripe Webhook] Missing required metadata for booking creation', meta)
      return
    }

    // Idempotency: skip if a booking already exists for this payment intent
    const paymentIntentId = session.payment_intent as string
    if (paymentIntentId) {
      const { data: existingBooking } = await supabase
        .from('bookings')
        .select('id')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .maybeSingle()

      if (existingBooking) {
        console.log(`[Stripe Webhook] Booking for payment_intent ${paymentIntentId} already exists — skipping`)
        return
      }
    }

    // Ensure we have a host_id — fetch from listing if metadata was empty
    let resolvedHostId = hostId
    if (!resolvedHostId) {
      const { data: listing } = await supabase
        .from('listings')
        .select('host_id')
        .eq('id', listingId)
        .single()
      resolvedHostId = listing?.host_id
    }

    if (!resolvedHostId) {
      console.error('[Stripe Webhook] Could not resolve host_id for listing', listingId)
      return
    }

    const buyNowEnabled = buyNowEnabledStr === 'true'
    const initialStatus = buyNowEnabled ? 'confirmed' : 'pending'

    const hostPrintsVal = hostPrintsStr === 'true'
    const printFeeVal = parseFloat(printFeeStr ?? '0') || 0

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        listing_id: listingId,
        advertiser_id: userId,
        host_id: resolvedHostId,
        start_date: startDate,
        end_date: endDate,
        total_price: parseFloat(total),
        platform_fee: parseFloat(platformFee ?? '0'),
        status: initialStatus,
        stripe_payment_intent_id: paymentIntentId || null,
        // Print / shipping fields
        // DB columns needed: host_prints boolean DEFAULT false, print_fee_charged numeric,
        //   delivery_mode text, shipped_at timestamptz, received_at timestamptz, tracking_number text
        host_prints: hostPrintsVal,
        print_fee_charged: printFeeVal > 0 ? printFeeVal : null,
        delivery_mode: hostPrintsVal ? 'host_prints' : null,
      })
      .select('*, listings(title, host_id, images, category)')
      .single()

    if (bookingError) {
      console.error("[Stripe Webhook] Failed to create booking:", bookingError); throw new Error("Booking insert failed: " + bookingError.message)
      return
    }

    const bookingId = booking.id
    console.log(`[Stripe Webhook] Booking ${bookingId} created with status=${initialStatus}`)

    await sendBookingNotifications(supabase, booking, bookingId, initialStatus as 'pending' | 'confirmed')
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendBookingNotifications(supabase: ReturnType<typeof getSupabase>, booking: any, bookingId: string, initialStatus: 'pending' | 'confirmed' = 'confirmed') {
  const isPending = initialStatus === 'pending'

  // Fetch advertiser profile
  const { data: advertiserProfile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', booking.advertiser_id)
    .single()

  // Fetch host profile
  const { data: hostProfile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', booking.host_id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listingData = booking.listings as any
  const listingTitle = listingData?.title ?? 'your listing'
  const listingCategory = (listingData?.category ?? '') as string
  const dates = `${booking.start_date} → ${booking.end_date}`
  const listingImages = listingData?.images as string[] | null | undefined
  const listingPhoto = Array.isArray(listingImages) && listingImages.length > 0 ? listingImages[0] : null

  // Determine if this is a static (physical) placement
  const STATIC_CATEGORIES = ['outdoor_static', 'static_billboards', 'billboard', 'storefront', 'window', 'vehicle_wrap']
  const isStaticListing = STATIC_CATEGORIES.includes(listingCategory.toLowerCase())

  // Send email to advertiser — always use booking_confirmed template for now
  // (the in-app notification and auto-message carry the correct pending/confirmed messaging)
  if (advertiserProfile?.email) {
    sendEmail({
      type: 'booking_confirmed',
      advertiserEmail: advertiserProfile.email,
      listingTitle,
      dates,
      total: booking.total_price,
      bookingId,
      isStatic: isStaticListing,
    })
  }

  // Send email to host — content depends on status
  if (hostProfile?.email) {
    sendEmail({
      type: 'new_booking_request',
      hostEmail: hostProfile.email,
      listingTitle,
      advertiserName: advertiserProfile?.full_name ?? 'An advertiser',
      dates,
      total: booking.total_price,
      platformFee: booking.platform_fee ?? 0,
      isStatic: isStaticListing,
    })
  }

  // Auto-message to advertiser — content depends on status
  const priceSummary = booking.total_price
    ? `$${Number(booking.total_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    : ''

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.cityfeed.io'
  const bookingUrl = `${baseUrl}/dashboard/bookings/${bookingId}`

  const staticNextSteps = `📋 Next steps for your placement:\n\n1. Prepare your printed materials to match the creative specs\n2. Coordinate delivery timing with your host via messenger\n3. Host will confirm receipt and installation\n4. Your host will submit proof of posting once your ad is live\n\nView your booking: ${bookingUrl}\n\nNeed to discuss delivery details? Send a message below!`

  const digitalNextSteps = `Here's what to do next:\n\n1. Upload your creative files: ${bookingUrl}\n2. Review the creative specs and delivery instructions\n3. The host will begin setup once they receive your materials\n\nView your booking: ${bookingUrl}\n\nQuestions? Send a message here!`

  const systemMessage = isPending
    ? `⏳ Your booking request has been received!\n\n📍 ${listingTitle}\n📅 ${dates}${priceSummary ? `\n💰 Total: ${priceSummary}` : ''}\n\nThe host will review your request and respond shortly. You'll be notified once it's approved.\n\nView your booking: ${bookingUrl}\n\nQuestions? Send a message here!`
    : `🎉 Your booking is confirmed!\n\n📍 ${listingTitle}\n📅 ${dates}${priceSummary ? `\n💰 Total: ${priceSummary}` : ''}\n\n${isStaticListing ? staticNextSteps : digitalNextSteps}`

  const msgInsert = await supabase.from('messages').insert({
    booking_id: bookingId,
    sender_id: booking.advertiser_id,
    recipient_id: booking.advertiser_id,
    content: systemMessage,
    ...(listingPhoto ? { image_url: listingPhoto } : {}),
  })
  console.log(`[Stripe Webhook] Auto-message insert:`, msgInsert.error ?? 'OK', { bookingId })

  // Insert notifications — content depends on status
  const advertiserNotifTitle = isPending
    ? 'Booking request submitted'
    : 'Your booking is confirmed!'
  const advertiserNotifBody = isPending
    ? `"${listingTitle}" — awaiting host approval`
    : `"${listingTitle}" — ${dates}`

  const hostNotifTitle = isPending
    ? `New booking request for "${listingTitle}"`
    : `New instant booking for "${listingTitle}"!`

  await supabase.from('notifications').insert([
    {
      user_id: booking.advertiser_id,
      type: isPending ? 'booking_pending' : 'booking_confirmed',
      title: advertiserNotifTitle,
      body: advertiserNotifBody,
      href: `/dashboard/bookings/${bookingId}`,
    },
    {
      user_id: booking.host_id,
      type: 'new_booking',
      title: hostNotifTitle,
      body: `From ${advertiserProfile?.full_name ?? 'An advertiser'} — ${dates}`,
      href: `/dashboard/bookings`,
    },
  ])
}
