import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

/**
 * Auto-approve POP submissions older than 72 hours.
 * Also sends 48-hour collateral reminders for confirmed bookings with no collateral.
 * Called by Vercel Cron every 6 hours, or manually for MVP.
 *
 * Phase 5b additions:
 * - Check for confirmed bookings created 48+ hours ago with no collateral uploaded
 * - Log collateral reminder events
 * - Wire to Resend when email provider is configured (see lib/email.ts)
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

    // ── Phase 5b: 48-hour collateral reminders ─────────────────────────────────
    // Find confirmed bookings that are 48+ hours old with no collateral uploaded.
    // Wire to Resend when email provider is configured (see lib/email.ts).
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

    const { data: confirmedBookings } = await supabase
      .from('bookings')
      .select('id, advertiser_id, listing_id, start_date, created_at')
      .eq('status', 'confirmed')
      .lt('created_at', fortyEightHoursAgo)

    const collateralReminderResults: Array<{ booking_id: string; status: string }> = []

    if (confirmedBookings && confirmedBookings.length > 0) {
      for (const booking of confirmedBookings) {
        // Check if any collateral exists in Supabase Storage for this booking.
        // Note: This requires the "booking-collateral" bucket to exist.
        // If the bucket doesn't exist yet, this will gracefully skip.
        const { data: storageFiles, error: storageErr } = await supabase.storage
          .from('booking-collateral')
          .list(`bookings/${booking.id}`, { limit: 1 })

        const hasCollateral = !storageErr && storageFiles && storageFiles.length > 0

        if (!hasCollateral) {
          // Get advertiser email for the reminder
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', booking.advertiser_id)
            .single()

          const advertiserEmail = profile?.email ?? `advertiser:${booking.advertiser_id}`

          // Get listing title
          const { data: listing } = await supabase
            .from('listings')
            .select('title')
            .eq('id', booking.listing_id)
            .single()

          // Log collateral reminder (wire to Resend when email provider is configured)
          sendEmail({
            type: 'collateral_reminder',
            advertiserEmail,
            listingTitle: listing?.title ?? `Listing ${booking.listing_id}`,
            bookingId: booking.id,
            campaignStartDate: new Date(booking.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          })

          collateralReminderResults.push({ booking_id: booking.id, status: 'reminder_logged' })
        }
      }
    }

    console.log(`[AutoApprove] Collateral reminders checked: ${confirmedBookings?.length ?? 0} bookings, ${collateralReminderResults.length} reminders sent`)

    return NextResponse.json({
      message: `Auto-approved ${pendingPOPs.length} POP submission(s)`,
      count: pendingPOPs.length,
      results,
      collateral_reminders: collateralReminderResults.length,
    })
  } catch (err) {
    console.error('[AutoApprove] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
