'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Loader2, Search } from 'lucide-react'
import StatusBadge from '@/components/admin/StatusBadge'
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

const STATUS_FILTERS = ['all', 'pending', 'confirmed', 'completed', 'cancelled', 'pop_pending']

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/data?view=bookings')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setBookings(data.bookings ?? [])
    } catch (err) {
      console.error('Bookings fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = useMemo(() => {
    let result = bookings
    if (statusFilter !== 'all') {
      result = result.filter(b => b.status === statusFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(b =>
        (b.listings?.title ?? '').toLowerCase().includes(q) ||
        (b.advertiser?.full_name ?? '').toLowerCase().includes(q) ||
        (b.host?.full_name ?? '').toLowerCase().includes(q) ||
        shortId(b.id).toLowerCase().includes(q)
      )
    }
    return result
  }, [bookings, statusFilter, search])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#debb73' }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Bookings</h1>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: statusFilter === s ? '#debb7330' : '#2b2b2b',
                color: statusFilter === s ? '#debb73' : '#aaa',
                border: `1px solid ${statusFilter === s ? '#debb7350' : '#3a3a3a'}`,
              }}
            >
              {s === 'all' ? 'All' : s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#666' }} />
          <input
            type="text"
            placeholder="Search listing, user, or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none"
            style={{ background: '#2b2b2b', color: '#ccc', border: '1px solid #3a3a3a' }}
          />
        </div>
        <span className="text-xs" style={{ color: '#666' }}>{filtered.length} bookings</span>
      </div>

      <div className="rounded-xl border overflow-x-auto" style={{ background: '#2b2b2b', borderColor: '#3a3a3a' }}>
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr style={{ borderBottom: '1px solid #3a3a3a' }}>
              {['ID', 'Listing', 'Advertiser', 'Host', 'Dates', 'Status', 'Charged', 'Payout', 'Platform', 'Created'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: '#888' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(b => {
              const fin = calcFinancials(b.total_price, b.payout_amount)
              return (
                <tr key={b.id} className="border-t hover:bg-white/5" style={{ borderColor: '#3a3a3a' }}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/bookings/${b.id}`} className="font-mono text-xs" style={{ color: '#debb73' }}>
                      {shortId(b.id)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-white max-w-[180px] truncate">{b.listings?.title ?? '—'}</td>
                  <td className="px-4 py-3" style={{ color: '#ccc' }}>{b.advertiser?.full_name ?? '—'}</td>
                  <td className="px-4 py-3" style={{ color: '#ccc' }}>{b.host?.full_name ?? '—'}</td>
                  <td className="px-4 py-3" style={{ color: '#aaa' }}>
                    {formatDate(b.start_date)} → {formatDate(b.end_date)}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                  <td className="px-4 py-3 text-white">{formatCurrency(b.total_price)}</td>
                  <td className="px-4 py-3" style={{ color: '#ccc' }}>{formatCurrency(fin.hostPayout)}</td>
                  <td className="px-4 py-3" style={{ color: '#7ecfc0' }}>{formatCurrency(fin.platformTake)}</td>
                  <td className="px-4 py-3" style={{ color: '#888' }}>{formatDate(b.created_at)}</td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={10} className="px-4 py-12 text-center" style={{ color: '#666' }}>No bookings found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
