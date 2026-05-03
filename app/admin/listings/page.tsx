'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Loader2, Search } from 'lucide-react'
import StatusBadge from '@/components/admin/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/admin-finance'

interface Listing {
  id: string
  title: string
  category: string
  city: string
  state: string
  price_per_day: number
  status: string
  created_at: string
  host_id: string
  host: { full_name: string } | null
  booking_count: number
  total_revenue: number
}

interface BookingAgg {
  listing_id: string
  total_price: number
}

export default function AdminListingsPage() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/data?view=listings')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()

      const aggMap = new Map<string, { count: number; revenue: number }>()
      ;(data.bookingAggs ?? []).forEach((b: BookingAgg) => {
        const curr = aggMap.get(b.listing_id) ?? { count: 0, revenue: 0 }
        curr.count++
        curr.revenue += b.total_price ?? 0
        aggMap.set(b.listing_id, curr)
      })

      const enriched = (data.listings ?? []).map((l: Listing) => ({
        ...l,
        booking_count: aggMap.get(l.id)?.count ?? 0,
        total_revenue: aggMap.get(l.id)?.revenue ?? 0,
      }))

      setListings(enriched)
    } catch (err) {
      console.error('Listings fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = useMemo(() => {
    let result = listings
    if (statusFilter !== 'all') result = result.filter(l => l.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(l =>
        l.title.toLowerCase().includes(q) ||
        (l.host?.full_name ?? '').toLowerCase().includes(q)
      )
    }
    return result
  }, [listings, statusFilter, search])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#debb73' }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Listings</h1>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {['all', 'active', 'inactive'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                background: statusFilter === s ? '#debb7330' : '#2b2b2b',
                color: statusFilter === s ? '#debb73' : '#aaa',
                border: `1px solid ${statusFilter === s ? '#debb7350' : '#3a3a3a'}`,
              }}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#666' }} />
          <input
            type="text"
            placeholder="Search title or host..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none"
            style={{ background: '#2b2b2b', color: '#ccc', border: '1px solid #3a3a3a' }}
          />
        </div>
        <span className="text-xs" style={{ color: '#666' }}>{filtered.length} listings</span>
      </div>

      <div className="rounded-xl border overflow-x-auto" style={{ background: '#2b2b2b', borderColor: '#3a3a3a' }}>
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr style={{ borderBottom: '1px solid #3a3a3a' }}>
              {['Title', 'Host', 'Category', 'Price/Day', 'Status', 'City', 'Bookings', 'Revenue', 'Created'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: '#888' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(l => (
              <tr key={l.id} className="border-t hover:bg-white/5" style={{ borderColor: '#3a3a3a' }}>
                <td className="px-4 py-3">
                  <Link href={`/marketplace/${l.id}`} className="text-white hover:underline max-w-[200px] truncate block">{l.title}</Link>
                </td>
                <td className="px-4 py-3" style={{ color: '#ccc' }}>{l.host?.full_name ?? '—'}</td>
                <td className="px-4 py-3" style={{ color: '#aaa' }}>{l.category}</td>
                <td className="px-4 py-3 text-white">{formatCurrency(l.price_per_day)}</td>
                <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                <td className="px-4 py-3" style={{ color: '#aaa' }}>{l.city}{l.state ? `, ${l.state}` : ''}</td>
                <td className="px-4 py-3 text-white">{l.booking_count}</td>
                <td className="px-4 py-3" style={{ color: '#7ecfc0' }}>{formatCurrency(l.total_revenue)}</td>
                <td className="px-4 py-3" style={{ color: '#888' }}>{formatDate(l.created_at)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-12 text-center" style={{ color: '#666' }}>No listings found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
