/**
 * /api/webhooks/stripe-connect — Connect-event webhook (payout truth)
 *
 * Listens to payout.paid / payout.failed fired on HOSTS' connected accounts.
 * On payout.paid: unbundles the bank deposit back to its bookings
 * (balance transactions → source payment → source_transfer → metadata.booking_id,
 * same mapping as /api/dashboard/payouts) and stamps bookings.paid_out_at —
 * making the Earnings "Paid" pill exact instead of a 7-day approximation.
 * On payout.failed: loud in-app alert to the host (never silent).
 *
 * Fail-closed signature verification — same standard as the checkout webhook.
 * Requires env: STRIPE_CONNECT_WEBHOOK_SECRET (separate endpoint + secret from
 * the platform checkout webhook, because Connect events sign differently).
 */
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

function getStripe() { return new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2026-02-25.clover' }) }

function getAdminSb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET
  if (!secret) {
    console.error('[Connect Webhook] STRIPE_CONNECT_WEBHOOK_SECRET is not configured — rejecting request. Register a Connect webhook endpoint in Stripe and set this env var.')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const sig = req.headers.get('stripe-signature')
  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const stripe = getStripe()
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch (err) {
    console.error('[Connect Webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type !== 'payout.paid' && event.type !== 'payout.failed') {
    return NextResponse.json({ received: true })
  }

  const account = event.account // connected account the payout belongs to
  const payout = event.data.object as Stripe.Payout
  const amount = (payout.amount / 100).toFixed(2)
  const supabase = getAdminSb()

  // Resolve which host this connected account belongs to
  let hostId: string | null = null
  if (account) {
    const { data: hostProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_account_id', account)
      .single()
    hostId = hostProfile?.id ?? null
  }

  if (event.type === 'payout.failed') {
    console.error(`[Connect Webhook] payout.failed — account=${account} payout=${payout.id} $${amount} reason=${payout.failure_message ?? 'unknown'}`)
    if (hostId) {
      await supabase.from('notifications').insert({
        user_id: hostId,
        type: 'payout_failed',
        title: 'Bank deposit failed',
        body: `A $${amount} payout to your bank failed${payout.failure_message ? ` (${payout.failure_message})` : ''}. Please check your bank details in payout settings.`,
        href: '/dashboard/payouts',
      })
    }
    return NextResponse.json({ received: true })
  }

  // ── payout.paid — unbundle the deposit back to bookings ─────────────────
  const bookingIds: string[] = []
  try {
    const balanceTxns = await stripe.balanceTransactions.list(
      { payout: payout.id, limit: 100, type: 'payment' },
      { stripeAccount: account! }
    )

    for (const bt of balanceTxns.data) {
      const sourceId = typeof bt.source === 'string' ? bt.source : bt.source?.id
      if (!sourceId) continue
      try {
        // The payment on the connected account came from a platform transfer;
        // source_transfer carries our metadata.booking_id
        const charge = await stripe.charges.retrieve(
          sourceId,
          { expand: ['source_transfer'] },
          { stripeAccount: account! }
        )
        const st = charge.source_transfer
        const transfer = typeof st === 'string' ? await stripe.transfers.retrieve(st) : st
        const metaBookingId = transfer?.metadata?.booking_id
        if (metaBookingId) {
          bookingIds.push(metaBookingId)
        } else if (transfer?.id) {
          // Fallback: match by the transfer id we stored at payout time
          const { data: b } = await supabase
            .from('bookings')
            .select('id')
            .eq('stripe_transfer_id', transfer.id)
            .single()
          if (b?.id) bookingIds.push(b.id)
        }
      } catch (chargeErr) {
        console.warn(`[Connect Webhook] Could not resolve source ${sourceId}:`, chargeErr)
      }
    }
  } catch (btErr) {
    console.error('[Connect Webhook] Balance transaction listing failed:', btErr)
  }

  const uniqueIds = [...new Set(bookingIds)]
  if (uniqueIds.length > 0) {
    const paidAt = payout.arrival_date
      ? new Date(payout.arrival_date * 1000).toISOString()
      : new Date().toISOString()
    const { error: stampErr } = await supabase
      .from('bookings')
      .update({ paid_out_at: paidAt })
      .in('id', uniqueIds)
    if (stampErr) {
      // Column may not exist yet (migration pending) — log loudly, don't 500
      console.error('[Connect Webhook] Failed to stamp paid_out_at (migration run?):', stampErr.message)
    } else {
      console.log(`[Connect Webhook] payout.paid $${amount} → stamped ${uniqueIds.length} booking(s):`, uniqueIds.join(', '))
    }
  } else {
    console.warn(`[Connect Webhook] payout.paid $${amount} on ${account} — no bookings resolved (manual/legacy transfer?)`)
  }

  // Tell the host their money actually landed
  if (hostId) {
    await supabase.from('notifications').insert({
      user_id: hostId,
      type: 'payout_paid',
      title: 'Payout deposited 💰',
      body: `$${amount} landed in your bank account.`,
      href: '/dashboard/payouts',
    })
  }

  return NextResponse.json({ received: true })
}
