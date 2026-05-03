'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, ExternalLink } from 'lucide-react'
import StatusBadge from '@/components/admin/StatusBadge'
import { formatCurrency, formatDate, formatDateTime, shortId, calcFinancials } from '@/lib/admin-finance'

interface BookingDetail {
  id: string
  status: string
  total_price: number
  platform_fee: number | null
  payout_amount: number | null
  payout_at: string | null
  stripe_transfer_id: string | null
  stripe_payment_intent_id: string | null
  created_at: string
  start_date: string
  end_date: string
  delivery_mode: string | null
  shipped_at: string | null
  received_at: string | null
  tracking_number: string | null
  listing_id: string
  advertiser_id: string
  host_id: string
  listings: { title: string; category: string; price_per_day: number } | null
  advertiser: { id: string; full_name: string; email: string } | null
  host: { id: string; full_name: string; email: string } | null
}

export default function AdminBookingDetailPage() {
  const params = useParams()
  const bookingId = params.id as string
  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/data?view=booking-detail&id=${bookingId}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setBooking(data.booking)
    } catch (err) {
      console.error('Booking detail fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [bookingId])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#debb73' }} />
      </div>
    )
  }

  if (!booking) {
    return <div className="text-center py-20" style={{ color: '#888' }}>Booking not found</div>
  }

  const fin = calcFinancials(booking.total_price, booking.payout_amount)
  const stripeDashUrl = 'https://dashboard.stripe.com'

  const timeline: { label: string; date: string; color: string }[] = [
    { label: 'Booking created', date: booking.created_at, color: '#888' },
  ]
  if (['confirmed', 'completed', 'pop_pending'].includes(booking.status)) {
    timeline.push({ label: 'Payment confirmed', date: booking.created_at, color: '#3b82f6' })
  }
  if (booking.shipped_at) timeline.push({ label: 'Collateral shipped', date: booking.shipped_at, color: '#f59e0b' })
  if (booking.received_at) timeline.push({ label: 'Collateral received', date: booking.received_at, color: '#22c55e' })
  if (booking.payout_at) timeline.push({ label: 'Host paid out', date: booking.payout_at, color: '#debb73' })
  if (booking.status === 'cancelled') timeline.push({ label: 'Cancelled', date: booking.created_at, color: '#ef4444' })

  return (
    <div className="space-y-8 max-w-4xl">
      <Link href="/admin/bookings" className="inline-flex items-center gap-2 text-sm" style={{ color: '#888' }}>
        <ArrowLeft className="w-4 h-4" /> Back to bookings
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            {shortId(booking.id)}
            <StatusBadge status={booking.status} />
          </h1>
          <p className="text-sm mt-1" style={{ color: '#888' }}>{booking.listings?.title ?? 'Unknown listing'}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold" style={{ color: '#debb73' }}>{formatCurrency(booking.total_price)}</div>
          <div className="text-xs" style={{ color: '#888' }}>Total charged</div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoBlock label="Advertiser">
          <Link href={`/admin/users?q=${booking.advertiser?.id}`} style={{ color: '#debb73' }} className="text-sm">
            {booking.advertiser?.full_name ?? '—'}
          </Link>
          <div className="text-xs" style={{ color: '#666' }}>{booking.advertiser?.email}</div>
        </InfoBlock>
        <InfoBlock label="Host">
          <Link href={`/admin/users?q=${booking.host?.id}`} style={{ color: '#debb73' }} className="text-sm">
            {booking.host?.full_name ?? '—'}
          </Link>
          <div className="text-xs" style={{ color: '#666' }}>{booking.host?.email}</div>
        </InfoBlock>
        <InfoBlock label="Dates">
          <div className="text-sm text-white">{formatDate(booking.start_date)}</div>
          <div className="text-xs" style={{ color: '#666' }}>→ {formatDate(booking.end_date)}</div>
        </InfoBlock>
        <InfoBlock label="Delivery">
          <div className="text-sm text-white">{booking.delivery_mode?.replace(/_/g, ' ') ?? 'N/A'}</div>
          {booking.tracking_number && <div className="text-xs" style={{ color: '#666' }}>Track: {booking.tracking_number}</div>}
        </InfoBlock>
      </div>

      {/* Financial Breakdown */}
      <div className="rounded-xl border p-6" style={{ background: '#2b2b2b', borderColor: '#3a3a3a' }}>
        <h2 className="text-lg font-semibold text-white mb-4">💰 Financial Breakdown</h2>
        <div className="space-y-3">
          <FinRow label="Gross amount charged" value={formatCurrency(fin.totalPrice)} bold />
          <FinRow label="Subtotal (pre-buyer-fee)" value={formatCurrency(fin.subtotal)} />
          <FinRow label="Buyer fee (7%)" value={formatCurrency(fin.buyerFee)} sub />
          <FinRow label="Seller fee (7%)" value={formatCurrency(fin.sellerFee)} sub />
          <div className="border-t my-3" style={{ borderColor: '#3a3a3a' }} />
          <FinRow label="Estimated Stripe processing (~2.9% + $0.30)" value={`−${formatCurrency(fin.stripeFeeEstimate)}`} color="#ef4444" />
          <FinRow label="Host payout" value={formatCurrency(fin.hostPayout)} color="#7ecfc0" />
          <div className="border-t my-3" style={{ borderColor: '#3a3a3a' }} />
          <FinRow label="City Feed net take" value={formatCurrency(fin.netPlatformProfit)} color="#debb73" bold />
        </div>

        <div className="mt-6 space-y-2">
          {booking.stripe_payment_intent_id && (
            <div className="flex items-center gap-2 text-xs">
              <span style={{ color: '#888' }}>Payment Intent:</span>
              <a href={`${stripeDashUrl}/payments/${booking.stripe_payment_intent_id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1" style={{ color: '#debb73' }}>
                {booking.stripe_payment_intent_id.substring(0, 20)}… <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
          {booking.stripe_transfer_id && (
            <div className="flex items-center gap-2 text-xs">
              <span style={{ color: '#888' }}>Transfer:</span>
              <a href={`${stripeDashUrl}/connect/transfers/${booking.stripe_transfer_id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1" style={{ color: '#debb73' }}>
                {booking.stripe_transfer_id.substring(0, 20)}… <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-xl border p-6" style={{ background: '#2b2b2b', borderColor: '#3a3a3a' }}>
        <h2 className="text-lg font-semibold text-white mb-4">📅 Timeline</h2>
        <div className="space-y-4">
          {timeline.map((ev, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: ev.color }} />
              <div>
                <div className="text-sm text-white">{ev.label}</div>
                <div className="text-xs" style={{ color: '#666' }}>{formatDateTime(ev.date)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        <Link href={`/marketplace/${booking.listing_id}`} className="text-xs px-4 py-2 rounded-lg" style={{ background: '#2b2b2b', color: '#debb73', border: '1px solid #3a3a3a' }}>
          View Listing →
        </Link>
        {booking.advertiser?.id && (
          <Link href={`/profile/${booking.advertiser.id}`} className="text-xs px-4 py-2 rounded-lg" style={{ background: '#2b2b2b', color: '#ccc', border: '1px solid #3a3a3a' }}>
            Advertiser Profile →
          </Link>
        )}
        {booking.host?.id && (
          <Link href={`/profile/${booking.host.id}`} className="text-xs px-4 py-2 rounded-lg" style={{ background: '#2b2b2b', color: '#ccc', border: '1px solid #3a3a3a' }}>
            Host Profile →
          </Link>
        )}
      </div>
    </div>
  )
}

function InfoBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-4" style={{ background: '#2b2b2b', borderColor: '#3a3a3a' }}>
      <div className="text-xs font-medium mb-1.5" style={{ color: '#888' }}>{label}</div>
      {children}
    </div>
  )
}

function FinRow({ label, value, bold, sub, color }: { label: string; value: string; bold?: boolean; sub?: boolean; color?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${sub ? 'pl-4' : ''}`} style={{ color: sub ? '#666' : '#aaa' }}>{label}</span>
      <span className={`text-sm ${bold ? 'font-bold' : ''}`} style={{ color: color ?? (bold ? '#fff' : '#ccc') }}>{value}</span>
    </div>
  )
}
