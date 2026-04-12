'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Clock, Loader2, Upload, MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/** Derive a human-readable confirmation code from a booking UUID */
function confirmationCode(bookingId: string): string {
  return 'CF-' + bookingId.replace(/-/g, '').substring(0, 6).toUpperCase()
}

interface BookingDetails {
  id: string
  start_date: string
  end_date: string
  total_price: number
  status: string
  listings?: { title: string; city: string; state: string }
}

function SuccessPageInner() {
  const searchParams = useSearchParams()
  const bookingIdParam = searchParams.get('booking_id')
  const sessionId = searchParams.get('session_id')

  const [booking, setBooking] = useState<BookingDetails | null>(null)
  const [resolvedBookingId, setResolvedBookingId] = useState<string | null>(
    bookingIdParam && bookingIdParam !== 'pending' ? bookingIdParam : null
  )
  const [loading, setLoading] = useState(true)
  const [polling, setPolling] = useState(bookingIdParam === 'pending')

  const pollCountRef = useRef(0)
  const MAX_POLLS = 20 // 20 × 1.5s ≈ 30s max

  // ─── Resolve booking_id when 'pending' ───────────────────────────────────
  useEffect(() => {
    if (!polling || !sessionId) return

    let cancelled = false

    async function pollForBooking() {
      while (pollCountRef.current < MAX_POLLS && !cancelled) {
        await new Promise((r) => setTimeout(r, 1500))
        if (cancelled) break

        try {
          const res = await fetch(`/api/checkout/booking-status?session_id=${sessionId}`)
          const data = await res.json()

          if (data.booking_id) {
            if (!cancelled) {
              setResolvedBookingId(data.booking_id)
              setPolling(false)
            }
            return
          }
        } catch {
          // network hiccup — keep retrying
        }

        pollCountRef.current += 1
      }

      // Timed out — stop polling, show page without booking details
      if (!cancelled) setPolling(false)
    }

    pollForBooking()
    return () => { cancelled = true }
  }, [polling, sessionId])

  // ─── Re-establish auth session after returning from Stripe ────────────────
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession()
  }, [])

  // ─── Fetch booking details once ID is resolved ───────────────────────────
  useEffect(() => {
    if (!resolvedBookingId) {
      if (!polling) setLoading(false)
      return
    }

    const supabase = createClient()
    supabase
      .from('bookings')
      .select('id, start_date, end_date, total_price, status, listings(title, city, state)')
      .eq('id', resolvedBookingId)
      .single()
      .then(({ data }) => {
        if (data) setBooking(data as unknown as BookingDetails)
        setLoading(false)
      })
  }, [resolvedBookingId, polling])

  // Still resolving booking ID
  const isProcessing = polling
  const isPending = booking?.status === 'pending'

  return (
    <div className="min-h-screen flex items-center justify-center pt-20 px-6" style={{ backgroundColor: '#f0f0ec' }}>
      <div className="text-center max-w-md w-full">
        {loading || isProcessing ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#7ecfc0' }} />
            {isProcessing && (
              <p className="text-sm" style={{ color: '#888' }}>Processing your booking…</p>
            )}
          </div>
        ) : (
          <>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: isPending ? 'rgba(222,187,115,0.12)' : 'rgba(126,207,192,0.12)', border: `2px solid ${isPending ? 'rgba(222,187,115,0.3)' : 'rgba(126,207,192,0.3)'}` }}>
              {isPending ? <Clock className="w-10 h-10" style={{ color: '#debb73' }} /> : <CheckCircle className="w-10 h-10" style={{ color: '#7ecfc0' }} />}
            </div>
            <h1 className="text-3xl font-bold mb-3" style={{ color: '#2b2b2b' }}>{isPending ? 'Booking submitted — awaiting host approval' : 'Booking confirmed!'}</h1>
            {resolvedBookingId && (
              <p className="text-sm font-mono font-semibold mb-2" style={{ color: '#7ecfc0' }}>
                {confirmationCode(resolvedBookingId)}
              </p>
            )}
            <p className="text-sm mb-6" style={{ color: '#888' }}>
              {isPending
                ? 'Your payment was processed successfully. The host will review your request within 24 hours.'
                : 'Your payment was processed successfully. The host has been notified.'}
            </p>

            {booking && (
              <div className="rounded-2xl p-5 mb-6 text-left" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <h2 className="font-semibold mb-3 text-sm" style={{ color: '#2b2b2b' }}>Booking details</h2>
                {booking.listings && (
                  <p className="text-sm font-medium mb-2" style={{ color: '#2b2b2b' }}>
                    {booking.listings.title}
                  </p>
                )}
                <div className="space-y-1.5 text-sm" style={{ color: '#888' }}>
                  <div className="flex justify-between">
                    <span>Dates</span>
                    <span style={{ color: '#2b2b2b' }}>
                      {new Date(booking.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      {' → '}
                      {new Date(booking.end_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total paid</span>
                    <span className="font-semibold" style={{ color: '#debb73' }}>${booking.total_price?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status</span>
                    <span className="font-medium" style={{ color: '#2b2b2b' }}>{{
                      pending: 'Pending Review',
                      confirmed: 'Confirmed',
                      active: 'Active',
                      completed: 'Completed',
                      cancelled: 'Cancelled',
                      pop_pending: 'Awaiting Proof of Posting',
                      pop_review: 'Proof of Posting Under Review',
                      disputed: 'Disputed',
                    }[booking.status] ?? booking.status}</span>
                  </div>
                </div>
              </div>
            )}

            {/* What's Next section */}
            <div className="rounded-2xl p-5 mb-6 text-left" style={{ backgroundColor: isPending ? '#fef9ec' : '#f0f8f5', border: `1px solid ${isPending ? '#f5e6b8' : '#d0ede9'}` }}>
              <h3 className="font-semibold text-sm mb-3" style={{ color: '#2b2b2b' }}>What happens next</h3>
              {isPending ? (
                <ol className="space-y-2.5 text-sm" style={{ color: '#555' }}>
                  <li className="flex gap-3">
                    <span className="font-bold w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5" style={{ backgroundColor: '#debb73', color: '#fff' }}>1</span>
                    <span>The host will review your request within 24 hours</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5" style={{ backgroundColor: '#debb73', color: '#fff' }}>2</span>
                    <span>You&apos;ll be notified once the host approves your booking</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5" style={{ backgroundColor: '#debb73', color: '#fff' }}>3</span>
                    <span>After approval, upload your creative files to get started</span>
                  </li>
                </ol>
              ) : (
                <ol className="space-y-2.5 text-sm" style={{ color: '#555' }}>
                  <li className="flex gap-3">
                    <span className="font-bold w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5" style={{ backgroundColor: '#7ecfc0', color: '#fff' }}>1</span>
                    <span>Upload your creative files in the booking dashboard</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5" style={{ backgroundColor: '#7ecfc0', color: '#fff' }}>2</span>
                    <span>The host will review your materials and begin setup</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5" style={{ backgroundColor: '#7ecfc0', color: '#fff' }}>3</span>
                    <span>You&apos;ll receive proof of posting when your ad goes live</span>
                  </li>
                </ol>
              )}
            </div>

            <div className="flex gap-3 justify-center">
              {resolvedBookingId ? (
                <Link
                  href={isPending ? '/dashboard/bookings' : `/dashboard/bookings/${resolvedBookingId}`}
                  className="flex items-center gap-2 font-semibold px-5 py-3 rounded-xl hover:opacity-90 text-sm"
                  style={{ backgroundColor: '#debb73', color: '#2b2b2b' }}
                >
                  {isPending ? null : <Upload className="w-4 h-4" />}
                  {isPending ? 'View Bookings' : 'Upload Creative'}
                </Link>
              ) : (
                <Link
                  href="/dashboard/bookings"
                  className="font-semibold px-5 py-3 rounded-xl hover:opacity-90 text-sm"
                  style={{ backgroundColor: '#debb73', color: '#2b2b2b' }}
                >
                  View Bookings
                </Link>
              )}
              {resolvedBookingId && (
                <Link
                  href={`/dashboard/messages/${resolvedBookingId}`}
                  className="flex items-center gap-2 font-semibold px-5 py-3 rounded-xl hover:opacity-90 text-sm"
                  style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', color: '#555' }}
                >
                  <MessageSquare className="w-4 h-4" />
                  Message Host
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: '#f0f0ec' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#7ecfc0' }} />
      </div>
    }>
      <SuccessPageInner />
    </Suspense>
  )
}
