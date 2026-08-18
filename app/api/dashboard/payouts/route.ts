/**
 * /api/dashboard/payouts — Host payout breakdown
 *
 * Returns the logged-in host's payout history from their Stripe Connected
 * Account. For each Stripe payout (bank deposit) it lists balance
 * transactions → source transfers → maps transfer metadata.booking_id
 * to bookings in Supabase for itemized breakdown.
 *
 * Auth: Supabase session (server client, cookie-based).
 * Only returns data for the authenticated user's own Stripe account.
 */
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { getBookingFinancials } from '@/lib/fees'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2026-02-25.clover' })
}

function getAdminSupabase() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )
}

export async function GET() {
  const stripe = getStripe()

  try {
    // ── Auth: get current user via Supabase session ───────────────────────
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Get host's Stripe Connected Account ID ───────────────────────────
    const adminSb = getAdminSupabase()
    const { data: profile, error: profileError } = await adminSb
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const stripeAccountId = profile.stripe_account_id

    if (!stripeAccountId) {
      // Host has no Stripe account — return empty state
      return NextResponse.json({
        connected: false,
        payouts: [],
        totalEarned: 0,
        inTransit: 0,
      })
    }

    // ── Fetch payouts from host's connected account ──────────────────────
    const payoutsList = await stripe.payouts.list(
      { limit: 25 },
      { stripeAccount: stripeAccountId }
    )

    let totalEarned = 0
    let inTransit = 0

    // ── For each payout, get balance transactions → source transfers ─────
    const payoutDetails = await Promise.all(
      payoutsList.data.map(async (payout) => {
        const amount = payout.amount / 100

        if (payout.status === 'paid') totalEarned += amount
        if (payout.status === 'in_transit' || payout.status === 'pending') inTransit += amount

        // Get balance transactions for this payout
        let bookingItems: {
          booking_id: string | null
          listing_title: string
          short_id: string
          start_date: string | null
          end_date: string | null
          amount: number
        }[] = []

        try {
          const balanceTxns = await stripe.balanceTransactions.list(
            { payout: payout.id, limit: 100, type: 'payment' },
            { stripeAccount: stripeAccountId }
          )

          // Collect booking IDs from transfer metadata
          const bookingIds: string[] = []
          const txnAmounts: Record<string, number> = {}

          for (const bt of balanceTxns.data) {
            // The source is the charge/payment on the connected account
            // which came from a platform transfer
            // Transfer metadata contains booking_id
            const sourceId = typeof bt.source === 'string' ? bt.source : bt.source?.id
            if (sourceId) {
              txnAmounts[sourceId] = bt.amount / 100
            }
          }

          // Also try listing transfers on the PLATFORM side that map to this connected account
          // The transfers from platform → connected account carry metadata.booking_id
          const transfers = await stripe.transfers.list(
            {
              destination: stripeAccountId,
              limit: 100,
            }
          )

          for (const t of transfers.data) {
            if (t.metadata?.booking_id) {
              bookingIds.push(t.metadata.booking_id)
              // Use transfer amount
              txnAmounts[t.metadata.booking_id] = t.amount / 100
            }
          }

          // Fetch booking details from Supabase
          if (bookingIds.length > 0) {
            const uniqueIds = [...new Set(bookingIds)]
            const { data: bookings } = await adminSb
              .from('bookings')
              .select('id, start_date, end_date, total_price, subtotal, buyer_fee, seller_fee, print_fee_charged, payout_amount, payout_at, listings(title)')
              .in('id', uniqueIds)

            if (bookings) {
              bookingItems = bookings.map(b => {
                const listing = b.listings as unknown as { title: string } | null
                const fin = getBookingFinancials(b)
                const bookingId = b.id as string
                return {
                  booking_id: bookingId,
                  listing_title: listing?.title ?? 'Untitled listing',
                  short_id: 'CF-' + bookingId.replace(/-/g, '').substring(0, 4).toUpperCase(),
                  start_date: b.start_date,
                  end_date: b.end_date,
                  amount: txnAmounts[bookingId] ?? fin.hostPayout,
                }
              })
            }
          }
        } catch (err) {
          console.warn('[Payouts API] Error fetching balance transactions:', err)
        }

        // Extract bank last-4 if available
        let bankLast4: string | null = null
        if (payout.destination) {
          try {
            const dest = typeof payout.destination === 'string' ? payout.destination : payout.destination.id
            if (dest) {
              const bankAccount = await stripe.accounts.retrieveExternalAccount(
                stripeAccountId,
                dest
              )
              if ('last4' in bankAccount) {
                bankLast4 = bankAccount.last4 as string
              }
            }
          } catch {
            // Bank account may have been deleted — ignore
          }
        }

        return {
          id: payout.id,
          amount,
          status: payout.status,
          arrival_date: payout.arrival_date
            ? new Date(payout.arrival_date * 1000).toISOString()
            : null,
          created: new Date(payout.created * 1000).toISOString(),
          bank_last4: bankLast4,
          bookings: bookingItems,
        }
      })
    )

    return NextResponse.json({
      connected: true,
      payouts: payoutDetails,
      totalEarned,
      inTransit,
    })
  } catch (err) {
    console.error('[Payouts API] Error:', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
