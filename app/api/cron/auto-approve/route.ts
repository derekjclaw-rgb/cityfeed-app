import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )
}

/**
 * Auto-approve POP submissions older than 72 hours.
 * Also sends 48-hour collateral reminders for confirmed bookings with no collateral.
 * Called by Vercel Cron every 6 hours, or manually for MVP.
 */
export async function GET(req: NextRequest) {
  const supabase = getSupabase()

  // Validate cron secret for security
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()

    // Find bookings in pop_pending or pop_review status older than 72 hours
    const { data: pendingBookings, error: fetchError } = await supabase
      .from('bookings')
      .select('id, host_id, advertiser_id, updated_at')
      .in('status', ['pop_pending', 'pop_review'])
      .lt('updated_at', seventyTwoHoursAgo)

    if (fetchError) {
      console.error('[AutoApprove] Fetch error:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!pendingBookings || pendingBookings.length === 0) {
      return NextResponse.json({ message: 'No pending POPs to auto-approve', count: 0 })
    }

    const results: Array<{ booking_id: string; status: string; error?: string }> = []

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://cityfeed-app.vercel.app'

    for (const booking of pendingBookings) {
      try {
        // Mark booking as completed
        const { error: updateErr } = await supabase
          .from('bookings')
          .update({ status: 'completed' })
          .eq('id', booking.id)

        if (updateErr) {
          console.error(`[AutoApprove] Failed to update booking ${booking.id}:`, updateErr)
          results.push({ booking_id: booking.id, status: 'update_failed', error: updateErr.message })
          continue
        }

        // Send notification to advertiser and host
        await Promise.all([
          supabase.from('notifications').insert({
            user_id: booking.advertiser_id,
            type: 'pop_auto_approved',
            title: 'POP Auto-Approved',
            body: 'Your campaign POP was automatically approved after 72 hours. The booking is now complete.',
            href: `/dashboard/bookings/${booking.id}`,
          }),
          supabase.from('notifications').insert({
            user_id: booking.host_id,
            type: 'pop_auto_approved',
            title: 'POP Auto-Approved',
            body: 'Your proof of posting was automatically approved after 72 hours. Payout is being processed.',
            href: `/dashboard/bookings/${booking.id}`,
          }),
        ])

        // Trigger payout
        const payoutRes = await fetch(`${baseUrl}/api/stripe/payout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ booking_id: booking.id }),
        })

        const payoutData = await payoutRes.json()
        results.push({
          booking_id: booking.id,
          status: payoutRes.ok ? 'auto_approved_paid' : 'auto_approved_payout_failed',
          error: payoutRes.ok ? undefined : payoutData.error,
        })

        console.log(`[AutoApprove] Booking ${booking.id}: ${payoutRes.ok ? 'auto-approved + payout triggered' : 'auto-approved, payout failed'}`)
      } catch (err) {
        console.error(`[AutoApprove] Error for booking ${booking.id}:`, err)
        results.push({ booking_id: booking.id, status: 'error', error: String(err) })
      }
    }

    // ── 48-hour collateral reminders ────────────────────────────────────────────
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

    const { data: confirmedBookings } = await supabase
      .from('bookings')
      .select('id, advertiser_id, listing_id, start_date, created_at')
      .eq('status', 'confirmed')
      .lt('created_at', fortyEightHoursAgo)

    const collateralReminderResults: Array<{ booking_id: string; status: string }> = []

    if (confirmedBookings && confirmedBookings.length > 0) {
      for (const bk of confirmedBookings) {
        const { data: storageFiles, error: storageErr } = await supabase.storage
          .from('booking-collateral')
          .list(`bookings/${bk.id}`, { limit: 1 })

        const hasCollateral = !storageErr && storageFiles && storageFiles.length > 0

        if (!hasCollateral) {
          // Send in-app notification as reminder
          await supabase.from('notifications').insert({
            user_id: bk.advertiser_id,
            type: 'collateral_reminder',
            title: 'Upload Your Creative',
            body: 'Your campaign starts soon — please upload your creative materials to keep the booking on track.',
            href: `/dashboard/bookings/${bk.id}`,
          })

          collateralReminderResults.push({ booking_id: bk.id, status: 'reminder_sent' })
        }
      }
    }

    console.log(`[AutoApprove] Collateral reminders: ${confirmedBookings?.length ?? 0} checked, ${collateralReminderResults.length} sent`)

    return NextResponse.json({
      message: `Auto-approved ${pendingBookings.length} POP booking(s)`,
      count: pendingBookings.length,
      results,
      collateral_reminders: collateralReminderResults.length,
    })
  } catch (err) {
    console.error('[AutoApprove] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
