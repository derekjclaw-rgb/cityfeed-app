'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Loader2, Download } from 'lucide-react'
import Link from 'next/link'
import KpiCard from '@/components/admin/KpiCard'
import StatusBadge from '@/components/admin/StatusBadge'
import DateRangeFilter, { type DateRange } from '@/components/admin/DateRangeFilter'
import { formatCurrency, formatDate, shortId, calcFinancials } from '@/lib/admin-finance'

interface Booking {
  id: string
  status: string
  total_price: number
  payout_amount: number | null
  created_at: string
  start_date: string
  end_date: string
  listings: { title: string } | null
  advertiser: { full_name: string } | null
  host: { full_name: string } | null
}

export default function AdminFinancialsPage() {
  const [allBookings, setAllBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>({ label: 'All time', startDate: null, endDate: null })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/data?view=financials')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setAllBookings(data.bookings ?? [])
    } catch (err) {
      console.error('Financials fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const bookings = useMemo(() => {
    if (!dateRange.startDate) return allBookings
    const start = dateRange.startDate
    const end = dateRange.endDate ?? new Date().toISOString().split('T')[0]
    return allBookings.filter(b => {
      const d = b.created_at.split('T')[0]
      return d >= start && d <= end
    })
  }, [allBookings, dateRange])

  const stats = useMemo(() => {
    const nonCancelled = bookings.filter(b => b.status !== 'cancelled')
    const completed = bookings.filter(b => b.status === 'completed')

    const totalGross = nonCancelled.reduce((s, b) => s + (b.total_price ?? 0), 0)
    const totalPayouts = completed.reduce((s, b) => s + (b.payout_amount ?? 0), 0)
    const platformRevenue = totalGross - totalPayouts
    const totalStripeFees = nonCancelled.reduce((s, b) => s + calcFinancials(b.total_price).stripeFeeEstimate, 0)
    const netProfit = platformRevenue - totalStripeFees

    // This month (always from all bookings regardless of filter)
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const monthNonCancelled = allBookings.filter(b => b.created_at.split('T')[0] >= monthStart && b.status !== 'cancelled')
    const monthCompleted = allBookings.filter(b => b.created_at.split('T')[0] >= monthStart && b.status === 'completed')
    const monthGross = monthNonCancelled.reduce((s, b) => s + (b.total_price ?? 0), 0)
    const monthPayouts = monthCompleted.reduce((s, b) => s + (b.payout_amount ?? 0), 0)
    const monthStripeFees = monthNonCancelled.reduce((s, b) => s + calcFinancials(b.total_price).stripeFeeEstimate, 0)
    const monthNetProfit = (monthGross - monthPayouts) - monthStripeFees

    return { totalGross, totalPayouts, platformRevenue, totalStripeFees, netProfit, monthGross, monthPayouts, monthStripeFees, monthNetProfit }
  }, [bookings, allBookings])

  const transactions = useMemo(() => {
    const nonCancelled = bookings.filter(b => b.status !== 'cancelled')
    let runningTotal = 0
    return nonCancelled.map(b => {
      const fin = calcFinancials(b.total_price, b.payout_amount)
      runningTotal += fin.platformTake
      return { ...b, fin, runningTotal }
    })
  }, [bookings])

  function exportCSV() {
    const headers = ['Date', 'Booking ID', 'Listing', 'Advertiser', 'Host', 'Status', 'Gross', 'Host Payout', 'Platform Take', 'Stripe Fee Est', 'Net', 'Running Total']
    const rows = transactions.map(t => [
      t.created_at.split('T')[0], shortId(t.id), t.listings?.title ?? '', t.advertiser?.full_name ?? '',
      t.host?.full_name ?? '', t.status, t.fin.totalPrice.toFixed(2), t.fin.hostPayout.toFixed(2),
      t.fin.platformTake.toFixed(2), t.fin.stripeFeeEstimate.toFixed(2), t.fin.netPlatformProfit.toFixed(2),
      t.runningTotal.toFixed(2),
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cityfeed-financials-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#debb73' }} />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Financials</h1>
          <p className="text-sm mt-1" style={{ color: '#888' }}>Every dollar, traceable</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#debb73', color: '#2b2b2b' }}>
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <DateRangeFilter current={dateRange} onChange={setDateRange} />

      {/* Filtered range KPIs */}
      <div>
        <h2 className="text-sm font-medium mb-3" style={{ color: '#888' }}>{dateRange.startDate ? dateRange.label : 'All Time'}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <KpiCard label="Gross Revenue" value={formatCurrency(stats.totalGross)} accent />
          <KpiCard label="Host Payouts" value={formatCurrency(stats.totalPayouts)} />
          <KpiCard label="Platform Revenue" value={formatCurrency(stats.platformRevenue)} sub="Gross − Payouts" />
          <KpiCard label="Est. Stripe Fees" value={formatCurrency(stats.totalStripeFees)} />
          <KpiCard label="Net Platform Profit" value={formatCurrency(stats.netProfit)} accent />
        </div>
      </div>

      {/* This Month always visible */}
      <div>
        <h2 className="text-sm font-medium mb-3" style={{ color: '#888' }}>This Month</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Month Gross" value={formatCurrency(stats.monthGross)} />
          <KpiCard label="Month Payouts" value={formatCurrency(stats.monthPayouts)} />
          <KpiCard label="Month Stripe Fees" value={formatCurrency(stats.monthStripeFees)} />
          <KpiCard label="Month Net Profit" value={formatCurrency(stats.monthNetProfit)} accent />
        </div>
      </div>

      {/* Transaction Log */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Transaction Log</h2>
        <div className="rounded-xl border overflow-x-auto" style={{ background: '#2b2b2b', borderColor: '#3a3a3a' }}>
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr style={{ borderBottom: '1px solid #3a3a3a' }}>
                {['Date', 'ID', 'Listing', 'Status', 'Gross', 'Host Payout', 'Platform Take', 'Running Total'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: '#888' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.id} className="border-t hover:bg-white/5" style={{ borderColor: '#3a3a3a' }}>
                  <td className="px-4 py-3" style={{ color: '#aaa' }}>{formatDate(t.created_at)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/bookings/${t.id}`} className="font-mono text-xs" style={{ color: '#debb73' }}>{shortId(t.id)}</Link>
                  </td>
                  <td className="px-4 py-3 text-white max-w-[200px] truncate">{t.listings?.title ?? '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-4 py-3 text-white">{formatCurrency(t.fin.totalPrice)}</td>
                  <td className="px-4 py-3" style={{ color: '#ccc' }}>{formatCurrency(t.fin.hostPayout)}</td>
                  <td className="px-4 py-3" style={{ color: '#7ecfc0' }}>{formatCurrency(t.fin.platformTake)}</td>
                  <td className="px-4 py-3 font-medium" style={{ color: '#debb73' }}>{formatCurrency(t.runningTotal)}</td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center" style={{ color: '#666' }}>No transactions found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="text-right mt-2 text-xs" style={{ color: '#666' }}>{transactions.length} transactions</div>
      </div>
    </div>
  )
}
