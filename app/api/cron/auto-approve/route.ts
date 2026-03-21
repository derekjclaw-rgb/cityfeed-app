import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Auto-approve POP submissions older than 72 hours.
 * Called by Vercel Cron every 6 hours, or manually for MVP.
 */
export async function GET(req: NextRequest) {
  // Validate cron secret for security
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()

    // Find POP submissions older than 72 hours that are still pending
    const { data: pendingPOPs, error: fetchError } = await supabase
      .from('pop_submissions')
      .select('id, booking_id, created_at')
      .eq('status', 'pending')
      .lt('created_at', seventyTwoHoursAgo)

    if (fetchError) {
      console.error('[AutoApprove] Fetch error:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!pendingPOPs || pendingPOPs.length === 0) {
      return NextResponse.json({ message: 'No pending POPs to auto-approve', count: 0 })
    }

    const results: Array<{ booking_id: string; status: string; error?: string }> = []

    for (const pop of pendingPOPs) {
      try {
        // Mark POP as auto-approved
        await supabase
          .from('pop_submissions')
          .update({ status: 'approved', approved_at: new Date().toISOString() })
          .eq('id', pop.id)

        // Trigger payout
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://cityfeed-app.vercel.app'
        const payoutRes = await fetch(`${baseUrl}/api/stripe/payout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ booking_id: pop.booking_id }),
        })

        const payoutData = await payoutRes.json()
        results.push({
          booking_id: pop.booking_id,
          status: payoutRes.ok ? 'paid_out' : 'payout_failed',
          error: payoutRes.ok ? undefined : payoutData.error,
        })

        console.log(`[AutoApprove] Booking ${pop.booking_id}: ${payoutRes.ok ? 'auto-approved + paid' : 'auto-approved, payout failed'}`)
      } catch (err) {
        console.error(`[AutoApprove] Error for booking ${pop.booking_id}:`, err)
        results.push({ booking_id: pop.booking_id, status: 'error', error: String(err) })
      }
    }

    return NextResponse.json({
      message: `Auto-approved ${pendingPOPs.length} POP submission(s)`,
      count: pendingPOPs.length,
      results,
    })
  } catch (err) {
    console.error('[AutoApprove] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
