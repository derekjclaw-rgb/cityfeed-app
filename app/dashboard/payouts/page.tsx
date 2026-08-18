'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, Loader2, ChevronDown, ChevronUp,
  Landmark, Calendar, DollarSign, AlertCircle,
  Banknote,
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface BookingItem {
  booking_id: string | null
  listing_title: string
  short_id: string
  start_date: string | null
  end_date: string | null
  amount: number
}

interface PayoutRow {
  id: string
  amount: number
  status: string
  arrival_date: string | null
  created: string
  bank_last4: string | null
  bookings: BookingItem[]
}

interface PayoutsData {
  connected: boolean
  payouts: PayoutRow[]
  totalEarned: number
  inTransit: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string): string {
  if (!d) return '—'
  const date = d.includes('T') ? new Date(d) : new Date(d + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatShortDate(d: string): string {
  if (!d) return '—'
  const date = d.includes('T') ? new Date(d) : new Date(d + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function PayoutsPage() {
  const router = useRouter()
  const [data, setData] = useState<PayoutsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Auth check
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login')
    })
  }, [router])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/dashboard/payouts')
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        if (res.status === 401) {
          router.push('/login')
          return
        }
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      setData(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { fetchData() }, [fetchData])

  function toggleExpanded(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--mint, #7ecfc0)' }} />
      </div>
    )
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm font-medium mb-6 hover:opacity-70"
          style={{ color: 'var(--text-secondary, #888)' }}
        >
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </button>
        <div
          className="rounded-2xl p-8 text-center"
          style={{ backgroundColor: 'var(--white, #fff)', border: '1px solid var(--border, #e0e0d8)' }}
        >
          <AlertCircle className="w-10 h-10 mx-auto mb-4" style={{ color: 'var(--gold-dark, #c9a54e)' }} />
          <div className="text-lg font-semibold mb-2" style={{ color: 'var(--charcoal, #2b2b2b)' }}>
            Unable to load payouts
          </div>
          <div className="text-sm mb-6" style={{ color: 'var(--text-secondary, #888)' }}>{error}</div>
          <button
            onClick={fetchData}
            className="px-5 py-2.5 rounded-full text-sm font-semibold"
            style={{ backgroundColor: 'var(--charcoal, #2b2b2b)', color: 'var(--cream, #f0f0ec)' }}
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  // ── Not Connected ───────────────────────────────────────────────────────────
  if (data && !data.connected) {
    return (
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm font-medium mb-6 hover:opacity-70"
          style={{ color: 'var(--text-secondary, #888)' }}
        >
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </button>
        <div
          className="rounded-2xl p-10 text-center"
          style={{ backgroundColor: 'var(--white, #fff)', border: '1px solid var(--border, #e0e0d8)' }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: 'var(--gold-light, #f5edda)' }}
          >
            <Landmark className="w-8 h-8" style={{ color: 'var(--gold-dark, #c9a54e)' }} />
          </div>
          <div className="text-xl font-bold mb-2" style={{ color: 'var(--charcoal, #2b2b2b)' }}>
            Connect your bank account
          </div>
          <div className="text-sm mb-6 max-w-sm mx-auto" style={{ color: 'var(--text-secondary, #888)' }}>
            Set up Stripe to receive payouts. Once connected, every bank deposit will be itemized here by booking.
          </div>
          <Link
            href="/dashboard/stripe-onboarding"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all hover:shadow-md"
            style={{ backgroundColor: 'var(--charcoal, #2b2b2b)', color: 'var(--cream, #f0f0ec)' }}
          >
            <Landmark className="w-4 h-4" />
            Set Up Payouts
          </Link>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back nav */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm font-medium mb-6 hover:opacity-70"
        style={{ color: 'var(--text-secondary, #888)' }}
      >
        <ArrowLeft className="w-4 h-4" /> Dashboard
      </button>

      {/* Page header */}
      <div className="mb-8">
        <div className="text-[28px] font-bold tracking-[-0.5px]" style={{ color: 'var(--charcoal, #2b2b2b)' }}>
          Payouts
        </div>
        <div className="text-[15px] mt-1" style={{ color: 'var(--text-secondary, #888)' }}>
          Every bank deposit, broken down by booking
        </div>
      </div>

      {/* ═══ Earnings Summary Card (charcoal bg, gold label) ═══ */}
      <div
        className="rounded-2xl p-7 mb-9 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4"
        style={{ backgroundColor: 'var(--charcoal, #2b2b2b)' }}
      >
        <div>
          <div
            className="text-[13px] font-semibold uppercase tracking-[1.2px] mb-1.5"
            style={{ color: 'var(--gold, #debb73)' }}
          >
            Total Earned
          </div>
          <div
            className="text-[40px] font-bold tracking-[-1px] leading-tight"
            style={{ color: 'var(--cream, #f0f0ec)' }}
          >
            {formatCurrency(data.totalEarned)}
          </div>
        </div>
        {data.inTransit > 0 && (
          <div className="text-right">
            <div className="text-[13px]" style={{ color: '#b5b5ae' }}>
              <span style={{ color: 'var(--mint, #7ecfc0)', fontWeight: 700 }}>
                {formatCurrency(data.inTransit)}
              </span>{' '}
              on the way to your bank
            </div>
          </div>
        )}
      </div>

      {/* ═══ Payout History ═══ */}
      {data.payouts.length > 0 && (
        <div
          className="text-[13px] font-semibold uppercase tracking-[1.2px] mb-3.5"
          style={{ color: 'var(--text-secondary, #888)' }}
        >
          Payout History
        </div>
      )}

      {data.payouts.length === 0 && (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ backgroundColor: 'var(--white, #fff)', border: '1px solid var(--border, #e0e0d8)' }}
        >
          <Banknote className="w-10 h-10 mx-auto mb-4" style={{ color: 'var(--text-tertiary, #9a9a90)' }} />
          <div className="text-lg font-semibold mb-2" style={{ color: 'var(--charcoal, #2b2b2b)' }}>
            No payouts yet
          </div>
          <div className="text-sm" style={{ color: 'var(--text-secondary, #888)' }}>
            Once you submit proof of posting for a booking, your payout will appear here.
          </div>
        </div>
      )}

      <div className="space-y-4">
        {data.payouts.map(payout => {
          const isExpanded = expandedIds.has(payout.id)
          const isPaid = payout.status === 'paid'
          const isInTransit = payout.status === 'in_transit' || payout.status === 'pending'
          const bookingCount = payout.bookings.length

          return (
            <div
              key={payout.id}
              className="rounded-2xl overflow-hidden"
              style={{
                backgroundColor: 'var(--white, #fff)',
                border: '1px solid var(--border, #e0e0d8)',
                boxShadow: '0 1px 3px rgba(43,43,43,0.06)',
              }}
            >
              {/* Payout header — clickable to expand */}
              <button
                onClick={() => toggleExpanded(payout.id)}
                className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-[var(--light-gray,#f8f8f5)] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-[42px] h-[42px] rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'var(--light-gray, #f8f8f5)' }}
                  >
                    <Landmark className="w-5 h-5" style={{ color: 'var(--text-tertiary, #9a9a90)' }} />
                  </div>
                  <div>
                    <div className="text-[16px] font-semibold" style={{ color: 'var(--charcoal, #2b2b2b)' }}>
                      Bank deposit{payout.bank_last4 ? ` \u00B7 ••${payout.bank_last4}` : ''}
                    </div>
                    <div className="text-[13px] mt-0.5" style={{ color: 'var(--text-secondary, #888)' }}>
                      {formatDate(payout.arrival_date ?? payout.created)}
                      {bookingCount > 0 ? ` \u00B7 ${bookingCount} booking${bookingCount !== 1 ? 's' : ''}` : ''}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Status badge */}
                  {isPaid && (
                    <span
                      className="text-xs font-semibold px-3 py-1 rounded-full"
                      style={{ backgroundColor: '#e4f4f0', color: '#2e8b7a' }}
                    >
                      Paid
                    </span>
                  )}
                  {isInTransit && (
                    <span
                      className="text-xs font-semibold px-3 py-1 rounded-full"
                      style={{ backgroundColor: '#faf3e3', color: '#a8842e' }}
                    >
                      In transit
                    </span>
                  )}
                  {!isPaid && !isInTransit && (
                    <span
                      className="text-xs font-semibold px-3 py-1 rounded-full"
                      style={{ backgroundColor: 'var(--light-gray, #f8f8f5)', color: 'var(--text-tertiary, #9a9a90)' }}
                    >
                      {payout.status}
                    </span>
                  )}
                  {/* Amount */}
                  <div className="text-[18px] font-bold" style={{ color: 'var(--charcoal, #2b2b2b)' }}>
                    {formatCurrency(payout.amount)}
                  </div>
                  {/* Chevron */}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-tertiary, #9a9a90)' }} />
                  ) : (
                    <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-tertiary, #9a9a90)' }} />
                  )}
                </div>
              </button>

              {/* Expanded booking breakdown */}
              {isExpanded && (
                <div style={{ borderTop: '1px solid var(--border, #e0e0d8)' }}>
                  <div className="px-6 py-2">
                    {payout.bookings.length > 0 ? (
                      payout.bookings.map((bk, i) => (
                        <div
                          key={bk.booking_id ?? i}
                          className="flex items-center justify-between py-3.5"
                          style={{
                            borderBottom: i < payout.bookings.length - 1
                              ? '1px solid var(--light-gray, #f8f8f5)'
                              : undefined,
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: 'var(--mint-light, #e8f6f3)' }}
                            >
                              <DollarSign className="w-4 h-4" style={{ color: 'var(--mint-dark, #5bb8a8)' }} />
                            </div>
                            <div className="min-w-0">
                              <div
                                className="text-[14px] font-semibold truncate"
                                style={{ color: 'var(--charcoal, #2b2b2b)' }}
                              >
                                {bk.listing_title}
                              </div>
                              <div className="text-[12.5px] mt-0.5" style={{ color: 'var(--text-secondary, #888)' }}>
                                {bk.short_id}
                                {bk.start_date && bk.end_date
                                  ? ` \u00B7 ${formatShortDate(bk.start_date)}\u2013${formatShortDate(bk.end_date)}`
                                  : ''}
                              </div>
                            </div>
                          </div>
                          <div className="text-[14.5px] font-semibold flex-shrink-0 ml-4" style={{ color: 'var(--charcoal, #2b2b2b)' }}>
                            {formatCurrency(bk.amount)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-4 text-center text-sm" style={{ color: 'var(--text-tertiary, #9a9a90)' }}>
                        No booking details available for this payout
                      </div>
                    )}
                  </div>

                  {/* Footer with payout ID */}
                  <div
                    className="flex items-center justify-between px-6 py-3 text-[12.5px]"
                    style={{ color: 'var(--text-tertiary, #9a9a90)', borderTop: '1px solid var(--light-gray, #f8f8f5)' }}
                  >
                    <span>Payout {payout.id.slice(0, 12)}...</span>
                    {payout.bookings.length > 0 && payout.bookings[0].booking_id && (
                      <Link
                        href={`/dashboard/bookings/${payout.bookings[0].booking_id}`}
                        className="font-semibold"
                        style={{ color: 'var(--mint-dark, #5bb8a8)' }}
                      >
                        View booking details
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
