'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  RefreshCw, AlertTriangle, CheckCircle2, ArrowUpRight,
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

// ─── Design tokens (fintech dark) ──────────────────────────────────────────────

const T = {
  bg: '#0a0a0b',
  card: '#101012',
  cardRaised: '#141417',
  border: '#1f1f23',
  borderSoft: '#19191d',
  text: '#fafafa',
  textDim: '#a1a1aa',
  textMute: '#5b5b63',
  emerald: '#34d399',
  emeraldDim: '#34d39918',
  amber: '#fbbf24',
  amberDim: '#fbbf2415',
  red: '#f87171',
}

const num: React.CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  fontFeatureSettings: '"tnum"',
}

const microLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: T.textMute,
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ReconciliationPage() {
  const [data, setData] = useState<ReconData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [asOf, setAsOf] = useState<Date | null>(null)

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/reconciliation')
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      setData(await res.json())
      setAsOf(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ─── Skeleton loading state ──────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="rounded-2xl p-8 space-y-8"
        style={{ background: T.bg, border: `1px solid ${T.border}` }}
      >
        <div className="space-y-2">
          <div className="h-7 w-56 rounded-md animate-pulse" style={{ background: T.cardRaised }} />
          <div className="h-4 w-80 rounded-md animate-pulse" style={{ background: T.card }} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px rounded-xl overflow-hidden" style={{ background: T.border }}>
          {[0, 1, 2].map(i => (
            <div key={i} className="p-6 space-y-4" style={{ background: T.card }}>
              <div className="h-3 w-28 rounded animate-pulse" style={{ background: T.cardRaised }} />
              <div className="h-10 w-40 rounded animate-pulse" style={{ background: T.cardRaised }} />
              <div className="h-3 w-32 rounded animate-pulse" style={{ background: T.cardRaised }} />
            </div>
          ))}
        </div>
        <div className="h-64 rounded-xl animate-pulse" style={{ background: T.card }} />
      </div>
    )
  }

  // ─── Error state ─────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div
        className="rounded-2xl p-8"
        style={{ background: T.bg, border: `1px solid ${T.border}` }}
      >
        <div style={microLabel}>Reconciliation</div>
        <div
          className="mt-6 rounded-xl p-6 flex items-start gap-4"
          style={{ background: T.card, border: `1px solid ${T.border}` }}
        >
          <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: T.amber }} />
          <div className="flex-1">
            <div className="text-sm font-medium" style={{ color: T.text }}>Unable to load reconciliation data</div>
            <div className="text-xs mt-1.5 font-mono" style={{ color: T.textMute }}>{error}</div>
            <button
              onClick={() => fetchData()}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
              style={{ background: T.text, color: T.bg }}
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  const mismatchTransfers = data.transfers.filter(t => t.mismatch)
  const totalMismatches = mismatchTransfers.length + data.orphanedBookings.length
  const healthy = totalMismatches === 0

  return (
    <div
      className="rounded-2xl p-8 space-y-10"
      style={{ background: T.bg, border: `1px solid ${T.border}` }}
    >
      {/* ═══ Header ═══ */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight" style={{ color: T.text }}>
              Reconciliation
            </h1>
            {/* Health indicator */}
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
              style={{
                background: healthy ? T.emeraldDim : T.amberDim,
                color: healthy ? T.emerald : T.amber,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: healthy ? T.emerald : T.amber,
                  boxShadow: `0 0 6px ${healthy ? T.emerald : T.amber}`,
                }}
              />
              {healthy ? 'All matched' : `${totalMismatches} mismatch${totalMismatches !== 1 ? 'es' : ''}`}
            </span>
          </div>
          <div className="text-[13px] mt-1.5" style={{ color: T.textMute }}>
            Live Stripe balance reconciled against escrow liability
          </div>
        </div>
        <div className="flex items-center gap-3">
          {asOf && (
            <span className="text-[11px] font-mono" style={{ ...num, color: T.textMute }}>
              as of {asOf.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-40"
            style={{ background: T.cardRaised, color: T.textDim, border: `1px solid ${T.border}` }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ═══ Hero: Safe to Withdraw ═══ */}
      <div>
        <div
          className="rounded-xl p-7 relative overflow-hidden"
          style={{ background: T.card, border: `1px solid ${T.border}` }}
        >
          <div
            className="absolute inset-x-0 top-0 h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${T.emerald}66, transparent)` }}
          />
          <div style={microLabel}>Safe to withdraw</div>
          <div
            className="mt-3 font-semibold tracking-tight"
            style={{ ...num, color: T.emerald, fontSize: 52, lineHeight: 1 }}
          >
            {formatCurrency(data.escrow.safeToWithdraw)}
          </div>
          <div className="mt-3 text-[13px]" style={{ color: T.textMute }}>
            Available balance minus escrow liability — yours to move
          </div>
        </div>

        {/* Supporting stats */}
        <div
          className="mt-px grid grid-cols-1 md:grid-cols-3 gap-px rounded-xl overflow-hidden"
          style={{ background: T.border, border: `1px solid ${T.border}` }}
        >
          <div className="p-5" style={{ background: T.card }}>
            <div style={microLabel}>Escrow held</div>
            <div className="mt-2 text-2xl font-semibold" style={{ ...num, color: T.amber }}>
              {formatCurrency(data.escrow.liability)}
            </div>
            <div className="mt-1.5 text-xs" style={{ ...num, color: T.textMute }}>
              {data.escrow.bookingCount} booking{data.escrow.bookingCount !== 1 ? 's' : ''} awaiting payout
            </div>
          </div>
          <div className="p-5" style={{ background: T.card }}>
            <div style={microLabel}>Stripe available</div>
            <div className="mt-2 text-2xl font-semibold" style={{ ...num, color: T.text }}>
              {formatCurrency(data.balance.available)}
            </div>
            <div className="mt-1.5 text-xs" style={{ color: T.textMute }}>
              Settled, in platform account
            </div>
          </div>
          <div className="p-5" style={{ background: T.card }}>
            <div style={microLabel}>Stripe pending</div>
            <div className="mt-2 text-2xl font-semibold" style={{ ...num, color: T.textDim }}>
              {formatCurrency(data.balance.pending)}
            </div>
            <div className="mt-1.5 text-xs" style={{ color: T.textMute }}>
              Processing, settles soon
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Mismatches (if any) ═══ */}
      {totalMismatches > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4" style={{ color: T.amber }} />
            <span style={{ ...microLabel, color: T.amber }}>
              Needs attention · {totalMismatches}
            </span>
          </div>
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: T.card, border: `1px solid ${T.border}` }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  <th className="text-left px-5 py-3" style={microLabel}>Type</th>
                  <th className="text-left px-5 py-3" style={microLabel}>Reference</th>
                  <th className="text-left px-5 py-3" style={microLabel}>Listing</th>
                  <th className="text-right px-5 py-3" style={microLabel}>Amount</th>
                  <th className="text-left px-5 py-3" style={microLabel}>Issue</th>
                </tr>
              </thead>
              <tbody>
                {mismatchTransfers.map(t => (
                  <tr key={t.id} className="transition-colors hover:bg-white/[0.03]" style={{ borderTop: `1px solid ${T.borderSoft}` }}>
                    <td className="px-5 py-3.5 text-xs font-medium" style={{ color: T.textDim }}>Transfer</td>
                    <td className="px-5 py-3.5 font-mono text-xs" style={{ color: T.textDim }}>
                      {t.id.slice(0, 14)}…
                    </td>
                    <td className="px-5 py-3.5 text-[13px]" style={{ color: T.text }}>{t.listing_title ?? '—'}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-[13px]" style={{ ...num, color: T.text }}>
                      {formatCurrency(t.amount)}
                    </td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: T.red }}>No matching booking</td>
                  </tr>
                ))}
                {data.orphanedBookings.map(o => (
                  <tr key={o.booking_id} className="transition-colors hover:bg-white/[0.03]" style={{ borderTop: `1px solid ${T.borderSoft}` }}>
                    <td className="px-5 py-3.5 text-xs font-medium" style={{ color: T.textDim }}>Booking</td>
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/admin/bookings/${o.booking_id}`}
                        className="inline-flex items-center gap-1 font-mono text-xs transition-opacity hover:opacity-70"
                        style={{ color: T.text }}
                      >
                        {shortId(o.booking_id)} <ArrowUpRight className="w-3 h-3" style={{ color: T.textMute }} />
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-[13px]" style={{ color: T.text }}>{o.listing_title}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-[13px]" style={{ color: T.textMute }}>—</td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: T.red }}>Marked paid, transfer not in recent 100</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ Transfer Reconciliation Table ═══ */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <span style={microLabel}>Transfer history</span>
          <span className="text-[11px] font-mono" style={{ ...num, color: T.textMute }}>
            last {data.transfers.length}
          </span>
        </div>
        <div
          className="rounded-xl overflow-x-auto"
          style={{ background: T.card, border: `1px solid ${T.border}` }}
        >
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                <th className="text-left px-5 py-3" style={microLabel}>Date</th>
                <th className="text-left px-5 py-3" style={microLabel}>Transfer</th>
                <th className="text-left px-5 py-3" style={microLabel}>Booking</th>
                <th className="text-left px-5 py-3" style={microLabel}>Listing</th>
                <th className="text-right px-5 py-3" style={microLabel}>Amount</th>
                <th className="text-right px-5 py-3" style={microLabel}>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.transfers.map(t => (
                <tr
                  key={t.id}
                  className="transition-colors hover:bg-white/[0.03]"
                  style={{
                    borderTop: `1px solid ${T.borderSoft}`,
                    background: t.mismatch ? T.amberDim : undefined,
                  }}
                >
                  <td className="px-5 py-3.5 text-[13px]" style={{ ...num, color: T.textDim }}>
                    {formatDateTime(t.created)}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs" style={{ color: T.textMute }}>
                    {t.id.slice(0, 14)}…
                  </td>
                  <td className="px-5 py-3.5">
                    {t.booking_id ? (
                      <Link
                        href={`/admin/bookings/${t.booking_id}`}
                        className="inline-flex items-center gap-1 font-mono text-xs transition-opacity hover:opacity-70"
                        style={{ color: T.text }}
                      >
                        {shortId(t.booking_id)} <ArrowUpRight className="w-3 h-3" style={{ color: T.textMute }} />
                      </Link>
                    ) : (
                      <span className="font-mono text-xs" style={{ color: T.red }}>—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-[13px] max-w-[220px] truncate" style={{ color: T.text }}>
                    {t.listing_title ?? '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-[13px] font-medium" style={{ ...num, color: T.text }}>
                    {formatCurrency(t.amount)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {t.mismatch ? (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                        style={{ background: T.amberDim, color: T.amber }}
                      >
                        <AlertTriangle className="w-3 h-3" /> Mismatch
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                        style={{ background: T.emeraldDim, color: T.emerald }}
                      >
                        <CheckCircle2 className="w-3 h-3" /> Matched
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {data.transfers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-[13px]" style={{ color: T.textMute }}>
                    No transfers yet — payouts will appear here as they happen
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
