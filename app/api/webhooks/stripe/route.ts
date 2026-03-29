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

  await handleEvent(event)
  return NextResponse.json({ received: true })
}

async function handleEvent(event: Stripe.Event) {
  const supabase = getSupabase()
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
        stripe_payment_intent_id: session.payment_intent as string,
      })
      .eq('id', bookingId)
      .select('*, listings(title, host_id, images, start_date, end_date)')
      .single()

    if (error) {
      console.error('Failed to update booking:', error)
      return
    }

    console.log(`[Stripe Webhook] Booking ${bookingId} confirmed`)

    if (booking) {
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
      // First listing photo for inline image in auto-message
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

      // Auto-message to advertiser with next steps (includes listing photo + summary)
      const priceSummary = booking.total_price ? `$${Number(booking.total_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : ''
      const systemMessage = `🎉 Your booking is confirmed!\n\n📍 ${listingTitle}\n📅 ${dates}${priceSummary ? `\n💰 Total: ${priceSummary}` : ''}\n\nHere's what to do next:\n\n1. Upload your creative/collateral files in the booking detail page\n2. Review the creative specs and delivery instructions\n3. The host will begin setup once they receive your materials\n\nQuestions? Send a message here!`

      await supabase.from('messages').insert({
        booking_id: bookingId,
        sender_id: booking.host_id,
        recipient_id: booking.advertiser_id,
        content: systemMessage,
        ...(listingPhoto ? { image_url: listingPhoto } : {}),
      })

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
  }
}
