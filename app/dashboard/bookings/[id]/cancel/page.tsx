'use client'

/**
 * Cancel Booking page — shows cancellation policy and processes refund
 */
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertCircle, Loader2, CheckCircle, XCircle, Clock, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface BookingInfo {
  id: string
  status: string
  start_date: string
  end_date: string
  total_amount: number
  listing_title: string
  host_id: string
  advertiser_id: string
}

function calcRefund(booking: BookingInfo, userId: string): { amount: number; policy: string; label: string; color: string } {
  const now = new Date()
  const start = new Date(booking.start_date)
  const daysUntil = (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  const total = booking.total_amount

  if (now >= start) {
    return { amount: 0, policy: 'no_refund', label: 'No refund — campaign already started', color: '#dc2626' }
  } else if (daysUntil > 7) {
    return { amount: Math.round(total * 0.95 * 100) / 100, policy: 'full_refund_minus_fee', label: `Full refund minus 5% processing fee — $${(total * 0.95).toFixed(2)}`, color: '#16a34a' }
  } else {
    return { amount: Math.round(total * 0.5 * 100) / 100, policy: 'half_refund', label: `50% refund — $${(total * 0.5).toFixed(2)} (less than 7 days before start)`, color: '#b45309' }
  }
}

export default function CancelBookingPage() {
  const params = useParams()
  const router = useRouter()
  const bookingId = params.id as string

  const [booking, setBooking] = useState<BookingInfo | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const [error, setError] = useState('')
  const [refundInfo, setRefundInfo] = useState<ReturnType<typeof calcRefund> | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data, error: fetchError } = await supabase
        .from('bookings')
        .select('id, status, start_date, end_date, total_amount, host_id, advertiser_id, listings(title)')
        .eq('id', bookingId)
        .single()

      if (fetchError || !data) {
        setError('Booking not found.')
        setLoading(false)
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const b = data as any
      const info: BookingInfo = {
        id: b.id,
        status: b.status,
        start_date: b.start_date,
        end_date: b.end_date,
        total_amount: b.total_amount,
        listing_title: b.listings?.title ?? 'Listing',
        host_id: b.host_id,
        advertiser_id: b.advertiser_id,
      }
      setBooking(info)
      setRefundInfo(calcRefund(info, user.id))
      setLoading(false)
    })
  }, [bookingId, router])

  async function handleCancel() {
    if (!booking || !userId) return
    setCancelling(true)
    setError('')

    try {
      const res = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId, reason, user_id: userId }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Failed to cancel booking')
        setCancelling(false)
        return
      }

      setCancelled(true)
    } catch {
      setError('Something went wrong. Please try again.')
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: '#e6e6dd' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#e6964d' }} />
      </div>
    )
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: '#e6e6dd' }}>
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: '#e6964d' }} />
          <p className="text-sm mb-4" style={{ color: '#888' }}>{error}</p>
          <Link href="/dashboard/bookings" className="text-sm font-medium" style={{ color: '#e6964d' }}>Back to Bookings</Link>
        </div>
      </div>
    )
  }

  if (cancelled) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: '#e6e6dd' }}>
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <CheckCircle className="w-8 h-8" style={{ color: '#16a34a' }} />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#2b2b2b' }}>Booking Cancelled</h2>
          {refundInfo && refundInfo.amount > 0 ? (
            <p className="text-sm mb-6" style={{ color: '#888' }}>
              A refund of <strong>${refundInfo.amount.toFixed(2)}</strong> will appear in 5–10 business days.
            </p>
          ) : (
            <p className="text-sm mb-6" style={{ color: '#888' }}>
              No refund applies per our cancellation policy.
            </p>
          )}
          <Link
            href="/dashboard/bookings"
            className="inline-block px-6 py-3 rounded-xl font-semibold text-sm"
            style={{ backgroundColor: '#e6964d', color: '#fff' }}
          >
            Back to Bookings
          </Link>
        </div>
      </div>
    )
  }

  const daysUntilStart = booking
    ? (new Date(booking.start_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    : 0

  return (
    <div className="min-h-screen pt-20 px-4 sm:px-6 pb-12" style={{ backgroundColor: '#e6e6dd' }}>
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard/bookings" className="hover:opacity-70" style={{ color: '#888' }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#2b2b2b' }}>Cancel Booking</h1>
            <p className="text-sm" style={{ color: '#888' }}>{booking?.listing_title}</p>
          </div>
        </div>

        <div className="rounded-2xl p-6 mb-4" style={{ backgroundColor: '#fff', border: '1px solid #d4d4c9', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          {/* Booking summary */}
          <div className="mb-6 pb-6" style={{ borderBottom: '1px solid #f0f0ea' }}>
            <h3 className="font-semibold mb-3" style={{ color: '#2b2b2b' }}>Booking Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: '#888' }}>Listing</span>
                <span style={{ color: '#2b2b2b' }}>{booking?.listing_title}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: '#888' }}>Campaign start</span>
                <span style={{ color: '#2b2b2b' }}>
                  {booking && new Date(booking.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: '#888' }}>Days until start</span>
                <span style={{ color: '#2b2b2b' }}>
                  {daysUntilStart > 0 ? `${Math.floor(daysUntilStart)} days` : 'Campaign started'}
                </span>
              </div>
              <div className="flex justify-between font-semibold">
                <span style={{ color: '#888' }}>Total paid</span>
                <span style={{ color: '#2b2b2b' }}>${booking?.total_amount?.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Refund info */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: '#2b2b2b' }}>
              <Info className="w-4 h-4" style={{ color: '#e6964d' }} />
              Refund Policy
            </h3>
            <div className="space-y-2">
              {[
                { condition: '7+ days before start', result: 'Full refund minus 5% processing fee', current: daysUntilStart > 7 },
                { condition: 'Less than 7 days before start', result: '50% refund', current: daysUntilStart > 0 && daysUntilStart <= 7 },
                { condition: 'After campaign starts', result: 'No refund', current: daysUntilStart <= 0 },
              ].map(({ condition, result, current }) => (
                <div
                  key={condition}
                  className="flex items-start gap-3 p-3 rounded-xl"
                  style={{
                    backgroundColor: current ? '#fef3e8' : '#f8f8f5',
                    border: `1px solid ${current ? '#fde8c8' : '#e8e8e0'}`,
                  }}
                >
                  <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: current ? '#e6964d' : '#aaa' }} />
                  <div>
                    <p className="text-xs font-semibold" style={{ color: current ? '#e6964d' : '#888' }}>{condition}</p>
                    <p className="text-xs" style={{ color: current ? '#2b2b2b' : '#aaa' }}>{result}</p>
                  </div>
                  {current && <span className="ml-auto text-xs font-bold" style={{ color: '#e6964d' }}>← Applies</span>}
                </div>
              ))}
            </div>

            {refundInfo && (
              <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: '#f8f8f5', border: '1px solid #e8e8e0' }}>
                <p className="text-sm font-semibold" style={{ color: refundInfo.color }}>
                  Your refund: {refundInfo.amount > 0 ? `$${refundInfo.amount.toFixed(2)}` : 'No refund'}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#888' }}>{refundInfo.label}</p>
              </div>
            )}
          </div>

          {/* Reason */}
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2" style={{ color: '#2b2b2b' }}>
              Reason for cancellation <span style={{ color: '#aaa' }}>(optional)</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              placeholder="Let us know why you're cancelling..."
              className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none resize-none"
              style={{ backgroundColor: '#f4f4f0', border: '1px solid #d4d4c9', color: '#2b2b2b' }}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm mb-4" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Link
              href="/dashboard/bookings"
              className="flex-1 text-center py-3 rounded-xl font-semibold text-sm hover:opacity-80 transition-opacity"
              style={{ border: '1px solid #d4d4c9', color: '#555' }}
            >
              Keep Booking
            </Link>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex-1 font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: '#dc2626', color: '#fff' }}
            >
              {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              {cancelling ? 'Cancelling...' : 'Cancel Booking'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
