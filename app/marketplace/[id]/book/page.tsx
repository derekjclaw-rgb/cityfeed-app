'use client'

/**
 * Booking page — date selection, price calc, Stripe checkout
 */
import { useState, useMemo, useEffect, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Shield, Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function BookPageInner() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const listingId = params.id as string

  const [listing, setListing] = useState<{ title: string; price_per_day: number; city: string; state: string; min_days: number; max_days: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState<string | null>(null)

  // Pre-fill from query params if coming from listing detail
  const [startDate, setStartDate] = useState(searchParams.get('start') ?? '')
  const [endDate, setEndDate] = useState(searchParams.get('end') ?? '')

  useEffect(() => {
    const supabase = createClient()

    // Auth check
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push(`/login?redirect=/marketplace/${listingId}/book`)
        return
      }
      setUserId(data.user.id)
    })

    // Load listing
    supabase
      .from('listings')
      .select('title, price_per_day, city, state, min_days, max_days')
      .eq('id', listingId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setError('Listing not found')
        } else {
          setListing(data)
        }
        setLoading(false)
      })
  }, [listingId, router])

  const { days, subtotal, buyerFee, total } = useMemo(() => {
    if (!startDate || !endDate || !listing) return { days: 0, subtotal: 0, buyerFee: 0, total: 0 }
    const start = new Date(startDate)
    const end = new Date(endDate)
    const days = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
    const subtotal = days * listing.price_per_day
    const buyerFee = Math.round(subtotal * 0.07)
    return { days, subtotal, buyerFee, total: subtotal + buyerFee }
  }, [startDate, endDate, listing])

  async function handleCheckout() {
    if (!userId || !listing || days < 1) return
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId,
          startDate,
          endDate,
          days,
          total,
          userId,
          listingTitle: listing.title,
          pricePerDay: listing.price_per_day,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Checkout failed')
        setSubmitting(false)
        return
      }

      // Redirect to Stripe
      window.location.href = data.url
    } catch {
      setError('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: '#e6e6dd' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#e6964d' }} />
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: '#e6e6dd' }}>
        <div className="text-center">
          <p className="text-sm mb-4" style={{ color: '#888' }}>Listing not found</p>
          <Link href="/marketplace" className="text-sm font-medium" style={{ color: '#e6964d' }}>← Back to marketplace</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-16 pb-20" style={{ backgroundColor: '#e6e6dd' }}>
      <div className="max-w-lg mx-auto px-6 py-8">
        <Link href={`/marketplace/${listingId}`} className="flex items-center gap-2 text-sm mb-8 hover:opacity-70" style={{ color: '#888' }}>
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to listing
        </Link>

        <h1 className="text-2xl font-bold mb-2" style={{ color: '#2b2b2b' }}>Confirm your booking</h1>
        <p className="text-sm mb-8" style={{ color: '#888' }}>{listing.title} · {listing.city}, {listing.state}</p>

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2 mb-6" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="rounded-2xl p-6 space-y-5 mb-6" style={{ backgroundColor: '#fff', border: '1px solid #d4d4c9', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <h2 className="font-semibold" style={{ color: '#2b2b2b' }}>Select dates</h2>
          <div>
            <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#888' }}>Start Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#888' }} />
              <input
                type="date"
                min={today}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none"
                style={{ backgroundColor: '#f4f4f0', border: '1px solid #d4d4c9', color: '#2b2b2b' }}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#888' }}>End Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#888' }} />
              <input
                type="date"
                min={startDate || today}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none"
                style={{ backgroundColor: '#f4f4f0', border: '1px solid #d4d4c9', color: '#2b2b2b' }}
              />
            </div>
          </div>
        </div>

        {days > 0 && (
          <div className="rounded-2xl p-6 mb-6" style={{ backgroundColor: '#fff', border: '1px solid #d4d4c9', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <h2 className="font-semibold mb-4" style={{ color: '#2b2b2b' }}>Price breakdown</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between" style={{ color: '#555' }}>
                <span>${listing.price_per_day}/day × {days} day{days !== 1 ? 's' : ''}</span>
                <span>${subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between" style={{ color: '#888' }}>
                <span>Buyer fee (7%)</span>
                <span>${buyerFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-3" style={{ borderTop: '1px solid #d4d4c9', color: '#2b2b2b' }}>
                <span>Total due today</span>
                <span>${total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleCheckout}
          disabled={!startDate || !endDate || days < 1 || submitting}
          className="w-full font-semibold py-4 rounded-xl hover:opacity-90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base mb-4"
          style={{ backgroundColor: '#e6964d', color: '#fff', boxShadow: '0 4px 16px rgba(230,150,77,0.35)' }}
        >
          {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
          {submitting ? 'Redirecting to payment...' : days > 0 ? `Confirm & Pay $${total.toLocaleString()}` : 'Select dates to continue'}
        </button>

        <div className="flex items-center justify-center gap-2 text-xs" style={{ color: '#888' }}>
          <Shield className="w-3.5 h-3.5" />
          Secured by Stripe · 7-day cancellation policy
        </div>
      </div>
    </div>
  )
}

export default function BookPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: '#e6e6dd' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#e6964d' }} />
      </div>
    }>
      <BookPageInner />
    </Suspense>
  )
}
