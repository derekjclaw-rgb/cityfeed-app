import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * /api/notify — Server-side notification insert (service role).
 *
 * WHY: Client-side inserts into `notifications` for OTHER users are silently
 * blocked by RLS (a user can't insert rows for someone else). That's why the
 * activity feed only showed server-generated events (new_booking, payout_initiated)
 * and missed everything fired from the browser (creative uploaded, POP submitted,
 * booking accepted, etc). All cross-user notifications must go through here.
 */
export async function POST(req: NextRequest) {
  try {
    const { user_id, type, title, body, href } = await req.json()

    if (!user_id || !type || !title) {
      return NextResponse.json({ error: 'Missing user_id, type, or title' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    const { error } = await supabase.from('notifications').insert({
      user_id,
      type,
      title,
      body: body ?? null,
      href: href ?? null,
    })

    if (error) {
      console.error('[Notify] Insert failed:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Notify] Error:', err)
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 })
  }
}
