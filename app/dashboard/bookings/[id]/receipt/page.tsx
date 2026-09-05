'use client'

/**
 * Booking Receipt — print-friendly view after campaign completion
 */
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Printer, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getBookingFinancials, parseBookingDate } from '@/lib/fees'

interface ReceiptData {
  id: string
  listing_title: string
  start_date: string
  end_date: string
  total_days: number
  price_per_day: number
  subtotal: number
  buyer_fee: number
  seller_fee: number
  print_fee: number
  total_price: number
  payout_amount?: number
  payout_at?: string
  created_at: string
  status: string
  host_name: string
  advertiser_name: string
  stripe_session_id?: string
}

export default function ReceiptPage() {
  const params = useParams()
  const router = useRouter()
  const bookingId = params.id as string

  const [receipt, setReceipt] = useState<ReceiptData | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isHost, setIsHost] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setCurrentUserId(user.id)

      const { data, error: fetchError } = await supabase
        .from('bookings')
        .select(`
          id, status, start_date, end_date, total_price, platform_fee,
          subtotal, buyer_fee, seller_fee, print_fee_charged,
          payout_amount, payout_at, created_at, stripe_payment_intent_id,
          host_id, advertiser_id,
          listings(title, price_per_day),
          host:profiles!bookings_host_id_fkey(full_name),
          advertiser:profiles!bookings_advertiser_id_fkey(full_name)
        `)
        .eq('id', bookingId)
        .single()

      if (fetchError || !data) {
        setError('Receipt not found.')
        setLoading(false)
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = data as any
      const userIsHost = user.id === d.host_id
      setIsHost(userIsHost)
      // Single source of truth — stored itemized amounts (lib/fees.ts)
      const fin = getBookingFinancials(d)
      setReceipt({
        id: d.id,
        listing_title: d.listings?.title ?? 'Listing',
        start_date: d.start_date,
        end_date: d.end_date,
        total_days: fin.days ?? 1,
        price_per_day: fin.pricePerDay ?? 0,
        subtotal: fin.subtotal,
        buyer_fee: fin.buyerFee,
        seller_fee: fin.sellerFee,
        print_fee: fin.printFee,
        total_price: fin.advertiserTotal,
        payout_amount: d.payout_amount,
        payout_at: d.payout_at,
        created_at: d.created_at,
        status: d.status,
        host_name: d.host?.full_name ?? 'Host',
        advertiser_name: d.advertiser?.full_name ?? 'Advertiser',
        stripe_session_id: d.stripe_payment_intent_id,
      })
      setLoading(false)
    })
  }, [bookingId, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: 'var(--cream, #f0f0ec)' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--mint, #7ecfc0)' }} />
      </div>
    )
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: 'var(--cream, #f0f0ec)' }}>
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--mint, #7ecfc0)' }} />
          <p className="text-sm mb-4" style={{ color: '#888' }}>{error || 'Receipt unavailable'}</p>
          <Link href="/dashboard/bookings" className="text-sm font-medium" style={{ color: 'var(--mint, #7ecfc0)' }}>Back to Bookings</Link>
        </div>
      </div>
    )
  }

  // Date-only strings ('YYYY-MM-DD') must parse as LOCAL midnight, or they
  // render a day early in US timezones. Timestamps parse normally.
  const fmtDate = (d: string) => (d.includes('T') ? new Date(d) : parseBookingDate(d))
    .toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const fmtMoney = (n: number) => `$${n.toFixed(2)}`

  // Confirmation code from UUID
  const confirmationCode = `CF-${receipt.id.replace(/-/g, '').substring(0, 6).toUpperCase()}`

  // Is campaign currently live?
  const now = new Date()
  const campEnd = parseBookingDate(receipt.end_date)
  // Completed (POP submitted) = live until end date, even if before start (early POP)
  const isLive = receipt.status === 'completed' && now <= campEnd

  // Stored values only — no re-derivation (lib/fees.ts)
  const sellerFee = receipt.seller_fee
  const hostPayout = receipt.payout_amount ?? Math.round((receipt.subtotal + receipt.print_fee - sellerFee) * 100) / 100

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          nav, footer, .no-print { display: none !important; }
          body { background: white !important; }
          .receipt-card { box-shadow: none !important; border: 1px solid #ddd !important; }
        }
      `}</style>

      <div className="min-h-screen pt-20 px-4 sm:px-6 pb-12" style={{ backgroundColor: 'var(--cream, #f0f0ec)' }}>
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 mb-8 no-print">
            <div className="flex items-center gap-4">
              <Link href={`/dashboard/bookings`} className="hover:opacity-70" style={{ color: '#888' }}>
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: 'var(--charcoal, #2b2b2b)' }}>Receipt</h1>
                <p className="text-sm" style={{ color: '#888' }}>Campaign summary</p>
              </div>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium hover:opacity-80 transition-opacity"
              style={{ border: '1px solid var(--border, #e0e0d8)', color: '#555', backgroundColor: '#fff' }}
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>

          {/* Receipt Card */}
          <div className="rounded-2xl overflow-hidden receipt-card" style={{ backgroundColor: '#fff', border: '1px solid var(--border, #e0e0d8)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            {/* Receipt Header */}
            <div className="px-8 py-6" style={{ backgroundColor: 'var(--charcoal, #2b2b2b)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <Image src="/logo-new.png" alt="City Feed" width={120} height={32} className="h-8 w-auto" style={{ filter: 'invert(1)' }} />
                  <p className="text-xs mt-0.5" style={{ color: '#888' }}>Real World Advertising Marketplace</p>
                </div>
                {isLive ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(22,163,74,0.2)' }}>
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#16a34a' }} />
                    <span className="text-sm font-bold" style={{ color: '#4ade80' }}>LIVE</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" style={{ color: '#16a34a' }} />
                    <span className="text-sm font-semibold" style={{ color: '#16a34a' }}>Completed</span>
                  </div>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="px-8 py-6 space-y-6">
              {/* Booking ID & Date */}
              <div className="flex items-start justify-between text-xs" style={{ color: '#888' }}>
                <div>
                  <p className="font-medium mb-0.5" style={{ color: '#aaa' }}>CONFIRMATION</p>
                  <p className="font-mono font-bold text-sm" style={{ color: 'var(--mint, #7ecfc0)' }}>{confirmationCode}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium mb-0.5" style={{ color: '#aaa' }}>PAYMENT DATE</p>
                  <p style={{ color: '#555' }}>{fmtDate(receipt.created_at)}</p>
                </div>
              </div>

              <hr style={{ borderColor: '#f0f0ea' }} />

              {/* Campaign Details */}
              <div>
                <p className="text-xs font-semibold mb-3" style={{ color: '#aaa' }}>CAMPAIGN DETAILS</p>
                <h3 className="font-bold text-base mb-2" style={{ color: 'var(--charcoal, #2b2b2b)' }}>{receipt.listing_title}</h3>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span style={{ color: '#888' }}>Campaign Start</span>
                    <span style={{ color: 'var(--charcoal, #2b2b2b)' }}>{fmtDate(receipt.start_date)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: '#888' }}>Campaign End</span>
                    <span style={{ color: 'var(--charcoal, #2b2b2b)' }}>{fmtDate(receipt.end_date)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: '#888' }}>Duration</span>
                    <span style={{ color: 'var(--charcoal, #2b2b2b)' }}>{receipt.total_days} day{receipt.total_days !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>

              <hr style={{ borderColor: '#f0f0ea' }} />

              {/* Price Breakdown — role-aware */}
              <div>
                <p className="text-xs font-semibold mb-3" style={{ color: '#aaa' }}>
                  {isHost ? 'PAYOUT BREAKDOWN' : 'PRICE BREAKDOWN'}
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span style={{ color: '#888' }}>
                      {fmtMoney(receipt.price_per_day)} × {receipt.total_days} day{receipt.total_days !== 1 ? 's' : ''}
                    </span>
                    <span style={{ color: 'var(--charcoal, #2b2b2b)' }}>{fmtMoney(receipt.subtotal)}</span>
                  </div>
                  {receipt.print_fee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span style={{ color: '#888' }}>Print fee</span>
                      <span style={{ color: 'var(--charcoal, #2b2b2b)' }}>{fmtMoney(receipt.print_fee)}</span>
                    </div>
                  )}
                  {isHost ? (
                    <div className="flex justify-between text-sm">
                      <span style={{ color: '#888' }}>Seller fee (7%)</span>
                      <span style={{ color: '#dc2626' }}>-{fmtMoney(sellerFee)}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-sm">
                      <span style={{ color: '#888' }}>Buyer service fee (7%)</span>
                      <span style={{ color: 'var(--charcoal, #2b2b2b)' }}>{fmtMoney(receipt.buyer_fee)}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between mt-4 pt-4" style={{ borderTop: '2px solid #f0f0ea' }}>
                  <span className="font-bold" style={{ color: 'var(--charcoal, #2b2b2b)' }}>
                    {isHost ? 'Your Payout' : 'Total Charged'}
                  </span>
                  <span className="font-bold text-lg" style={{ color: 'var(--mint, #7ecfc0)' }}>
                    {isHost ? fmtMoney(hostPayout) : fmtMoney(receipt.total_price)}
                  </span>
                </div>
              </div>

              <hr style={{ borderColor: '#f0f0ea' }} />

              <p className="text-xs text-center" style={{ color: '#aaa' }}>
                Processed by City Feed. For questions, contact{' '}
                <a href="mailto:hello@cityfeed.io" style={{ color: 'var(--mint, #7ecfc0)' }}>hello@cityfeed.io</a>
              </p>
            </div>
          </div>

          <div className="mt-6 text-center no-print">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
              style={{ backgroundColor: 'var(--charcoal, #2b2b2b)', color: 'var(--cream, #f0f0ec)' }}
            >
              <Printer className="w-4 h-4" />
              Download Receipt
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
