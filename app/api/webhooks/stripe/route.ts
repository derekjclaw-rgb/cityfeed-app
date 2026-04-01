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

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const meta = session.metadata ?? {}

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
        .select('*, listings(title, host_id, images, start_date, end_date)')
        .single()

      if (error) {
        console.error('[Stripe Webhook] Legacy: Failed to update booking:', error)
        return
      }

      console.log(`[Stripe Webhook] Legacy booking ${bookingId} confirmed`)
      if (booking) await sendBookingNotifications(supabase, booking, bookingId)
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
      })
      .select('*, listings(title, host_id, images, start_date, end_date)')
      .single()

    if (bookingError) {
      console.error("[Stripe Webhook] Failed to create booking:", bookingError); throw new Error("Booking insert failed: " + bookingError.message)
      return
    }

    const bookingId = booking.id
    console.log(`[Stripe Webhook] Booking ${bookingId} created with status=${initialStatus}`)

    await sendBookingNotifications(supabase, booking, bookingId)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendBookingNotifications(supabase: ReturnType<typeof getSupabase>, booking: any, bookingId: string) {
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
  const dates = `${booking.start_date} → ${booking.end_date}`
  const listingImages = listingData?.images as string[] | null | undefined
  const listingPhoto = Array.isArray(listingImages) && listingImages.length > 0 ? listingImages[0] : null

  // Send confirmation email to advertiser
  if (advertiserProfile?.email) {
    sendEmail({
      type: 'booking_confirmed',
      advertiserEmail: advertiserProfile.email,
      listingTitle,
      dates,
      total: booking.total_price,
    })
  }

  // Send new booking notification to host
  if (hostProfile?.email) {
    sendEmail({
      type: 'new_booking_request',
      hostEmail: hostProfile.email,
      listingTitle,
      advertiserName: advertiserProfile?.full_name ?? 'An advertiser',
      dates,
      total: booking.total_price,
    })
  }

  // Auto-message to advertiser with next steps
  const priceSummary = booking.total_price
    ? `$${Number(booking.total_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    : ''
  const systemMessage = `🎉 Your booking is confirmed!\n\n📍 ${listingTitle}\n📅 ${dates}${priceSummary ? `\n💰 Total: ${priceSummary}` : ''}\n\nHere's what to do next:\n\n1. Upload your creative/collateral files in the booking detail page\n2. Review the creative specs and delivery instructions\n3. The host will begin setup once they receive your materials\n\nQuestions? Send a message here!`

  const msgInsert = await supabase.from('messages').insert({
    booking_id: bookingId,
    sender_id: booking.host_id,
    recipient_id: booking.advertiser_id,
    content: systemMessage,
    ...(listingPhoto ? { image_url: listingPhoto } : {}),
  })
  console.log(`[Stripe Webhook] Auto-message insert:`, msgInsert.error ?? 'OK', { bookingId })

  // Insert notifications
  await supabase.from('notifications').insert([
    {
      user_id: booking.advertiser_id,
      type: 'booking_confirmed',
      title: 'Your booking is confirmed!',
      body: `"${listingTitle}" — ${dates}`,
      href: `/dashboard/bookings/${bookingId}`,
    },
    {
      user_id: booking.host_id,
      type: 'new_booking',
      title: `New booking request for "${listingTitle}"`,
      body: `From ${advertiserProfile?.full_name ?? 'An advertiser'} — ${dates}`,
      href: `/dashboard/bookings`,
    },
  ])
}
