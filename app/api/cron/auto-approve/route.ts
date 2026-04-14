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
      .select('id, host_id, advertiser_id, updated_at, end_date')
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

        // Auto-message: POP approved — campaign LIVE (not complete yet)
        await supabase.from('messages').insert({
          booking_id: booking.id,
          sender_id: booking.host_id,
          recipient_id: booking.advertiser_id,
          content: 'POP approved! Your ad is now LIVE 🟢',
        })

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

    // ── Campaign complete messages ───────────────────────────────────────────────
    // Find bookings in 'completed' status where end_date has passed AND no completion
    // message has been sent yet (we use a simple flag: check messages for the completion text)
    const today = new Date().toISOString().split('T')[0]

    const { data: completedBookings } = await supabase
      .from('bookings')
      .select('id, host_id, advertiser_id, end_date')
      .eq('status', 'completed')
      .lt('end_date', today)

    const campaignCompleteResults: Array<{ booking_id: string; status: string }> = []

    if (completedBookings && completedBookings.length > 0) {
      for (const bk of completedBookings) {
        // Check if we already sent a "Campaign complete" message for this booking
        const { data: existingMsg } = await supabase
          .from('messages')
          .select('id')
          .eq('booking_id', bk.id)
          .ilike('content', '%Campaign complete%')
          .limit(1)

        if (existingMsg && existingMsg.length > 0) continue // already sent

        // Send campaign complete message
        await supabase.from('messages').insert({
          booking_id: bk.id,
          sender_id: bk.host_id,
          recipient_id: bk.advertiser_id,
          content: 'Campaign complete 🎉 Your booking has wrapped. Thank you for using City Feed!',
        })

        // Notify both parties
        await Promise.all([
          supabase.from('notifications').insert({
            user_id: bk.advertiser_id,
            type: 'campaign_complete',
            title: 'Campaign Complete 🎉',
            body: 'Your campaign has wrapped. Thank you for using City Feed!',
            href: `/dashboard/bookings/${bk.id}`,
          }),
          supabase.from('notifications').insert({
            user_id: bk.host_id,
            type: 'campaign_complete',
            title: 'Campaign Complete 🎉',
            body: 'The campaign for your listing has wrapped.',
            href: `/dashboard/bookings/${bk.id}`,
          }),
        ])

        campaignCompleteResults.push({ booking_id: bk.id, status: 'completion_message_sent' })
        console.log(`[AutoApprove] Campaign complete message sent for booking ${bk.id}`)
      }
    }

    console.log(`[AutoApprove] Campaign complete checks: ${completedBookings?.length ?? 0} checked, ${campaignCompleteResults.length} messages sent`)

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

    // ── 36-hour pre-campaign reminders ─────────────────────────────────────────
    const thirtyySixHoursFromNow = new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString()
    const nowISO = new Date().toISOString()
    const reminderResults36: Array<{ booking_id: string; type: string }> = []

    // 1) Advertiser reminder: start_date within 36h, confirmed, no creative files
    const { data: upcomingConfirmed } = await supabase
      .from('bookings')
      .select('id, advertiser_id, host_id, start_date, listing_id, listings(title)')
      .eq('status', 'confirmed')
      .gt('start_date', nowISO.split('T')[0])
      .lte('start_date', thirtyySixHoursFromNow.split('T')[0])

    if (upcomingConfirmed && upcomingConfirmed.length > 0) {
      for (const bk of upcomingConfirmed) {
        // Check if creative files exist
        const { data: storageFiles } = await supabase.storage
          .from('booking-collateral')
          .list(`bookings/${bk.id}`, { limit: 1 })
        const hasCreative = storageFiles && storageFiles.length > 0

        if (!hasCreative) {
          // Check if we already sent this reminder
          const { data: existingNotif } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', bk.advertiser_id)
            .eq('type', 'creative_reminder_36h')
            .ilike('href', `%${bk.id}%`)
            .limit(1)

          if (!existingNotif || existingNotif.length === 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const listingTitle = (bk as any).listings?.title ?? 'your listing'
            await supabase.from('notifications').insert({
              user_id: bk.advertiser_id,
              type: 'creative_reminder_36h',
              title: 'Upload your creative files',
              body: `Your campaign for "${listingTitle}" starts soon — upload your creative files to keep things on track.`,
              href: `/dashboard/bookings/${bk.id}`,
            })

            // Send email reminder
            const { data: advProfile } = await supabase
              .from('profiles').select('email').eq('id', bk.advertiser_id).single()
            if (advProfile?.email) {
              await fetch(`${baseUrl}/api/email/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'creative_reminder',
                  advertiserEmail: advProfile.email,
                  listingTitle,
                  bookingId: bk.id,
                }),
              }).catch(err => console.warn('[Cron] Creative reminder email failed:', err))
            }

            reminderResults36.push({ booking_id: bk.id, type: 'creative_reminder_36h' })
          }
        }
      }
    }

    // 2) Host reminder: completed status (post-creative), start_date within 36h, no POP files
    const { data: upcomingCompleted } = await supabase
      .from('bookings')
      .select('id, host_id, advertiser_id, start_date, listing_id, listings(title)')
      .eq('status', 'completed')
      .gt('start_date', nowISO.split('T')[0])
      .lte('start_date', thirtyySixHoursFromNow.split('T')[0])

    if (upcomingCompleted && upcomingCompleted.length > 0) {
      for (const bk of upcomingCompleted) {
        // Check if POP files exist
        const { data: popFiles } = await supabase.storage
          .from('booking-collateral')
          .list(`pop/${bk.id}`, { limit: 1 })
        const hasPOP = popFiles && popFiles.length > 0

        if (!hasPOP) {
          // Check if we already sent this reminder
          const { data: existingNotif } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', bk.host_id)
            .eq('type', 'pop_reminder_36h')
            .ilike('href', `%${bk.id}%`)
            .limit(1)

          if (!existingNotif || existingNotif.length === 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const listingTitle = (bk as any).listings?.title ?? 'your listing'
            await supabase.from('notifications').insert({
              user_id: bk.host_id,
              type: 'pop_reminder_36h',
              title: 'Upload proof of posting',
              body: `Your campaign for "${listingTitle}" starts soon — upload proof of posting once the ad is live.`,
              href: `/dashboard/bookings/${bk.id}`,
            })

            // Send email reminder
            const { data: hostProfile } = await supabase
              .from('profiles').select('email').eq('id', bk.host_id).single()
            if (hostProfile?.email) {
              await fetch(`${baseUrl}/api/email/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'pop_reminder',
                  hostEmail: hostProfile.email,
                  listingTitle,
                  bookingId: bk.id,
                }),
              }).catch(err => console.warn('[Cron] POP reminder email failed:', err))
            }

            reminderResults36.push({ booking_id: bk.id, type: 'pop_reminder_36h' })
          }
        }
      }
    }

    console.log(`[AutoApprove] 36h reminders: ${reminderResults36.length} sent`)

    return NextResponse.json({
      message: `Auto-approved ${pendingBookings.length} POP booking(s)`,
      count: pendingBookings.length,
      results,
      campaign_complete_messages: campaignCompleteResults.length,
      collateral_reminders: collateralReminderResults.length,
      reminders_36h: reminderResults36.length,
    })
  } catch (err) {
    console.error('[AutoApprove] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
