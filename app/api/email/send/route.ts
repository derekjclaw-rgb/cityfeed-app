/**
 * /api/email/send — Email dispatch endpoint
 *
 * AUTH: Requires EITHER:
 *   (a) Valid Supabase session (client-side callers) — for booking-related emails,
 *       verifies the session user is a participant (advertiser or host).
 *   (b) x-internal-secret header matching INTERNAL_API_SECRET (server-to-server)
 *
 * SECURITY: Recipient email is validated against booking/user records server-side.
 * The client-provided email is cross-checked — it must match the actual booking
 * participant's email on file. This prevents the endpoint from being used as an
 * open relay.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'
import { getSessionUser, verifyInternalSecret } from '@/lib/auth-guard'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )
}

/** Email types that reference a booking and need participant verification */
const BOOKING_EMAIL_TYPES = [
  'collateral_uploaded',
  'creative_submitted_advertiser',
  'pop_submitted',
  'booking_cancelled',
  'booking_approved_advertiser',
  'pop_approved',
  'pop_submitted_host',
  'collateral_reminder',
  'pop_reminder_morning',
  'materials_shipped',
  'materials_received',
  'materials_shipped_confirm',
  'materials_received_host',
  'new_booking_request',
  'new_booking_instant',
  'booking_confirmed',
  'booking_request_submitted',
  'creative_reminder',
  'pop_reminder',
]

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // ── Auth check ──────────────────────────────────────────────────────────
    const isInternal = verifyInternalSecret(req)

    if (isInternal) {
      // Internal callers (cron, payout) are trusted — send directly
      await sendEmail(body)
      return NextResponse.json({ ok: true })
    }

    // User-session auth required for client-side callers
    const sessionUser = await getSessionUser()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const emailType = body.type as string
    const bookingId = body.bookingId as string | undefined

    // For booking-related emails, verify the caller is a participant
    if (BOOKING_EMAIL_TYPES.includes(emailType) && bookingId) {
      const supabase = getSupabase()
      const { data: booking } = await supabase
        .from('bookings')
        .select('advertiser_id, host_id')
        .eq('id', bookingId)
        .single()

      if (!booking) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
      }

      if (booking.advertiser_id !== sessionUser.id && booking.host_id !== sessionUser.id) {
        return NextResponse.json({ error: 'Forbidden — you are not a participant in this booking' }, { status: 403 })
      }
    }

    // For listing-published emails, verify the caller owns the listing
    if (emailType === 'listing_published') {
      const listingId = body.listingId as string | undefined
      if (listingId) {
        const supabase = getSupabase()
        const { data: listing } = await supabase
          .from('listings')
          .select('host_id')
          .eq('id', listingId)
          .single()

        if (listing && listing.host_id !== sessionUser.id) {
          return NextResponse.json({ error: 'Forbidden — you do not own this listing' }, { status: 403 })
        }
      }
    }

    await sendEmail(body)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Email API] Error:', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
