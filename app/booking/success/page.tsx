'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface BookingDetails {
  id: string
  start_date: string
  end_date: string
  total_amount: number
  status: string
  listings?: { title: string; city: string; state: string }
}

function SuccessPageInner() {
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('booking_id')
  const [booking, setBooking] = useState<BookingDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!bookingId) { setLoading(false); return }
    const supabase = createClient()
    supabase
      .from('bookings')
      .select('id, start_date, end_date, total_amount, status, listings(title, city, state)')
      .eq('id', bookingId)
      .single()
      .then(({ data }) => {
        if (data) setBooking(data as unknown as BookingDetails)
        setLoading(false)
      })
  }, [bookingId])

  return (
    <div className="min-h-screen flex items-center justify-center pt-20 px-6" style={{ backgroundColor: '#f0f0ec' }}>
      <div className="text-center max-w-md w-full">
        {loading ? (
          <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: '#7ecfc0' }} />
        ) : (
          <>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'rgba(126,207,192,0.12)', border: '2px solid rgba(239,65,53,0.3)' }}>
              <CheckCircle className="w-10 h-10" style={{ color: '#7ecfc0' }} />
            </div>
            <h1 className="text-3xl font-bold mb-3" style={{ color: '#2b2b2b' }}>Booking confirmed!</h1>
            <p className="text-sm mb-6" style={{ color: '#888' }}>
              Your payment was processed successfully. The host has been notified and will get back to you shortly.
            </p>

            {booking && (
              <div className="rounded-2xl p-5 mb-8 text-left" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <h2 className="font-semibold mb-3 text-sm" style={{ color: '#2b2b2b' }}>Booking details</h2>
                {booking.listings && (
                  <p className="text-sm font-medium mb-2" style={{ color: '#2b2b2b' }}>
                    {booking.listings.title}
                  </p>
                )}
                <div className="space-y-1.5 text-sm" style={{ color: '#888' }}>
                  <div className="flex justify-between">
                    <span>Dates</span>
                    <span style={{ color: '#2b2b2b' }}>{booking.start_date} → {booking.end_date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total paid</span>
                    <span className="font-semibold" style={{ color: '#ef4135' }}>${booking.total_amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status</span>
                    <span className="capitalize font-medium" style={{ color: '#2b2b2b' }}>{booking.status}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <Link
                href="/dashboard"
                className="font-semibold px-6 py-3 rounded-xl hover:opacity-90 text-sm"
                style={{ backgroundColor: '#ef4135', color: '#fff' }}
              >
                Go to dashboard
              </Link>
              <Link
                href="/marketplace"
                className="font-semibold px-6 py-3 rounded-xl hover:opacity-90 text-sm"
                style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', color: '#555' }}
              >
                Browse more
              </Link>
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
