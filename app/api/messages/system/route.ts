/**
 * /api/messages/system — Server-side SYSTEM message insert (service role).
 *
 * WHY: System messages ("creative uploaded", "materials shipped", "POP live")
 * were inserted client-side, which forced sender_id = the acting user. That
 * made them render as if a USER sent them (gold bubble impersonation), and
 * cross-user variants either leaked to both parties or were silently blocked
 * by RLS (insert policy requires auth.uid() = sender_id).
 *
 * MODEL: A system message is SELF-ADDRESSED to its target user
 * (sender_id = recipient_id = target). RLS then scopes visibility to exactly
 * that user, and the chat UI renders sender==recipient rows as neutral
 * centered system notes. Each party sees only their own variant.
 *
 * AUTH: Requires a valid Supabase session; the session user must be a
 * participant (advertiser or host) of the booking.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionUser } from '@/lib/auth-guard'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )
}

export async function POST(req: NextRequest) {
  try {
    const { booking_id, to, content, image_url } = await req.json()

    if (!booking_id || !to || !content) {
      return NextResponse.json({ error: 'Missing booking_id, to, or content' }, { status: 400 })
    }
    if (!['host', 'advertiser'].includes(to)) {
      return NextResponse.json({ error: "to must be 'host' or 'advertiser'" }, { status: 400 })
    }

    const sessionUser = await getSessionUser()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabase()
    const { data: booking } = await supabase
      .from('bookings')
      .select('host_id, advertiser_id')
      .eq('id', booking_id)
      .single()

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }
    if (sessionUser.id !== booking.host_id && sessionUser.id !== booking.advertiser_id) {
      return NextResponse.json({ error: 'Not a participant of this booking' }, { status: 403 })
    }

    const target = to === 'host' ? booking.host_id : booking.advertiser_id

    const { error } = await supabase.from('messages').insert({
      booking_id,
      sender_id: target,
      recipient_id: target,
      content,
      ...(image_url ? { image_url } : {}),
    })

    if (error) {
      console.error('[SystemMessage] Insert failed:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[SystemMessage] Error:', err)
    return NextResponse.json({ error: 'Failed to insert system message' }, { status: 500 })
  }
}
