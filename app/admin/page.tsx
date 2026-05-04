'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
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

interface Profile {
  id: string
  full_name: string
  email: string
  role: string
  created_at: string
}

export default function AdminDashboard() {
  const [allBookings, setAllBookings] = useState<Booking[]>([])
  const [allUsers, setAllUsers] = useState<Profile[]>([])
  const [listingCount, setListingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>({ label: 'All time', startDate: null, endDate: null })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/data?view=dashboard')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setAllBookings(data.bookings ?? [])
      setAllUsers(data.users ?? [])
      setListingCount(data.activeListingCount ?? 0)
    } catch (err) {
      console.error('Admin fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Apply date range filter
  const bookings = filterByDate(allBookings, dateRange)
  const users = filterByDate(allUsers, dateRange)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#debb73' }} />
      </div>
    )
  }

  const nonCancelled = bookings.filter(b => b.status !== 'cancelled')
  const totalRevenue = nonCancelled.reduce((s, b) => s + (b.total_price || 0), 0)
  const completedBookings = bookings.filter(b => b.status === 'completed')
  const platformTake = completedBookings.reduce((s, b) => {
    const fin = calcFinancials(b.total_price, b.payout_amount)
    return s + fin.platformTake
  }, 0)
  const pendingCount = bookings.filter(b => b.status === 'pending' || b.status === 'pop_pending').length
  const recentBookings = bookings.slice(0, 10)
  const recentUsers = users.slice(0, 5)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: '#888' }}>Platform overview</p>
      </div>

      <DateRangeFilter current={dateRange} onChange={setDateRange} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard label="Gross Revenue" value={formatCurrency(totalRevenue)} accent />
        <KpiCard label="Platform Take" value={formatCurrency(platformTake)} sub="Completed only" />
        <KpiCard label="Active Listings" value={String(listingCount)} />
        <KpiCard label="Total Users" value={String(dateRange.startDate ? users.length : allUsers.length)} />
        <KpiCard label={dateRange.startDate ? 'Bookings (range)' : 'All Bookings'} value={String(bookings.length)} />
        <KpiCard label="Pending" value={String(pendingCount)} />
      </div>

      {/* Recent Bookings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recent Bookings</h2>
          <Link href="/admin/bookings" className="text-xs" style={{ color: '#debb73' }}>View all →</Link>
        </div>
        <div className="rounded-xl border overflow-hidden" style={{ background: '#2b2b2b', borderColor: '#3a3a3a' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #3a3a3a' }}>
                {['ID', 'Listing', 'Advertiser', 'Status', 'Amount', 'Date'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: '#888' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentBookings.map(b => (
                <tr key={b.id} className="border-t hover:bg-white/5" style={{ borderColor: '#3a3a3a' }}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/bookings/${b.id}`} className="font-mono text-xs" style={{ color: '#debb73' }}>
                      {shortId(b.id)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-white truncate max-w-[200px]">{b.listings?.title ?? '—'}</td>
                  <td className="px-4 py-3" style={{ color: '#ccc' }}>{b.advertiser?.full_name ?? '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                  <td className="px-4 py-3 text-white">{formatCurrency(b.total_price)}</td>
                  <td className="px-4 py-3" style={{ color: '#888' }}>{formatDate(b.created_at)}</td>
                </tr>
              ))}
              {recentBookings.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center" style={{ color: '#666' }}>No bookings found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Signups */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recent Signups</h2>
          <Link href="/admin/users" className="text-xs" style={{ color: '#debb73' }}>View all →</Link>
        </div>
        <div className="rounded-xl border overflow-hidden" style={{ background: '#2b2b2b', borderColor: '#3a3a3a' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #3a3a3a' }}>
                {['Name', 'Email', 'Role', 'Joined'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: '#888' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentUsers.map(u => (
                <tr key={u.id} className="border-t" style={{ borderColor: '#3a3a3a' }}>
                  <td className="px-4 py-3 text-white">{u.full_name || '—'}</td>
                  <td className="px-4 py-3" style={{ color: '#ccc' }}>{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#debb7320', color: '#debb73' }}>
                      {u.role || 'user'}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: '#888' }}>{formatDate(u.created_at)}</td>
                </tr>
              ))}
              {recentUsers.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center" style={{ color: '#666' }}>No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function filterByDate<T extends { created_at: string }>(items: T[], range: DateRange): T[] {
  if (!range.startDate) return items
  const start = range.startDate
  const end = range.endDate ?? new Date().toISOString().split('T')[0]
  return items.filter(item => {
    const d = item.created_at.split('T')[0]
    return d >= start && d <= end
  })
}
