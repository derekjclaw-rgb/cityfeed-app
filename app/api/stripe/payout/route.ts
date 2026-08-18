/**
 * /api/stripe/payout — Escrow payout trigger (HTTP route)
 *
 * AUTH: Requires EITHER:
 *   (a) Valid Supabase session belonging to the booking's host (POP upload flow)
 *   (b) x-internal-secret header matching INTERNAL_API_SECRET (server-to-server)
 *
 * The actual payout logic lives in lib/payout.ts so server-side callers
 * (cron auto-approve) can import it directly without an HTTP round-trip.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionUser, verifyInternalSecret } from '@/lib/auth-guard'
import { processBookingPayout } from '@/lib/payout'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )
}

export async function POST(req: NextRequest) {
  try {
    const { booking_id } = await req.json()

    if (!booking_id) {
      return NextResponse.json({ error: 'Missing booking_id' }, { status: 400 })
    }

    // ── Auth check ──────────────────────────────────────────────────────────
    const isInternal = verifyInternalSecret(req)
    const sessionUser = !isInternal ? await getSessionUser() : null

    if (!isInternal && !sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // If user-session auth, verify caller is the booking's host
    if (sessionUser) {
      const supabase = getSupabase()
      const { data: booking } = await supabase
        .from('bookings')
        .select('host_id')
        .eq('id', booking_id)
        .single()

      if (!booking) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
      }

      if (booking.host_id !== sessionUser.id) {
        return NextResponse.json({ error: 'Forbidden — only the host can trigger payout' }, { status: 403 })
      }
    }

    // ── Execute payout ──────────────────────────────────────────────────────
    const result = await processBookingPayout(booking_id)

    if (result.already_paid) {
      return NextResponse.json(
        { error: 'Payout already processed', transfer_id: result.transfer_id },
        { status: 409 }
      )
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status || 500 }
      )
    }

    return NextResponse.json({
      success: true,
      transfer_id: result.transfer_id,
      payout_amount: result.payout_amount,
    })
  } catch (err) {
    console.error('[Payout] Error:', err)
    const message = err instanceof Error ? err.message : 'Failed to process payout'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
