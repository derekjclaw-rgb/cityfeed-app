'use client'

/**
 * Booking page — date selection, price calc, Stripe checkout
 */
import { useState, useMemo, useEffect, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Shield, Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { MOCK_LISTINGS } from '../../page'
import DateRangePicker from '@/components/DateRangePicker'

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
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authName, setAuthName] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  // Pre-fill from query params if coming from listing detail
  const [startDate, setStartDate] = useState(searchParams.get('start') ?? '')
  const [endDate, setEndDate] = useState(searchParams.get('end') ?? '')

  useEffect(() => {
    const supabase = createClient()

    // Check auth silently — don't redirect
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id)
      }
    })

    // Load listing — try Supabase first, fall back to mock data
    supabase
      .from('listings')
      .select('title, price_per_day, city, state, min_days, max_days')
      .eq('id', listingId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          // Fall back to mock listings for test environment
          const mock = MOCK_LISTINGS.find(l => l.id === listingId)
          if (mock) {
            setListing({
              title: mock.title,
              price_per_day: mock.price_per_day,
              city: mock.city,
              state: mock.state,
              min_days: 1,
              max_days: 365,
            })
          } else {
            setError('Listing not found')
          }
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

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError('')
    const supabase = createClient()

    if (authMode === 'login') {
      const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword })
      if (error) { setAuthError(error.message); setAuthLoading(false); return }
      setUserId(data.user?.id ?? null)
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword,
        options: { data: { full_name: authName, role: 'advertiser' } }
      })
      if (error) { setAuthError(error.message); setAuthLoading(false); return }
      setUserId(data.user?.id ?? null)
    }
    setAuthLoading(false)
    setShowAuthModal(false)
  }

  async function handleCheckout() {
    if (!listing || days < 1) return
    // If not logged in, show auth modal instead of redirecting
    if (!userId) { setShowAuthModal(true); return }
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: '#f0f0ec' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#7ecfc0' }} />
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: '#f0f0ec' }}>
        <div className="text-center">
          <p className="text-sm mb-4" style={{ color: '#888' }}>Listing not found</p>
          <Link href="/marketplace" className="text-sm font-medium" style={{ color: '#7ecfc0' }}>← Back to marketplace</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-16 pb-20" style={{ backgroundColor: '#f0f0ec' }}>
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

        <div className="rounded-2xl p-6 space-y-4 mb-6" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <h2 className="font-semibold" style={{ color: '#2b2b2b' }}>Select dates</h2>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={(start, end) => { setStartDate(start); setEndDate(end) }}
            placeholder="Pick start & end date"
          />
        </div>

        {days > 0 && (
          <div className="rounded-2xl p-6 mb-6" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
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
              <div className="flex justify-between font-bold text-base pt-3" style={{ borderTop: '1px solid #e0e0d8', color: '#2b2b2b' }}>
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
          style={{ backgroundColor: '#ef4135', color: '#fff', boxShadow: '0 4px 16px rgba(239,65,53,0.35)' }}
        >
          {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
          {submitting ? 'Redirecting to payment...' : days > 0 ? `Confirm & Pay $${total.toLocaleString()}` : 'Select dates to continue'}
        </button>

        <div className="flex items-center justify-center gap-2 text-xs" style={{ color: '#888' }}>
          <Shield className="w-3.5 h-3.5" />
          Secured by Stripe · 7-day cancellation policy
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold" style={{ color: '#2b2b2b' }}>
                {authMode === 'login' ? 'Sign in to continue' : 'Create an account'}
              </h2>
              <button onClick={() => setShowAuthModal(false)} className="text-xl" style={{ color: '#888' }}>✕</button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#555' }}>Full name</label>
                  <input type="text" required value={authName} onChange={e => setAuthName(e.target.value)} placeholder="Your name" className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none" style={{ backgroundColor: '#f8f8f5', border: '1px solid #e0e0d8', color: '#2b2b2b' }} />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#555' }}>Email</label>
                <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none" style={{ backgroundColor: '#f8f8f5', border: '1px solid #e0e0d8', color: '#2b2b2b' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#555' }}>Password</label>
                <input type="password" required value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="••••••••" className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none" style={{ backgroundColor: '#f8f8f5', border: '1px solid #e0e0d8', color: '#2b2b2b' }} />
              </div>

              {authError && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2">{authError}</p>}

              <button type="submit" disabled={authLoading} className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: '#ef4135', color: '#fff' }}>
                {authLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {authMode === 'login' ? 'Sign in' : 'Create account'}
              </button>
            </form>

            <p className="text-center text-sm mt-4" style={{ color: '#888' }}>
              {authMode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError('') }} className="font-medium" style={{ color: '#7ecfc0' }}>
                {authMode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function BookPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: '#f0f0ec' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#7ecfc0' }} />
      </div>
    }>
      <BookPageInner />
    </Suspense>
  )
}
