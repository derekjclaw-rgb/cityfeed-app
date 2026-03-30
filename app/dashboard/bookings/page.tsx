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
  CheckCircle, XCircle, Upload, Receipt, DollarSign, Clock
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Booking {
  id: string
  status: string
  start_date: string
  end_date: string
  total_price: number
  payout_amount?: number
  created_at: string
  listing_id: string
  listing_title: string
  other_party_name: string
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
    bg: '#f0f8f5', text: '#7ecfc0',
    label: 'Proof of Posting Submitted', description: 'Proof of posting awaiting your approval',
  },
  pop_review: {
    bg: '#f0f8f5', text: '#7ecfc0',
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

const TIMELINE_STEPS = [
  { key: 'pending_payment', label: 'Payment' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'active', label: 'Live' },
  { key: 'pop_pending', label: 'Proof Review' },
  { key: 'completed', label: 'Done' },
]

function getTimelineStep(status: string): number {
  const map: Record<string, number> = {
    pending_payment: 0,
    pending: 0,
    confirmed: 1,
    active: 2,
    pop_pending: 3,
    pop_review: 3,
    completed: 4,
    cancelled: -1,
    disputed: -1,
  }
  return map[status] ?? 0
}

function StatusTimeline({ status }: { status: string }) {
  if (status === 'cancelled' || status === 'disputed') return null
  const current = getTimelineStep(status)

  return (
    <div className="mt-3 mb-1">
      <div className="flex items-center gap-0">
        {TIMELINE_STEPS.map((step, i) => (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: i <= current ? '#7ecfc0' : '#e8e8e0',
                  border: `2px solid ${i <= current ? '#7ecfc0' : '#e0e0d8'}`,
                }}
              >
                {i < current && (
                  <CheckCircle className="w-2.5 h-2.5" style={{ color: '#fff' }} />
                )}
              </div>
              <span className="text-xs" style={{ color: i <= current ? '#7ecfc0' : '#aaa', whiteSpace: 'nowrap' }}>
                {step.label}
              </span>
            </div>
            {i < TIMELINE_STEPS.length - 1 && (
              <div
                className="flex-1 h-0.5 mb-4 mx-1"
                style={{ backgroundColor: i < current ? '#7ecfc0' : '#e8e8e0' }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function BookingsPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [isHost, setIsHost] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

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
          id, status, start_date, end_date, total_price, payout_amount, created_at, listing_id,
          listings(title),
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
        payout_amount: b.payout_amount as number | undefined,
        created_at: b.created_at as string,
        listing_id: b.listing_id as string,
        listing_title: (b.listings as { title?: string } | null)?.title ?? 'Listing',
        other_party_name: host
          ? ((b.advertiser as { full_name?: string } | null)?.full_name ?? 'Advertiser')
          : ((b.host as { full_name?: string } | null)?.full_name ?? 'Host'),
      }))

      setBookings(mapped)
      setLoading(false)
    }

    load()
  }, [router])

  async function handleHostAction(bookingId: string, newStatus: 'confirmed' | 'cancelled') {
    setActionLoading(bookingId + newStatus)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('bookings').update({ status: newStatus }).eq('id', bookingId)

    if (newStatus === 'confirmed' && user) {
      // Fetch booking details for auto-message
      const { data: booking } = await supabase
        .from('bookings')
        .select('advertiser_id, listing_id, start_date, end_date, listings(title)')
        .eq('id', bookingId)
        .single()

      if (booking) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const b = booking as any
        const listingTitle = b.listings?.title ?? 'your listing'

        // Auto-message to advertiser with next steps
        await supabase.from('messages').insert({
          booking_id: bookingId,
          sender_id: user.id,
          recipient_id: b.advertiser_id,
          content: `✅ Great news — your booking has been approved!\n\nNext steps:\n1. Upload your creative files\n2. Review the creative specs on the listing page\n3. I'll begin setup once I receive your materials\n\nFeel free to message me with any questions!`,
        })

        // Insert notification for advertiser
        await supabase.from('notifications').insert({
          user_id: b.advertiser_id,
          type: 'booking_approved',
          title: `Your booking was approved!`,
          body: `"${listingTitle}" — ${b.start_date} → ${b.end_date}`,
          href: `/dashboard/bookings/${bookingId}`,
        })

        // Send email to advertiser
        try {
          const { data: advertiserProfile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', b.advertiser_id)
            .single()

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
        } catch {
          // Email failure non-fatal
        }
      }
    }

    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b))
    setActionLoading(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: '#f0f0ec' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#7ecfc0' }} />
      </div>
    )
  }

  // Group by active/completed/cancelled for better UX
  const active = bookings.filter(b => !['completed', 'cancelled', 'disputed'].includes(b.status))
  const completed = bookings.filter(b => b.status === 'completed')
  const cancelled = bookings.filter(b => ['cancelled', 'disputed'].includes(b.status))

  const totalEarnings = isHost
    ? completed.reduce((sum, b) => sum + (b.payout_amount ?? b.total_price * 0.93), 0)
    : 0

  return (
    <div className="min-h-screen pt-20 px-4 sm:px-6 pb-12" style={{ backgroundColor: '#f0f0ec' }}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard" className="hover:opacity-70" style={{ color: '#888' }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#2b2b2b' }}>
              {isHost ? 'Bookings' : 'My Campaigns'}
            </h1>
            <p className="text-sm" style={{ color: '#888' }}>
              {bookings.length} total booking{bookings.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Host earnings summary */}
        {isHost && completed.length > 0 && (
          <div className="rounded-2xl p-5 mb-6 flex items-center gap-4"
            style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div className="p-3 rounded-xl" style={{ backgroundColor: '#f0fdf4' }}>
              <DollarSign className="w-6 h-6" style={{ color: '#16a34a' }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: '#2b2b2b' }}>
                ${totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-sm" style={{ color: '#888' }}>Total earnings from {completed.length} completed booking{completed.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        )}

        {bookings.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <ClipboardList className="w-12 h-12 mx-auto mb-4" style={{ color: '#e0e0d8' }} />
            <h2 className="text-lg font-semibold mb-2" style={{ color: '#2b2b2b' }}>
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
              style={{ backgroundColor: '#debb73', color: '#2b2b2b' }}
            >
              {isHost ? 'Create a Listing' : 'Browse Marketplace'}
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active bookings */}
            {active.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold mb-3 px-1" style={{ color: '#888' }}>
                  ACTIVE ({active.length})
                </h2>
                <div className="space-y-4">
                  {active.map(booking => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      isHost={isHost}
                      onHostAction={handleHostAction}
                      actionLoading={actionLoading}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Completed bookings */}
            {completed.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold mb-3 px-1" style={{ color: '#888' }}>
                  COMPLETED ({completed.length})
                </h2>
                <div className="space-y-4">
                  {completed.map(booking => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      isHost={isHost}
                      onHostAction={handleHostAction}
                      actionLoading={actionLoading}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Cancelled/Disputed */}
            {cancelled.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold mb-3 px-1" style={{ color: '#888' }}>
                  CANCELLED / DISPUTED ({cancelled.length})
                </h2>
                <div className="space-y-4">
                  {cancelled.map(booking => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      isHost={isHost}
                      onHostAction={handleHostAction}
                      actionLoading={actionLoading}
                    />
                  ))}
                </div>
              </section>
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
  onHostAction,
  actionLoading,
}: {
  booking: Booking
  isHost: boolean
  onHostAction: (id: string, status: 'confirmed' | 'cancelled') => void
  actionLoading: string | null
}) {
  const statusConfig = STATUS_CONFIG[booking.status] ?? { bg: '#f8f8f5', text: '#888', label: booking.status, description: '' }
  const canReview = booking.status === 'completed'
  const showAcceptDecline = isHost && booking.status === 'pending'
  const showPOPPrompt = isHost && booking.status === 'active'
  const showCancelBtn = ['confirmed', 'pending'].includes(booking.status)
  const showReceipt = booking.status === 'completed'
  const showPOPReview = !isHost && (booking.status === 'pop_pending' || booking.status === 'pop_review')

  const earnings = isHost && booking.status === 'completed'
    ? (booking.payout_amount ?? booking.total_price * 0.93)
    : null

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      {/* Top row */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate" style={{ color: '#2b2b2b' }}>{booking.listing_title}</h3>
          <p className="text-xs mt-0.5" style={{ color: '#888' }}>
            {isHost ? `Advertiser: ${booking.other_party_name}` : `Host: ${booking.other_party_name}`}
          </p>
        </div>
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
          style={{ backgroundColor: statusConfig.bg, color: statusConfig.text }}
        >
          {statusConfig.label}
        </span>
      </div>

      {/* Timeline */}
      <StatusTimeline status={booking.status} />

      {/* Dates + Amount */}
      <div className="flex items-center gap-4 text-xs mt-3" style={{ color: '#888' }}>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {new Date(booking.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          {' — '}
          {new Date(booking.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
        <span className="font-semibold" style={{ color: '#2b2b2b' }}>
          ${booking.total_price?.toLocaleString()}
        </span>
        {earnings !== null && (
          <span className="font-semibold flex items-center gap-1" style={{ color: '#16a34a' }}>
            <DollarSign className="w-3 h-3" />
            ${earnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} earned
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center flex-wrap gap-2 mt-4">
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
            style={{ backgroundColor: '#f0f8f5', border: '1px solid #d0ede9', color: '#7ecfc0' }}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Proof of Posting
          </Link>
        )}

        {/* Advertiser: Review POP */}
        {showPOPReview && (
          <Link
            href={`/dashboard/bookings/${booking.id}/pop-review`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#debb73', color: '#2b2b2b', boxShadow: '0 2px 8px rgba(222,187,115,0.4)' }}
          >
            <CheckCircle className="w-4 h-4" />
            Review Proof of Posting ✅
          </Link>
        )}

        {/* Message */}
        <Link
          href={`/dashboard/messages/${booking.id}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
          style={{ border: '1px solid #e0e0d8', color: '#555' }}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Message
        </Link>

        {/* Review */}
        {canReview && (
          <Link
            href={`/dashboard/bookings/${booking.id}/review`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
            style={{ border: '1px solid #7ecfc0', color: '#7ecfc0' }}
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
            style={{ border: '1px solid #e0e0d8', color: '#555' }}
          >
            <Receipt className="w-3.5 h-3.5" />
            Receipt
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
