/**
 * /api/admin/reconciliation — READ-ONLY Stripe reconciliation data
 *
 * Returns:
 *   1. Platform Stripe balance (available + pending)
 *   2. Escrow liability (sum of host payout amounts on paid bookings
 *      that have NOT yet been transferred — no stripe_transfer_id)
 *   3. Recent Stripe transfers (limit 100) matched to bookings
 *
 * All Stripe calls are READ-ONLY. Protected by admin session cookie.
 */
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { getBookingFinancials } from '@/lib/fees'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2026-02-25.clover' })
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )
}

function isAuthenticated(req: NextRequest): boolean {
  return req.cookies.get('admin_session')?.value === 'authenticated'
}

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const stripe = getStripe()
  const supabase = getSupabase()

  try {
    // ── 1. Live platform balance ────────────────────────────────────────────
    const balance = await stripe.balance.retrieve()

    const availableUsd = balance.available
      .filter(b => b.currency === 'usd')
      .reduce((s, b) => s + b.amount, 0) / 100

    const pendingUsd = balance.pending
      .filter(b => b.currency === 'usd')
      .reduce((s, b) => s + b.amount, 0) / 100

    // ── 2. Escrow liability ─────────────────────────────────────────────────
    // Bookings that are paid (confirmed/active/pop_pending/pop_review)
    // but have NOT been transferred to the host yet
    const { data: escrowBookings } = await supabase
      .from('bookings')
      .select('id, total_price, subtotal, buyer_fee, seller_fee, print_fee_charged, payout_amount, start_date, end_date')
      .in('status', ['confirmed', 'active', 'pop_pending', 'pop_review'])
      .is('stripe_transfer_id', null)

    const escrowLiability = (escrowBookings ?? []).reduce((sum, b) => {
      const fin = getBookingFinancials(b)
      return sum + fin.hostPayout
    }, 0)

    const safeToWithdraw = Math.max(0, availableUsd - escrowLiability)

    // ── 3. Recent transfers + reconciliation ────────────────────────────────
    const transfers = await stripe.transfers.list({ limit: 100 })

    // Collect all booking IDs referenced by transfers
    const transferBookingIds = transfers.data
      .map(t => t.metadata?.booking_id)
      .filter((id): id is string => !!id)

    // Fetch those bookings from Supabase
    let matchedBookings: Record<string, { id: string; status: string; stripe_transfer_id: string | null; listing_title: string }> = {}
    if (transferBookingIds.length > 0) {
      const { data: bookingRows } = await supabase
        .from('bookings')
        .select('id, status, stripe_transfer_id, listings(title)')
        .in('id', transferBookingIds)

      if (bookingRows) {
        for (const b of bookingRows) {
          const listing = b.listings as unknown as { title: string } | null
          matchedBookings[b.id] = {
            id: b.id,
            status: b.status,
            stripe_transfer_id: b.stripe_transfer_id,
            listing_title: listing?.title ?? '—',
          }
        }
      }
    }

    // Also find bookings marked as paid_out (completed with stripe_transfer_id)
    // that DON'T have a matching transfer — potential orphans
    const { data: paidOutBookings } = await supabase
      .from('bookings')
      .select('id, status, stripe_transfer_id, listings(title)')
      .eq('status', 'completed')
      .not('stripe_transfer_id', 'is', null)

    const transferIdSet = new Set(transfers.data.map(t => t.id))
    const orphanedBookings = (paidOutBookings ?? []).filter(
      b => b.stripe_transfer_id && !transferIdSet.has(b.stripe_transfer_id)
    )

    // Build transfer rows
    const transferRows = transfers.data.map(t => {
      const bookingId = t.metadata?.booking_id ?? null
      const booking = bookingId ? matchedBookings[bookingId] ?? null : null
      const mismatch = bookingId && !booking
        ? 'transfer_no_booking'
        : null
      return {
        id: t.id,
        amount: t.amount / 100,
        currency: t.currency,
        destination: t.destination,
        created: new Date(t.created * 1000).toISOString(),
        booking_id: bookingId,
        booking_status: booking?.status ?? null,
        listing_title: booking?.listing_title ?? null,
        mismatch,
      }
    })

    // Add orphaned bookings (completed with transfer ID but no Stripe transfer in recent 100)
    const orphanRows = orphanedBookings.map(b => {
      const listing = b.listings as unknown as { title: string } | null
      return {
        booking_id: b.id,
        stripe_transfer_id: b.stripe_transfer_id,
        listing_title: listing?.title ?? '—',
        mismatch: 'booking_no_transfer',
      }
    })

    return NextResponse.json({
      balance: {
        available: availableUsd,
        pending: pendingUsd,
      },
      escrow: {
        liability: escrowLiability,
        bookingCount: (escrowBookings ?? []).length,
        safeToWithdraw,
      },
      transfers: transferRows,
      orphanedBookings: orphanRows,
    })
  } catch (err) {
    console.error('[Reconciliation API] Error:', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
