'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, DollarSign, Loader2, Image as ImageIcon, Calendar,
  ChevronDown, ExternalLink,
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface TransactionRow {
  id: string
  ref_code: string
  listing_title: string
  listing_image?: string
  advertiser_name: string
  start_date: string
  end_date: string
  total_price: number
  platform_fee: number
  host_payout: number
  status: string
  end_date_raw: string
  num_days: number
  daily_rate: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatShortDate(d: string): string {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatFullDate(d: string): string {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatName(fullName: string | null | undefined): string {
  if (!fullName) return 'Unknown'
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

function daysBetween(start: string, end: string): number {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1)
}

function getPayoutStatus(bookingStatus: string, startDate: string, endDate: string): { label: string; isPaid: boolean; isCancelled: boolean } {
  const now = new Date()
  const start = startDate ? new Date(startDate + 'T00:00:00') : null
  const end = endDate ? new Date(endDate + 'T00:00:00') : null

  if (bookingStatus === 'cancelled') return { label: 'Cancelled', isPaid: false, isCancelled: true }
  // Completed (POP submitted) = payout released, regardless of dates
  if (bookingStatus === 'completed') return { label: 'Paid', isPaid: true, isCancelled: false }
  // Campaign ended but POP not yet uploaded
  if (end && now > end) return { label: 'Awaiting POP', isPaid: false, isCancelled: false }
  // Campaign currently running
  if (start && end && now >= start && now <= end) return { label: 'Active', isPaid: false, isCancelled: false }
  // Campaign hasn't started yet
  if (start && now < start) return { label: 'Scheduled', isPaid: false, isCancelled: false }
  return { label: 'Pending', isPaid: false, isCancelled: false }
}

function getPayoutDate(bookingStatus: string, startDate: string, endDate: string): string | null {
  const { isPaid } = getPayoutStatus(bookingStatus, startDate, endDate)
  if (!isPaid || !endDate) return null
  const payoutDate = new Date(endDate + 'T00:00:00')
  payoutDate.setDate(payoutDate.getDate() + 3)
  return payoutDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Status Pill ──────────────────────────────────────────────────────────────

function StatusPill({ label }: { label: string }) {
  const styles = label === 'Paid'
    ? { bg: 'var(--green-light, #e8f5ec)', color: 'var(--green, #16a34a)', dot: 'var(--green, #16a34a)' }
    : label === 'Active'
    ? { bg: 'var(--green-light, #e8f5ec)', color: 'var(--green, #16a34a)', dot: 'var(--green, #16a34a)' }
    : label === 'Cancelled'
    ? { bg: '#fce8ea', color: 'var(--red, #E63946)', dot: 'var(--red, #E63946)' }
    : label === 'Awaiting POP'
    ? { bg: '#fef3e2', color: '#d97706', dot: '#d97706' }
    : label === 'Scheduled'
    ? { bg: 'var(--mint-light, #e8f6f3)', color: 'var(--mint-dark, #5bb8a8)', dot: 'var(--mint-dark, #5bb8a8)' }
    : { bg: 'var(--gold-light, #f5edda)', color: 'var(--gold-dark, #c9a54e)', dot: 'var(--gold-dark, #c9a54e)' }

  return (
    <span
      className="inline-flex items-center gap-[4px] px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{ backgroundColor: styles.bg, color: styles.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: styles.dot }} />
      {label}
    </span>
  )
}

// ─── Receipt Panel ────────────────────────────────────────────────────────────

function ReceiptPanel({ t, payoutStatus, payoutDate }: {
  t: TransactionRow
  payoutStatus: { label: string; isPaid: boolean; isCancelled: boolean }
  payoutDate: string | null
}) {
  return (
    <div
      className="px-6 pb-5 pt-1"
      style={{ backgroundColor: 'var(--light-gray, #f8f8f5)' }}
    >
      <div
        className="rounded-xl p-5 max-w-md"
        style={{ backgroundColor: 'var(--white, #fff)', border: '1px solid var(--border, #e0e0d8)' }}
      >
        {/* Receipt header */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-[13px] font-semibold" style={{ color: 'var(--charcoal, #2b2b2b)' }}>
            Payout Receipt
          </span>
          <StatusPill label={payoutStatus.label} />
        </div>
        <div className="text-[11px] font-mono tracking-[0.3px] mb-4" style={{ color: 'var(--text-tertiary, #9a9a90)' }}>
          {t.ref_code}
        </div>

        {/* Line items */}
        <div className="space-y-2.5 mb-4">
          <div className="flex justify-between text-[13px]">
            <span style={{ color: 'var(--text-secondary, #888)' }}>
              Campaign ({t.num_days} {t.num_days === 1 ? 'day' : 'days'} × ${t.daily_rate.toFixed(2)}/day)
            </span>
            <span className="font-medium" style={{ color: 'var(--charcoal, #2b2b2b)' }}>
              ${t.total_price.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-[13px]">
            <span style={{ color: 'var(--text-secondary, #888)' }}>Platform fee (7%)</span>
            <span style={{ color: 'var(--red, #E63946)' }}>−${t.platform_fee.toFixed(2)}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px mb-3" style={{ backgroundColor: 'var(--border, #e0e0d8)' }} />

        {/* Total payout */}
        <div className="flex justify-between items-center mb-4">
          <span className="text-[13px] font-semibold" style={{ color: 'var(--charcoal, #2b2b2b)' }}>
            {payoutStatus.isCancelled ? 'Refunded' : 'Your Payout'}
          </span>
          <span className="text-lg font-bold" style={{ color: payoutStatus.isCancelled ? 'var(--red, #E63946)' : 'var(--mint-dark, #5bb8a8)' }}>
            ${t.host_payout.toFixed(2)}
          </span>
        </div>

        {/* Dates */}
        <div className="space-y-1.5 mb-4">
          <div className="flex justify-between text-[12px]">
            <span style={{ color: 'var(--text-tertiary, #9a9a90)' }}>Campaign</span>
            <span style={{ color: 'var(--text-secondary, #888)' }}>
              {formatFullDate(t.start_date)} → {formatFullDate(t.end_date)}
            </span>
          </div>
          {payoutDate && (
            <div className="flex justify-between text-[12px]">
              <span style={{ color: 'var(--text-tertiary, #9a9a90)' }}>Paid on</span>
              <span style={{ color: 'var(--text-secondary, #888)' }}>{payoutDate}</span>
            </div>
          )}
        </div>

        {/* View booking link */}
        <Link
          href={`/dashboard/bookings/${t.id}`}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold hover:opacity-70 transition-opacity"
          style={{ color: 'var(--mint-dark, #5bb8a8)' }}
        >
          View Booking
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  )
}

// ─── Transactions Page ────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id)
  }

  const fetchTransactions = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: bookings } = await supabase
      .from('bookings')
      .select(`
        id, total_price, status, start_date, end_date,
        listings(title, images),
        profiles!bookings_advertiser_id_fkey(full_name)
      `)
      .eq('host_id', user.id)
      .order('created_at', { ascending: false })

    if (bookings) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows: TransactionRow[] = bookings.map((b: any) => {
        const total = b.total_price || 0
        const fee = Math.round(total * 7) / 100
        const payout = Math.round((total - fee) * 100) / 100
        const days = daysBetween(b.start_date, b.end_date)
        return {
          id: b.id,
          ref_code: 'CF-' + b.id.replace(/-/g, '').substring(0, 6).toUpperCase(),
          listing_title: b.listings?.title ?? 'Untitled Listing',
          listing_image: b.listings?.images?.[0] ?? undefined,
          advertiser_name: formatName(b.profiles?.full_name),
          start_date: b.start_date,
          end_date: b.end_date,
          total_price: total,
          platform_fee: fee,
          host_payout: payout,
          status: b.status,
          end_date_raw: b.end_date,
          num_days: days,
          daily_rate: Math.round((total / days) * 100) / 100,
        }
      })
      setTransactions(rows)
    }

    setLoading(false)
  }, [router])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const totalEarnings = transactions
    .filter(t => {
      const { isPaid } = getPayoutStatus(t.status, t.start_date, t.end_date_raw)
      return isPaid || ['confirmed', 'completed', 'active'].includes(t.status)
    })
    .reduce((sum, t) => sum + t.host_payout, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--mint, #7ecfc0)' }} />
      </div>
    )
  }

  return (
    <>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium mb-4 hover:opacity-70 transition-opacity"
          style={{ color: 'var(--text-secondary, #888)' }}
        >
          <ArrowLeft className="w-[14px] h-[14px]" />
          Back to Dashboard
        </Link>
        <h1 className="text-[28px] font-bold tracking-[-0.5px] mb-1" style={{ color: 'var(--charcoal, #2b2b2b)' }}>
          Transactions
        </h1>
        <p className="text-[15px] font-normal" style={{ color: 'var(--text-secondary, #888)' }}>
          Payout breakdown for all your bookings
        </p>
      </div>

      {/* ── Transactions Table ──────────────────────────────────────────── */}
      {transactions.length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ backgroundColor: 'var(--white, #fff)', border: '1px solid var(--border, #e0e0d8)' }}
        >
          <DollarSign className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-tertiary, #9a9a90)' }} />
          <p className="text-[15px] font-semibold mb-1" style={{ color: 'var(--charcoal, #2b2b2b)' }}>
            No transactions yet
          </p>
          <p className="text-[13px]" style={{ color: 'var(--text-secondary, #888)' }}>
            When advertisers book your listings, payout details will appear here.
          </p>
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden mb-6"
          style={{ backgroundColor: 'var(--white, #fff)', border: '1px solid var(--border, #e0e0d8)' }}
        >
          {/* Header row — desktop */}
          <div
            className="hidden lg:grid grid-cols-[1fr_120px_140px_100px_80px_90px_28px] items-center px-6 py-[10px] gap-3"
            style={{ backgroundColor: 'var(--light-gray, #f8f8f5)' }}
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.8px]" style={{ color: 'var(--text-tertiary, #9a9a90)' }}>Listing</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.8px]" style={{ color: 'var(--text-tertiary, #9a9a90)' }}>Advertiser</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.8px]" style={{ color: 'var(--text-tertiary, #9a9a90)' }}>Campaign</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.8px] text-right" style={{ color: 'var(--text-tertiary, #9a9a90)' }}>Payout</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.8px] text-center" style={{ color: 'var(--text-tertiary, #9a9a90)' }}>Status</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.8px] text-right" style={{ color: 'var(--text-tertiary, #9a9a90)' }}>Paid On</span>
            <span />
          </div>

          {/* Rows */}
          {transactions.map((t, i) => {
            const payoutStatus = getPayoutStatus(t.status, t.start_date, t.end_date_raw)
            const payoutDate = getPayoutDate(t.status, t.start_date, t.end_date_raw)
            const isExpanded = expandedId === t.id

            return (
              <div key={t.id}>
                {/* ── Desktop row ───────────────────────────────────────── */}
                <div
                  className={`hidden lg:grid grid-cols-[1fr_120px_140px_100px_80px_90px_28px] items-center px-6 py-4 gap-3 transition-colors cursor-pointer select-none hover:bg-[var(--light-gray)]${i < transactions.length - 1 && !isExpanded ? ' border-b' : ''}`}
                  style={{ borderColor: 'var(--light-gray, #f8f8f5)' }}
                  onClick={() => toggleExpand(t.id)}
                >
                  {/* Listing */}
                  <div className="flex items-center gap-3 min-w-0">
                    {t.listing_image ? (
                      <div className="w-10 h-10 rounded-lg bg-cover bg-center flex-shrink-0" style={{ backgroundImage: `url(${t.listing_image})` }} />
                    ) : (
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: 'var(--light-gray, #f8f8f5)', border: '1px solid var(--border, #e0e0d8)' }}>
                        <ImageIcon className="w-4 h-4" style={{ color: '#ccc' }} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="text-sm font-semibold truncate block">{t.listing_title}</span>
                      <span className="text-[11px] font-mono tracking-[0.3px]" style={{ color: 'var(--text-tertiary, #9a9a90)' }}>{t.ref_code}</span>
                    </div>
                  </div>

                  {/* Advertiser */}
                  <span className="text-[13px] font-normal truncate" style={{ color: 'var(--text-secondary, #888)' }}>
                    {t.advertiser_name}
                  </span>

                  {/* Campaign dates */}
                  <span className="text-[13px] font-normal" style={{ color: 'var(--text-secondary, #888)' }}>
                    {formatShortDate(t.start_date)} → {formatShortDate(t.end_date)}
                  </span>

                  {/* Payout */}
                  <span className="text-sm font-bold text-right" style={{ color: 'var(--mint-dark, #5bb8a8)' }}>
                    ${t.host_payout.toFixed(2)}
                  </span>

                  {/* Status */}
                  <div className="flex justify-center">
                    <StatusPill label={payoutStatus.label} />
                  </div>

                  {/* Payout date */}
                  <span className="text-[12px] font-normal text-right" style={{ color: 'var(--text-tertiary, #9a9a90)' }}>
                    {payoutDate ?? '—'}
                  </span>

                  {/* Chevron */}
                  <ChevronDown
                    className="w-4 h-4 transition-transform duration-200"
                    style={{
                      color: 'var(--text-tertiary, #9a9a90)',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  />
                </div>

                {/* ── Desktop expanded receipt ─────────────────────────── */}
                {isExpanded && (
                  <div className={`hidden lg:block${i < transactions.length - 1 ? ' border-b' : ''}`} style={{ borderColor: 'var(--light-gray, #f8f8f5)' }}>
                    <ReceiptPanel t={t} payoutStatus={payoutStatus} payoutDate={payoutDate} />
                  </div>
                )}

                {/* ── Mobile card ───────────────────────────────────────── */}
                <div
                  className={`lg:hidden${i < transactions.length - 1 && !isExpanded ? ' border-b' : ''}`}
                  style={{ borderColor: 'var(--light-gray, #f8f8f5)' }}
                >
                  <div
                    className="px-5 py-4 cursor-pointer select-none active:bg-[var(--light-gray)]"
                    onClick={() => toggleExpand(t.id)}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      {t.listing_image ? (
                        <div className="w-11 h-11 rounded-lg bg-cover bg-center flex-shrink-0" style={{ backgroundImage: `url(${t.listing_image})` }} />
                      ) : (
                        <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: 'var(--light-gray, #f8f8f5)', border: '1px solid var(--border, #e0e0d8)' }}>
                          <ImageIcon className="w-4 h-4" style={{ color: '#ccc' }} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate mb-0.5">{t.listing_title}</div>
                        <div className="text-[12px]" style={{ color: 'var(--text-secondary, #888)' }}>
                          {t.advertiser_name} · {formatShortDate(t.start_date)} → {formatShortDate(t.end_date)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusPill label={payoutStatus.label} />
                        <ChevronDown
                          className="w-4 h-4 transition-transform duration-200"
                          style={{
                            color: 'var(--text-tertiary, #9a9a90)',
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[13px] px-1">
                      <span className="font-medium" style={{ color: 'var(--charcoal, #2b2b2b)' }}>Payout</span>
                      <span className="font-bold" style={{ color: 'var(--mint-dark, #5bb8a8)' }}>
                        ${t.host_payout.toFixed(2)}
                      </span>
                    </div>
                    {payoutDate && (
                      <div className="text-[11px] mt-1.5 px-1" style={{ color: 'var(--text-tertiary, #9a9a90)' }}>
                        Paid on {payoutDate}
                      </div>
                    )}
                  </div>

                  {/* Mobile expanded receipt */}
                  {isExpanded && (
                    <div className={`${i < transactions.length - 1 ? 'border-b' : ''}`} style={{ borderColor: 'var(--light-gray, #f8f8f5)' }}>
                      <ReceiptPanel t={t} payoutStatus={payoutStatus} payoutDate={payoutDate} />
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* ── Running Total Footer ───────────────────────────────────── */}
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ backgroundColor: 'var(--light-gray, #f8f8f5)', borderTop: '1px solid var(--border, #e0e0d8)' }}
          >
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" style={{ color: 'var(--text-tertiary, #9a9a90)' }} />
              <span className="text-[13px] font-semibold" style={{ color: 'var(--text-secondary, #888)' }}>
                Total Earnings
              </span>
            </div>
            <span className="text-xl font-extrabold tracking-[-0.5px]" style={{ color: 'var(--mint-dark, #5bb8a8)' }}>
              ${totalEarnings.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* ── Info Note ──────────────────────────────────────────────────── */}
      <div
        className="rounded-xl px-5 py-3 flex items-start gap-3"
        style={{ backgroundColor: 'var(--light-gray, #f8f8f5)', border: '1px solid var(--border, #e0e0d8)' }}
      >
        <Calendar className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--text-tertiary, #9a9a90)' }} />
        <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary, #888)' }}>
          Payouts are processed within 3 business days after proof of posting. A 7% platform fee is deducted from each booking total.
        </p>
      </div>
    </>
  )
}
