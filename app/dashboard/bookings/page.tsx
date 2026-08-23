'use client'

/**
 * Bookings list — shows all bookings for current user (host or advertiser)
 * Enhanced: status badges, timeline, accept/decline (host), POP prompt, earnings
 */
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, ClipboardList, Loader2, MessageSquare, Star, ExternalLink,
  CheckCircle, XCircle, Upload, Receipt, DollarSign, Clock, Zap
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getBookingFinancials, formatBookingDate } from '@/lib/fees'
import { notify } from '@/lib/notify'
import { getBookingDisplayStatus, windowStarted, type BookingStatusInput } from '@/lib/bookingStatus'

/** Format a full name as 'First L.' for privacy */
function formatNamePrivacy(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length < 2) return parts[0] || fullName
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

interface Booking {
  id: string
  status: string
  start_date: string
  end_date: string
  total_price: number
  subtotal?: number | null
  buyer_fee?: number | null
  seller_fee?: number | null
  print_fee_charged?: number | null
  payout_amount?: number
  created_at: string
  listing_id: string
  listing_title: string
  other_party_name: string
  delivery_mode?: 'self_deliver' | 'host_prints' | null
  shipped_at?: string | null
  received_at?: string | null
  dropped_off_at?: string | null
  requires_print?: boolean
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; description: string }> = {
  pending_payment: {
    bg: '#fef9ec', text: '#b45309',
    label: 'Pending Payment', description: 'Awaiting payment confirmation',
  },
  pending: {
    bg: '#fef9ec', text: '#b45309',
    label: 'Pending Review', description: 'Host reviewing your request',
  },
  confirmed: {
    bg: '#eff6ff', text: '#1d4ed8',
    label: 'Confirmed', description: 'Booking confirmed, campaign not yet started',
  },
  active: {
    bg: '#f0fdf4', text: '#16a34a',
    label: 'Active — Campaign Running', description: 'Your campaign is live',
  },
  pop_pending: {
    bg: '#f0f8f5', text: 'var(--mint, #7ecfc0)',
    label: 'Proof of Posting Submitted', description: 'Proof of posting awaiting your approval',
  },
  pop_review: {
    bg: '#f0f8f5', text: 'var(--mint, #7ecfc0)',
    label: 'Proof of Posting Submitted', description: 'Review the proof of posting',
  },
  completed: {
    bg: '#f0fdf4', text: '#16a34a',
    label: 'Completed ✓', description: 'Campaign complete, payout released',
  },
  cancelled: {
    bg: '#fef2f2', text: '#dc2626',
    label: 'Cancelled', description: 'This booking was cancelled',
  },
  disputed: {
    bg: '#fef2f2', text: '#dc2626',
    label: 'Disputed', description: 'Under review by City Feed',
  },
}

/** Derive a human-readable confirmation code from a booking UUID */
function confirmationCode(bookingId: string): string {
  return 'CF-' + bookingId.replace(/-/g, '').substring(0, 6).toUpperCase()
}

/** Human timeline line — "Starts in 2 days", "Ends in 3 days", "Wrapped Aug 13" */
function humanTimeline(b: Booking): string {
  if (['cancelled', 'disputed', 'pending_payment'].includes(b.status)) return ''
  const now = new Date()
  const start = b.start_date ? new Date(b.start_date + 'T00:00:00') : null
  const end = b.end_date ? new Date(b.end_date + 'T23:59:59') : null
  const endDay = b.end_date ? new Date(b.end_date + 'T00:00:00') : null
  const daysUntil = (d: Date) => Math.ceil((d.getTime() - now.getTime()) / 86400000)

  if (b.status === 'completed' && end && now > end) {
    return `Wrapped ${formatBookingDate(b.end_date, { month: 'short', day: 'numeric' })}`
  }
  if (start && end && now >= start && now <= end && ['confirmed', 'active', 'completed', 'pop_pending', 'pop_review'].includes(b.status)) {
    const d = endDay ? daysUntil(endDay) : 0
    return d <= 0 ? 'Ends today' : `Ends in ${d} day${d === 1 ? '' : 's'}`
  }
  if (start && now < start) {
    const d = daysUntil(start)
    return d <= 0 ? 'Starts today' : `Starts in ${d} day${d === 1 ? '' : 's'}`
  }
  return ''
}

// Badge derivation now lives in lib/bookingStatus.ts (getBookingDisplayStatus) —
// the old local getSimpleStatusBadge was removed 2026-08-22 because it contradicted
// the shared derivation (e.g. "Awaiting Creative" pill on an ended, unfulfilled booking).

export default function BookingsPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [isHost, setIsHost] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'action' | 'live' | 'upcoming' | 'completed' | 'cancelled'>('all')
  const [creativeMap, setCreativeMap] = useState<Record<string, boolean>>({})
  // Bumped whenever the dashboard host/advertiser toggle changes — forces a refetch
  // with the new mode (fixed 2026-08-22: page previously read cf_dash_mode only on
  // mount, so toggling while on this page never updated the list).
  const [modeVersion, setModeVersion] = useState(0)

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail === 'host' || detail === 'advertiser') {
        setLoading(true)
        setModeVersion(v => v + 1)
      }
    }
    window.addEventListener('cf_mode_change', handler)
    return () => window.removeEventListener('cf_mode_change', handler)
  }, [])

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Use mode toggle (cf_dash_mode) — same as dashboard/page.tsx
      // Falls back to profile.role for first-time users without a saved mode
      const savedMode = typeof window !== 'undefined' ? localStorage.getItem('cf_dash_mode') : null
      let host: boolean
      if (savedMode === 'host') {
        host = true
      } else if (savedMode === 'advertiser') {
        host = false
      } else {
        // No saved mode — fall back to profile.role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        host = profile?.role === 'host' || profile?.role === 'admin' || profile?.role === 'both'
      }
      setIsHost(host)

      const { data } = await supabase
        .from('bookings')
        .select(`
          id, status, start_date, end_date, total_price, subtotal, buyer_fee, seller_fee, print_fee_charged, payout_amount, created_at, listing_id,
          delivery_mode, shipped_at, received_at, dropped_off_at,
          listings(title, requires_print),
          advertiser:profiles!bookings_advertiser_id_fkey(full_name),
          host:profiles!bookings_host_id_fkey(full_name)
        `)
        .eq(host ? 'host_id' : 'advertiser_id', user.id)
        .order('created_at', { ascending: false })

      const mapped: Booking[] = (data ?? []).map((b: Record<string, unknown>) => ({
        id: b.id as string,
        status: b.status as string,
        start_date: b.start_date as string,
        end_date: b.end_date as string,
        total_price: b.total_price as number,
        subtotal: b.subtotal as number | null,
        buyer_fee: b.buyer_fee as number | null,
        seller_fee: b.seller_fee as number | null,
        print_fee_charged: b.print_fee_charged as number | null,
        payout_amount: b.payout_amount as number | undefined,
        created_at: b.created_at as string,
        listing_id: b.listing_id as string,
        delivery_mode: b.delivery_mode as Booking['delivery_mode'],
        shipped_at: b.shipped_at as string | null,
        received_at: b.received_at as string | null,
        dropped_off_at: b.dropped_off_at as string | null,
        requires_print: (b.listings as { requires_print?: boolean } | null)?.requires_print,
        listing_title: (b.listings as { title?: string } | null)?.title ?? 'Listing',
        other_party_name: host
          ? ((b.advertiser as { full_name?: string } | null)?.full_name ?? 'Advertiser')
          : ((b.host as { full_name?: string } | null)?.full_name ?? 'Host'),
      }))

      setBookings(mapped)
      setLoading(false)

      // Fetch creative presence for bookings where it drives action state / labels
      // (non-blocking — tiles/cards update when it resolves)
      const checkIds = mapped.filter(b => ['confirmed', 'active'].includes(b.status)).map(b => b.id)
      if (checkIds.length > 0) {
        Promise.all(checkIds.map(async id => {
          try {
            const r = await fetch(`/api/collateral/list?bookingId=${id}`)
            const j = await r.json()
            return [id, !!(j.files && j.files.length > 0)] as const
          } catch {
            return [id, false] as const
          }
        })).then(entries => setCreativeMap(Object.fromEntries(entries)))
      }
    }

    load()
  }, [router, modeVersion])

  async function handleHostAction(bookingId: string, newStatus: 'confirmed' | 'cancelled') {
    setActionLoading(bookingId + newStatus)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Fetch booking details for notifications
    const { data: booking } = await supabase
      .from('bookings')
      .select('advertiser_id, host_id, listing_id, start_date, end_date, total_price, stripe_payment_intent_id, listings(title)')
      .eq('id', bookingId)
      .single()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b = booking as any
    const listingTitle = b?.listings?.title ?? 'your listing'

    if (newStatus === 'cancelled') {
      // ── HOST DECLINE — process refund via cancel API ──
      try {
        const res = await fetch('/api/bookings/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            booking_id: bookingId,
            user_id: user?.id,
            reason: 'Host declined booking request',
          }),
        })
        const result = await res.json()
        console.log('[Host Decline] Cancel API result:', result)
      } catch (err) {
        console.error('[Host Decline] Cancel API error:', err)
        // Fallback: at minimum update the status
        await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId)
      }

      if (b) {
        // Notify advertiser of decline — via /api/notify (RLS blocks cross-user inserts from client)
        await notify({
          user_id: b.advertiser_id,
          type: 'booking_declined',
          title: 'Booking request declined',
          body: `"${listingTitle}" — your request was not accepted. A refund has been initiated.`,
          href: `/dashboard/bookings/${bookingId}`,
        })

        // Chat message to advertiser
        await supabase.from('messages').insert({
          booking_id: bookingId,
          sender_id: b.advertiser_id,
          recipient_id: b.advertiser_id,
          content: `❌ Your booking request for "${listingTitle}" was not accepted by the host.\n\nA refund has been initiated and will appear in 5-10 business days.\n\nYou can browse other placements in the marketplace.`,
        })

        // Chat message to host confirming decline
        if (user) {
          await supabase.from('messages').insert({
            booking_id: bookingId,
            sender_id: user.id,
            recipient_id: user.id,
            content: `You declined the booking request for "${listingTitle}". The advertiser has been notified and a refund has been initiated.`,
          })
        }

        // Email advertiser about decline
        try {
          const { data: advertiserProfile } = await supabase
            .from('profiles').select('email').eq('id', b.advertiser_id).single()
          if (advertiserProfile?.email) {
            await fetch('/api/email/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'booking_cancelled',
                recipientEmail: advertiserProfile.email,
                listingTitle,
                dates: `${b.start_date} → ${b.end_date}`,
                role: 'advertiser',
              }),
            })
          }
        } catch { /* non-fatal */ }
      }
    } else {
      // ── HOST ACCEPT ──
      await supabase.from('bookings').update({ status: newStatus }).eq('id', bookingId)

      if (b && user) {
        // Auto-message to advertiser with next steps
        await supabase.from('messages').insert({
          booking_id: bookingId,
          sender_id: user.id,
          recipient_id: b.advertiser_id,
          content: `✅ Great news — your booking has been accepted!\n\nNext steps:\n1. Upload your creative files\n2. Review the creative specs on the booking page\n3. The host will begin setup once materials are received\n\nFeel free to message with any questions!`,
        })

        // Auto-message to host confirming their action
        await supabase.from('messages').insert({
          booking_id: bookingId,
          sender_id: user.id,
          recipient_id: user.id,
          content: `✅ You accepted the booking for "${listingTitle}"\n\n📅 ${b.start_date} → ${b.end_date}\n\nThe advertiser has been notified and will upload their creative files. You'll be notified when materials arrive.`,
        })

        // Notification for advertiser — via /api/notify (RLS blocks cross-user inserts from client)
        await notify({
          user_id: b.advertiser_id,
          type: 'booking_approved',
          title: `Your booking was accepted!`,
          body: `"${listingTitle}" — ${b.start_date} → ${b.end_date}`,
          href: `/dashboard/bookings/${bookingId}`,
        })

        // Notification for host confirming their action
        await notify({
          user_id: user.id,
          type: 'booking_accepted_host',
          title: `Booking accepted`,
          body: `"${listingTitle}" — awaiting creative files from advertiser`,
          href: `/dashboard/bookings/${bookingId}`,
        })

        // Email to advertiser
        try {
          const { data: advertiserProfile } = await supabase
            .from('profiles').select('email').eq('id', b.advertiser_id).single()
          if (advertiserProfile?.email) {
            await fetch('/api/email/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'booking_approved_advertiser',
                advertiserEmail: advertiserProfile.email,
                listingTitle,
                dates: `${b.start_date} → ${b.end_date}`,
                bookingId,
              }),
            })
          }
        } catch { /* non-fatal */ }
      }
    }

    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b))
    setActionLoading(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: 'var(--cream, #f0f0ec)' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--mint, #7ecfc0)' }} />
      </div>
    )
  }

  // Helper: is a booking currently live (within date range)?
  function isBookingLive(b: Booking): boolean {
    const now = new Date()
    const start = b.start_date ? new Date(b.start_date + 'T00:00:00') : null
    const end = b.end_date ? new Date(b.end_date + 'T23:59:59') : null
    // Completed (POP submitted) = live until end date, even if before start
    if (b.status === 'completed') return !!(end && now <= end)
    // Other statuses: live only within date range
    if (['confirmed', 'active'].includes(b.status)) return !!(start && end && now >= start && now < end)
    return false
  }

  function isBookingConfirmed(b: Booking): boolean {
    if (!['confirmed', 'pending', 'active'].includes(b.status)) return false
    const now = new Date()
    const start = b.start_date ? new Date(b.start_date + 'T00:00:00') : null
    return !!(start && now < start)
  }

  function isBookingComplete(b: Booking): boolean {
    if (b.status !== 'completed') return false
    const now = new Date()
    const end = b.end_date ? new Date(b.end_date + 'T00:00:00') : null
    return !!(end && now >= end)
  }

  function isBookingExpired(b: Booking): boolean {
    // Confirmed/pending bookings past their end date — never completed
    if (!['confirmed', 'pending'].includes(b.status)) return false
    const now = new Date()
    const end = b.end_date ? new Date(b.end_date + 'T23:59:59') : null
    return !!(end && now > end)
  }

  // Mutually exclusive buckets
  const live = bookings.filter(b => isBookingLive(b))
  const confirmed = bookings.filter(b => !isBookingLive(b) && isBookingConfirmed(b))
  const completed = bookings.filter(b => !isBookingLive(b) && !isBookingConfirmed(b) && isBookingComplete(b))
  const expired = bookings.filter(b => !isBookingLive(b) && !isBookingConfirmed(b) && !isBookingComplete(b) && isBookingExpired(b))
  const inProgress = bookings.filter(b => !isBookingLive(b) && !isBookingConfirmed(b) && !isBookingComplete(b) && !isBookingExpired(b) && !['cancelled', 'disputed'].includes(b.status))
  const cancelled = bookings.filter(b => ['cancelled', 'disputed'].includes(b.status))

  // ── Needs Action — role-aware via shared status derivation ──────────────
  const needsAction = bookings.filter(b => {
    if (['cancelled', 'disputed'].includes(b.status)) return false
    if (isBookingExpired(b)) return false
    const statusInput: BookingStatusInput = {
      status: b.status, start_date: b.start_date, end_date: b.end_date,
      delivery_mode: b.delivery_mode, shipped_at: b.shipped_at, received_at: b.received_at,
      dropped_off_at: b.dropped_off_at, hasCreativeFiles: creativeMap[b.id] ?? false,
      requires_print: b.requires_print,
    }
    const ds = getBookingDisplayStatus(statusInput, isHost)
    return ds.group === 'needs_action'
  })
  const naIds = new Set(needsAction.map(b => b.id))

  const filterLists: Record<string, Booking[]> = {
    action: needsAction,
    live,
    upcoming: confirmed,
    completed,
    cancelled,
  }
  const FILTER_TITLES: Record<string, string> = {
    action: 'Needs Action',
    live: 'Live',
    upcoming: 'Upcoming',
    completed: 'Completed',
    cancelled: 'Cancelled / Disputed',
  }
  const EMPTY_COPY: Record<string, { title: string; body: string }> = {
    action: { title: "You're all caught up", body: 'Nothing needs your attention right now.' },
    live: isHost
      ? { title: 'No campaigns live yet', body: 'Share your listing to land your next booking.' }
      : { title: 'No live campaigns', body: 'Your next campaign is one booking away.' },
    upcoming: isHost
      ? { title: 'Nothing scheduled yet', body: 'Confirmed bookings will appear here before they go live.' }
      : { title: 'Nothing scheduled yet', body: 'Book a placement and it will appear here before it goes live.' },
    completed: { title: 'No completed campaigns yet', body: 'Wrapped campaigns and receipts will live here.' },
    cancelled: { title: 'No cancelled bookings', body: 'Nothing here — that\u2019s a good thing.' },
  }

  return (
    <div className="min-h-screen pt-20 px-4 sm:px-6 pb-12" style={{ backgroundColor: 'var(--cream, #f0f0ec)' }}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard" className="hover:opacity-70" style={{ color: '#888' }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--charcoal, #2b2b2b)' }}>
              {isHost ? 'Bookings' : 'My Campaigns'}
            </h1>
            <p className="text-sm" style={{ color: '#888' }}>
              {bookings.length} total booking{bookings.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Command Center tiles — stat counts that double as filters */}
        {bookings.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {([
              { key: 'action', label: 'Needs Action', count: needsAction.length },
              { key: 'live', label: 'Live', count: live.length },
              { key: 'upcoming', label: 'Upcoming', count: confirmed.length },
              { key: 'completed', label: 'Completed', count: completed.length },
            ] as const).map(t => {
              const selected = filter === t.key
              const hot = t.key === 'action' && t.count > 0
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setFilter(selected ? 'all' : t.key)}
                  className="rounded-2xl p-4 text-left transition-all hover:shadow-md"
                  style={{
                    backgroundColor: hot ? 'var(--gold-light, #f5edda)' : '#fff',
                    border: selected
                      ? `2px solid ${hot ? 'var(--gold, #debb73)' : 'var(--mint, #7ecfc0)'}`
                      : `1px solid ${hot ? 'var(--gold, #debb73)' : 'var(--border, #e0e0d8)'}`,
                    boxShadow: hot ? '0 2px 12px rgba(222,187,115,0.35)' : '0 1px 4px rgba(0,0,0,0.06)',
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <p className="text-2xl font-bold" style={{ color: hot ? 'var(--gold-dark, #c9a54e)' : 'var(--charcoal, #2b2b2b)' }}>{t.count}</p>
                    {t.key === 'live' && t.count > 0 && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />}
                    {hot && <Zap className="w-4 h-4" style={{ color: 'var(--gold-dark, #c9a54e)' }} />}
                  </div>
                  <p className="text-xs font-semibold mt-1" style={{ color: hot ? 'var(--gold-dark, #c9a54e)' : '#888' }}>{t.label}</p>
                </button>
              )
            })}
          </div>
        )}

        {bookings.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: '#fff', border: '1px solid var(--border, #e0e0d8)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <ClipboardList className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--border, #e0e0d8)' }} />
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--charcoal, #2b2b2b)' }}>
              {isHost ? 'No bookings yet' : 'No campaigns yet'}
            </h2>
            <p className="text-sm mb-6" style={{ color: '#888' }}>
              {isHost
                ? "When advertisers book your listings, they'll appear here."
                : 'Browse the marketplace to find your first placement.'}
            </p>
            <Link
              href={isHost ? '/dashboard/create-listing' : '/marketplace'}
              className="inline-block px-5 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
              style={{ backgroundColor: 'var(--gold, #debb73)', color: 'var(--charcoal, #2b2b2b)' }}
            >
              {isHost ? 'Create a Listing' : 'Browse Marketplace'}
            </Link>
          </div>
        ) : filter !== 'all' ? (
          (() => {
            const list = filterLists[filter] ?? []
            const empty = EMPTY_COPY[filter]
            return (
              <section>
                <div className="flex items-center justify-between mb-3 px-1">
                  <h2 className="text-sm font-semibold" style={{ color: '#555' }}>
                    {FILTER_TITLES[filter]} ({list.length})
                  </h2>
                  <button
                    type="button"
                    onClick={() => setFilter('all')}
                    className="text-xs hover:underline underline-offset-2"
                    style={{ color: '#888' }}
                  >
                    ← All bookings
                  </button>
                </div>
                {list.length === 0 ? (
                  <div className="rounded-2xl p-10 text-center" style={{ backgroundColor: '#fff', border: '1px solid var(--border, #e0e0d8)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    {filter === 'action' ? (
                      <CheckCircle className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--mint, #7ecfc0)' }} />
                    ) : (
                      <ClipboardList className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--border, #e0e0d8)' }} />
                    )}
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--charcoal, #2b2b2b)' }}>{empty.title}</p>
                    <p className="text-xs" style={{ color: '#888' }}>{empty.body}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {list.map(booking => (
                      <BookingCard
                        key={booking.id}
                        booking={booking}
                        isHost={isHost}
                        hasCreative={creativeMap[booking.id] ?? false}
                        onHostAction={handleHostAction}
                        actionLoading={actionLoading}
                      />
                    ))}
                  </div>
                )}
              </section>
            )
          })()
        ) : (
          <div className="space-y-8">
            {[
              { title: 'NEEDS ACTION', list: needsAction, color: 'var(--gold-dark, #c9a54e)', zap: true, pulse: false },
              { title: 'LIVE', list: live.filter(b => !naIds.has(b.id)), color: '#15803d', zap: false, pulse: true },
              { title: 'UPCOMING', list: confirmed.filter(b => !naIds.has(b.id)), color: '#1d4ed8', zap: false, pulse: false },
              { title: 'IN PROGRESS', list: inProgress.filter(b => !naIds.has(b.id)), color: '#b45309', zap: false, pulse: false },
              { title: 'COMPLETED', list: completed, color: '#888', zap: false, pulse: false },
              { title: 'EXPIRED', list: expired, color: '#888', zap: false, pulse: false },
            ].map(sec => sec.list.length > 0 && (
              <section key={sec.title}>
                <h2 className="text-sm font-semibold mb-3 px-1 flex items-center gap-2" style={{ color: sec.color }}>
                  {sec.pulse && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />}
                  {sec.zap && <Zap className="w-3.5 h-3.5" />}
                  {sec.title} ({sec.list.length})
                </h2>
                <div className="space-y-4">
                  {sec.list.map(booking => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      isHost={isHost}
                      hasCreative={creativeMap[booking.id] ?? false}
                      onHostAction={handleHostAction}
                      actionLoading={actionLoading}
                    />
                  ))}
                </div>
              </section>
            ))}

            {/* Cancelled — quiet link, no tile for dead inventory */}
            {cancelled.length > 0 && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setFilter('cancelled')}
                  className="text-xs hover:underline underline-offset-2"
                  style={{ color: '#aaa' }}
                >
                  Cancelled / disputed ({cancelled.length})
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function BookingCard({
  booking,
  isHost,
  hasCreative = false,
  onHostAction,
  actionLoading,
}: {
  booking: Booking
  isHost: boolean
  hasCreative?: boolean
  onHostAction: (id: string, status: 'confirmed' | 'cancelled') => void
  actionLoading: string | null
}) {
  const timeline = humanTimeline(booking)
  // Single source of truth for the pill — same derivation as the hint below
  const ds = getBookingDisplayStatus({
    status: booking.status, start_date: booking.start_date, end_date: booking.end_date,
    delivery_mode: booking.delivery_mode, shipped_at: booking.shipped_at,
    received_at: booking.received_at, dropped_off_at: booking.dropped_off_at,
    hasCreativeFiles: hasCreative, requires_print: booking.requires_print,
  }, isHost)
  const isLiveNow = ds.key === 'live'
  const canReview = booking.status === 'completed'
  const showAcceptDecline = isHost && booking.status === 'pending'
  const showPOPPrompt = isHost && booking.status === 'active'
  // HOSTS ONLY on cards — their cancel is the remedy (100% advertiser refund).
  // Advertiser cancel is deliberately buried: quiet link at the bottom of the
  // booking detail page (standard marketplace practice — protects sales).
  const showCancelBtn = isHost && ['confirmed', 'pending'].includes(booking.status)
  const showReceipt = booking.status === 'completed'
  const showPOPReview = !isHost && (booking.status === 'pop_pending' || booking.status === 'pop_review')

  const earnings = isHost && booking.status === 'completed'
    ? getBookingFinancials(booking).hostPayout
    : null

  function navigateToBooking(e: React.MouseEvent) {
    // Navigate to booking detail unless clicking an interactive element
    const target = e.target as HTMLElement
    if (target.closest('a, button')) return
    window.location.href = `/dashboard/bookings/${booking.id}`
  }

  return (
    <div
      className="rounded-2xl p-5 cursor-pointer hover:shadow-md transition-all min-w-0"
      style={{ backgroundColor: '#fff', border: '1px solid var(--border, #e0e0d8)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
      onClick={navigateToBooking}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate" style={{ color: 'var(--charcoal, #2b2b2b)' }}>{booking.listing_title}</h3>
          <p className="text-xs mt-0.5" style={{ color: '#888' }}>
            {isHost ? `Advertiser: ${formatNamePrivacy(booking.other_party_name)}` : `Host: ${formatNamePrivacy(booking.other_party_name)}`}
          </p>
          <p className="text-xs font-mono font-semibold mt-1" style={{ color: 'var(--mint, #7ecfc0)' }}>{confirmationCode(booking.id)}</p>
        </div>
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 flex items-center gap-1"
          style={{ backgroundColor: ds.bg, color: ds.text }}
        >
          {isLiveNow && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />}
          {ds.label}
        </span>
      </div>

      {/* Dates + Amount */}
      <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs mt-3" style={{ color: '#888' }}>
        <span className="flex items-center gap-1 whitespace-nowrap">
          <Clock className="w-3 h-3 flex-shrink-0" />
          {formatBookingDate(booking.start_date, { month: 'short', day: 'numeric' })}
          {' — '}
          {formatBookingDate(booking.end_date, { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
        <span className="font-semibold" style={{ color: 'var(--charcoal, #2b2b2b)' }}>
          ${booking.total_price?.toLocaleString()}
        </span>
        {timeline && (
          <span className="font-medium" style={{ color: '#555' }}>{timeline}</span>
        )}
        {earnings !== null && (
          <span className="font-semibold flex items-center gap-1" style={{ color: '#16a34a' }}>
            <DollarSign className="w-3 h-3" />
            ${earnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} earned
          </span>
        )}
      </div>

      {/* Status hint — same shared derivation as the pill above */}
      {ds.hint && !['cancelled', 'disputed', 'live', 'completed'].includes(ds.key) && (
        <div className="mt-3 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2" style={{ backgroundColor: ds.bg, color: ds.text }}>
          {ds.group === 'needs_action'
            ? <Clock className="w-3 h-3 flex-shrink-0" />
            : <CheckCircle className="w-3 h-3 flex-shrink-0" />}
          {ds.hint}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center flex-wrap gap-2 mt-4 overflow-hidden">
        {/* Host: Accept/Decline pending bookings */}
        {showAcceptDecline && (
          <>
            <button
              onClick={() => onHostAction(booking.id, 'confirmed')}
              disabled={actionLoading !== null}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a' }}
            >
              {actionLoading === booking.id + 'confirmed'
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <CheckCircle className="w-3.5 h-3.5" />}
              Accept
            </button>
            <button
              onClick={() => onHostAction(booking.id, 'cancelled')}
              disabled={actionLoading !== null}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}
            >
              {actionLoading === booking.id + 'cancelled'
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <XCircle className="w-3.5 h-3.5" />}
              Decline
            </button>
          </>
        )}

        {/* Host: POP upload prompt for active campaigns */}
        {showPOPPrompt && (
          <Link
            href={`/dashboard/bookings/${booking.id}#pop`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 transition-opacity"
            style={{ backgroundColor: '#f0f8f5', border: '1px solid #d0ede9', color: 'var(--mint, #7ecfc0)' }}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Proof of Posting
          </Link>
        )}

        {/* Advertiser: POP submitted — show 'report issue' link */}
        {showPOPReview && (
          <Link
            href={`/dashboard/messages/${booking.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
            style={{ color: '#888', border: '1px solid var(--border, #e0e0d8)' }}
          >
            Report an issue
          </Link>
        )}

        {/* Message */}
        <Link
          href={`/dashboard/messages/${booking.id}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
          style={{ border: '1px solid var(--border, #e0e0d8)', color: '#555' }}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Message
        </Link>

        {/* Review — only visible to advertiser, not host */}
        {canReview && !isHost && (
          <Link
            href={`/dashboard/bookings/${booking.id}/review`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
            style={{ border: '1px solid var(--mint, #7ecfc0)', color: 'var(--mint, #7ecfc0)' }}
          >
            <Star className="w-3.5 h-3.5" />
            Leave Review
          </Link>
        )}

        {/* Receipt */}
        {showReceipt && (
          <Link
            href={`/dashboard/bookings/${booking.id}/receipt`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
            style={{ border: '1px solid var(--border, #e0e0d8)', color: '#555' }}
          >
            <Receipt className="w-3.5 h-3.5" />
            Receipt
          </Link>
        )}

        {/* Book Again — advertiser only, completed bookings */}
        {booking.status === 'completed' && !isHost && (
          <Link
            href={`/marketplace/${booking.listing_id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 transition-opacity"
            style={{ backgroundColor: 'var(--gold-light, #f5edda)', border: '1px solid var(--gold, #debb73)', color: 'var(--gold-dark, #c9a54e)' }}
          >
            🔁 Book Again
          </Link>
        )}

        {/* Cancel */}
        {showCancelBtn && (
          <Link
            href={`/dashboard/bookings/${booking.id}/cancel`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
            style={{ color: '#dc2626' }}
          >
            <XCircle className="w-3.5 h-3.5" />
            Cancel
          </Link>
        )}

        {/* View Listing */}
        <Link
          href={`/marketplace/${booking.listing_id}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
          style={{ color: '#aaa' }}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View Listing
        </Link>
      </div>
    </div>
  )
}
