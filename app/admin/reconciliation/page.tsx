'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Loader2, RefreshCw, AlertTriangle, CheckCircle2,
  ShieldCheck, Landmark, ArrowRight,
} from 'lucide-react'
import { formatCurrency, formatDateTime, shortId } from '@/lib/admin-finance'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface TransferRow {
  id: string
  amount: number
  currency: string
  destination: string | null
  created: string
  booking_id: string | null
  booking_status: string | null
  listing_title: string | null
  mismatch: string | null
}

interface OrphanRow {
  booking_id: string
  stripe_transfer_id: string
  listing_title: string
  mismatch: string
}

interface ReconData {
  balance: { available: number; pending: number }
  escrow: { liability: number; bookingCount: number; safeToWithdraw: number }
  transfers: TransferRow[]
  orphanedBookings: OrphanRow[]
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ReconciliationPage() {
  const [data, setData] = useState<ReconData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/reconciliation')
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      setData(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#debb73' }} />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-white">Reconciliation</h1>
        <div className="rounded-xl p-6 border" style={{ background: '#2b2b2b', borderColor: '#3a3a3a' }}>
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5" style={{ color: '#f59e0b' }} />
            <div>
              <div className="text-sm font-medium text-white">Failed to load reconciliation data</div>
              <div className="text-xs mt-1" style={{ color: '#888' }}>{error}</div>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: '#debb73', color: '#2b2b2b' }}
          >
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    )
  }

  const mismatchTransfers = data.transfers.filter(t => t.mismatch)
  const totalMismatches = mismatchTransfers.length + data.orphanedBookings.length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reconciliation</h1>
          <div className="text-sm mt-1" style={{ color: '#888' }}>
            Live Stripe balance vs escrow liability
          </div>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
          style={{ background: '#3a3a3a', color: '#ccc' }}
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* ═══ Headline Cards ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Escrow Held */}
        <div className="rounded-xl p-6 border" style={{ background: '#debb7315', borderColor: '#debb7340' }}>
          <div className="flex items-center gap-2 mb-3">
            <Landmark className="w-4 h-4" style={{ color: '#debb73' }} />
            <div className="text-xs font-medium" style={{ color: '#888' }}>Escrow Held</div>
          </div>
          <div className="text-3xl font-bold" style={{ color: '#debb73' }}>
            {formatCurrency(data.escrow.liability)}
          </div>
          <div className="text-xs mt-2" style={{ color: '#888' }}>
            {data.escrow.bookingCount} booking{data.escrow.bookingCount !== 1 ? 's' : ''} awaiting payout
          </div>
        </div>

        {/* Safe to Withdraw */}
        <div className="rounded-xl p-6 border" style={{ background: '#22c55e15', borderColor: '#22c55e40' }}>
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4" style={{ color: '#4ade80' }} />
            <div className="text-xs font-medium" style={{ color: '#888' }}>Safe to Withdraw</div>
          </div>
          <div className="text-3xl font-bold" style={{ color: '#4ade80' }}>
            {formatCurrency(data.escrow.safeToWithdraw)}
          </div>
          <div className="text-xs mt-2" style={{ color: '#888' }}>
            Available balance minus escrow
          </div>
        </div>

        {/* Stripe Balance */}
        <div className="rounded-xl p-6 border" style={{ background: '#2b2b2b', borderColor: '#3a3a3a' }}>
          <div className="text-xs font-medium mb-3" style={{ color: '#888' }}>Stripe Balance</div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: '#aaa' }}>Available</span>
              <span className="text-lg font-bold text-white">{formatCurrency(data.balance.available)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: '#aaa' }}>Pending</span>
              <span className="text-lg font-bold" style={{ color: '#888' }}>{formatCurrency(data.balance.pending)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Escrow Headline (inline summary) ═══ */}
      <div className="rounded-xl p-5 border flex flex-wrap items-center gap-4" style={{ background: '#2b2b2b', borderColor: '#3a3a3a' }}>
        <div className="flex items-center gap-3 text-sm" style={{ color: '#ccc' }}>
          <Landmark className="w-4 h-4" style={{ color: '#debb73' }} />
          <span>Escrow held: <strong className="text-white">{formatCurrency(data.escrow.liability)}</strong></span>
        </div>
        <ArrowRight className="w-4 h-4" style={{ color: '#666' }} />
        <div className="text-sm" style={{ color: '#ccc' }}>
          Safe to withdraw: <strong style={{ color: '#4ade80' }}>{formatCurrency(data.escrow.safeToWithdraw)}</strong>
        </div>
        {totalMismatches > 0 && (
          <>
            <ArrowRight className="w-4 h-4" style={{ color: '#666' }} />
            <div className="flex items-center gap-2 text-sm" style={{ color: '#f59e0b' }}>
              <AlertTriangle className="w-4 h-4" />
              {totalMismatches} mismatch{totalMismatches !== 1 ? 'es' : ''} found
            </div>
          </>
        )}
        {totalMismatches === 0 && (
          <>
            <ArrowRight className="w-4 h-4" style={{ color: '#666' }} />
            <div className="flex items-center gap-2 text-sm" style={{ color: '#4ade80' }}>
              <CheckCircle2 className="w-4 h-4" />
              All transfers reconciled
            </div>
          </>
        )}
      </div>

      {/* ═══ Mismatches (if any) ═══ */}
      {totalMismatches > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" style={{ color: '#f59e0b' }} />
            Mismatches ({totalMismatches})
          </h2>
          <div className="rounded-xl border overflow-hidden" style={{ background: '#2b2b2b', borderColor: '#3a3a3a' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #3a3a3a' }}>
                  {['Type', 'Transfer / Booking', 'Listing', 'Amount', 'Issue'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: '#888' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mismatchTransfers.map(t => (
                  <tr key={t.id} className="border-t" style={{ borderColor: '#3a3a3a' }}>
                    <td className="px-4 py-3 text-xs" style={{ color: '#f59e0b' }}>Transfer</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: '#debb73' }}>{t.id.slice(0, 16)}...</td>
                    <td className="px-4 py-3 text-white">{t.listing_title ?? '—'}</td>
                    <td className="px-4 py-3 text-white">{formatCurrency(t.amount)}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#f87171' }}>Transfer with no matching booking</td>
                  </tr>
                ))}
                {data.orphanedBookings.map(o => (
                  <tr key={o.booking_id} className="border-t" style={{ borderColor: '#3a3a3a' }}>
                    <td className="px-4 py-3 text-xs" style={{ color: '#f59e0b' }}>Booking</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/bookings/${o.booking_id}`} className="font-mono text-xs" style={{ color: '#debb73' }}>
                        {shortId(o.booking_id)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-white">{o.listing_title}</td>
                    <td className="px-4 py-3" style={{ color: '#888' }}>—</td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#f87171' }}>Booking marked paid out but transfer not in recent 100</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ Transfer Reconciliation Table ═══ */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Transfer History</h2>
        <div className="rounded-xl border overflow-x-auto" style={{ background: '#2b2b2b', borderColor: '#3a3a3a' }}>
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr style={{ borderBottom: '1px solid #3a3a3a' }}>
                {['Date', 'Transfer ID', 'Booking', 'Listing', 'Amount', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: '#888' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.transfers.map(t => (
                <tr
                  key={t.id}
                  className="border-t hover:bg-white/5"
                  style={{
                    borderColor: '#3a3a3a',
                    background: t.mismatch ? '#f59e0b08' : undefined,
                  }}
                >
                  <td className="px-4 py-3" style={{ color: '#aaa' }}>{formatDateTime(t.created)}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: '#ccc' }}>{t.id.slice(0, 20)}...</td>
                  <td className="px-4 py-3">
                    {t.booking_id ? (
                      <Link href={`/admin/bookings/${t.booking_id}`} className="font-mono text-xs" style={{ color: '#debb73' }}>
                        {shortId(t.booking_id)}
                      </Link>
                    ) : (
                      <span className="text-xs" style={{ color: '#f87171' }}>No booking ID</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white max-w-[200px] truncate">{t.listing_title ?? '—'}</td>
                  <td className="px-4 py-3 text-white">{formatCurrency(t.amount)}</td>
                  <td className="px-4 py-3">
                    {t.mismatch ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: '#f59e0b20', color: '#f59e0b' }}>
                        <AlertTriangle className="w-3 h-3" /> Mismatch
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: '#22c55e20', color: '#4ade80' }}>
                        <CheckCircle2 className="w-3 h-3" /> Matched
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {data.transfers.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center" style={{ color: '#666' }}>No transfers found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="text-right mt-2 text-xs" style={{ color: '#666' }}>
          Showing last {data.transfers.length} transfers
        </div>
      </div>
    </div>
  )
}
