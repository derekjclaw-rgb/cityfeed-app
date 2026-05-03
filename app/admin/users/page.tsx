'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Loader2, Search, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, formatDate, shortId } from '@/lib/admin-finance'
import StatusBadge from '@/components/admin/StatusBadge'

interface Profile {
  id: string
  full_name: string
  email: string
  role: string
  avatar_url: string | null
  stripe_account_id: string | null
  stripe_connected: boolean
  created_at: string
}

interface Booking {
  id: string
  listing_id: string
  advertiser_id: string
  host_id: string
  status: string
  total_price: number
  payout_amount: number | null
  created_at: string
  start_date: string
  end_date: string
  listings: { title: string } | null
}

interface ListingMin {
  id: string
  title: string
  host_id: string
  status: string
  price_per_day: number
}

interface EnrichedUser extends Profile {
  listingCount: number
  bookingCountAsAdvertiser: number
  bookingCountAsHost: number
  totalSpent: number
  totalEarned: number
  ltv: number
  listings: ListingMin[]
  bookingsAsAdvertiser: Booking[]
  bookingsAsHost: Booking[]
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<EnrichedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedUser, setExpandedUser] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/data?view=users')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()

      const profiles = (data.profiles ?? []) as Profile[]
      const bookings = (data.bookings ?? []) as Booking[]
      const listings = (data.listings ?? []) as ListingMin[]

      const listingsByHost = new Map<string, ListingMin[]>()
      listings.forEach(l => {
        const arr = listingsByHost.get(l.host_id) ?? []
        arr.push(l)
        listingsByHost.set(l.host_id, arr)
      })

      const bookingsByAdvertiser = new Map<string, Booking[]>()
      const bookingsByHost = new Map<string, Booking[]>()
      bookings.forEach(b => {
        const advArr = bookingsByAdvertiser.get(b.advertiser_id) ?? []
        advArr.push(b)
        bookingsByAdvertiser.set(b.advertiser_id, advArr)
        if (b.host_id) {
          const hostArr = bookingsByHost.get(b.host_id) ?? []
          hostArr.push(b)
          bookingsByHost.set(b.host_id, hostArr)
        }
      })

      const enriched: EnrichedUser[] = profiles.map(p => {
        const userListings = listingsByHost.get(p.id) ?? []
        const advBookings = bookingsByAdvertiser.get(p.id) ?? []
        const hostBookings = bookingsByHost.get(p.id) ?? []
        const totalSpent = advBookings.filter(b => b.status !== 'cancelled').reduce((s, b) => s + (b.total_price ?? 0), 0)
        const totalEarned = hostBookings.filter(b => b.status === 'completed').reduce((s, b) => s + (b.payout_amount ?? 0), 0)
        return {
          ...p,
          listingCount: userListings.length,
          bookingCountAsAdvertiser: advBookings.length,
          bookingCountAsHost: hostBookings.length,
          totalSpent,
          totalEarned,
          ltv: totalSpent + totalEarned,
          listings: userListings,
          bookingsAsAdvertiser: advBookings,
          bookingsAsHost: hostBookings,
        }
      })

      setUsers(enriched)
    } catch (err) {
      console.error('Users fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const q = params.get('q')
    if (q) { setSearch(q); setExpandedUser(q) }
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return users
    const q = search.toLowerCase()
    return users.filter(u =>
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q)
    )
  }, [users, search])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#debb73' }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Users</h1>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#666' }} />
          <input
            type="text"
            placeholder="Search name, email, or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none"
            style={{ background: '#2b2b2b', color: '#ccc', border: '1px solid #3a3a3a' }}
          />
        </div>
        <span className="text-xs" style={{ color: '#666' }}>{filtered.length} users</span>
      </div>

      <div className="space-y-2">
        {/* Header */}
        <div
          className="hidden lg:grid gap-4 px-4 py-3 text-xs font-medium"
          style={{ color: '#888', gridTemplateColumns: '1.5fr 2fr 0.7fr 0.7fr 0.6fr 1fr 1fr 1fr 0.4fr' }}
        >
          <div>Name</div><div>Email</div><div>Role</div><div>Stripe</div>
          <div>Listings</div><div>Spent</div><div>Earned</div><div>LTV</div><div></div>
        </div>

        {filtered.map(u => (
          <div key={u.id}>
            <div
              className="grid gap-4 px-4 py-3 items-center text-sm cursor-pointer hover:bg-white/5 transition-colors"
              style={{
                background: expandedUser === u.id ? '#2b2b2b' : 'transparent',
                border: `1px solid ${expandedUser === u.id ? '#3a3a3a' : 'transparent'}`,
                borderRadius: expandedUser === u.id ? '0.75rem 0.75rem 0 0' : '0.75rem',
                gridTemplateColumns: '1.5fr 2fr 0.7fr 0.7fr 0.6fr 1fr 1fr 1fr 0.4fr',
              }}
              onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
            >
              <div className="text-white font-medium truncate">{u.full_name || '—'}</div>
              <div style={{ color: '#ccc' }} className="truncate">{u.email}</div>
              <div>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#debb7320', color: '#debb73' }}>
                  {u.role || 'user'}
                </span>
              </div>
              <div>
                {u.stripe_connected ? (
                  <span className="text-xs" style={{ color: '#4ade80' }}>✓ Yes</span>
                ) : (
                  <span className="text-xs" style={{ color: '#666' }}>No</span>
                )}
              </div>
              <div className="text-white">{u.listingCount}</div>
              <div style={{ color: '#ccc' }}>{formatCurrency(u.totalSpent)}</div>
              <div style={{ color: '#7ecfc0' }}>{formatCurrency(u.totalEarned)}</div>
              <div style={{ color: '#debb73' }} className="font-semibold">{formatCurrency(u.ltv)}</div>
              <div className="flex justify-end">
                {expandedUser === u.id ? <ChevronUp className="w-4 h-4" style={{ color: '#888' }} /> : <ChevronDown className="w-4 h-4" style={{ color: '#888' }} />}
              </div>
            </div>

            {expandedUser === u.id && (
              <div className="px-6 py-5 space-y-6 border border-t-0 rounded-b-xl" style={{ background: '#2b2b2b', borderColor: '#3a3a3a' }}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <DetailItem label="User ID" value={u.id.substring(0, 12) + '…'} />
                  <DetailItem label="Joined" value={formatDate(u.created_at)} />
                  <DetailItem label="Stripe Account" value={u.stripe_account_id || 'Not connected'} />
                  <DetailItem label="Avatar" value={u.avatar_url ? 'Set' : 'None'} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <DetailItem label="Bookings (Advertiser)" value={String(u.bookingCountAsAdvertiser)} />
                  <DetailItem label="Bookings (Host)" value={String(u.bookingCountAsHost)} />
                  <DetailItem label="Total Spent" value={formatCurrency(u.totalSpent)} />
                  <DetailItem label="Total Earned" value={formatCurrency(u.totalEarned)} />
                  <DetailItem label="Lifetime Value" value={formatCurrency(u.ltv)} />
                </div>

                <div className="flex gap-3">
                  <Link href={`/profile/${u.id}`} className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1" style={{ background: '#363636', color: '#debb73', border: '1px solid #4a4a4a' }}>
                    View Public Profile <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>

                {u.listings.length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium mb-2" style={{ color: '#888' }}>Listings ({u.listings.length})</h3>
                    <div className="space-y-1">
                      {u.listings.map(l => (
                        <div key={l.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: '#363636' }}>
                          <Link href={`/marketplace/${l.id}`} className="text-sm text-white hover:underline truncate">{l.title}</Link>
                          <div className="flex items-center gap-3">
                            <span className="text-xs" style={{ color: '#aaa' }}>{formatCurrency(l.price_per_day)}/day</span>
                            <StatusBadge status={l.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {u.bookingsAsAdvertiser.length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium mb-2" style={{ color: '#888' }}>Bookings as Advertiser ({u.bookingsAsAdvertiser.length})</h3>
                    <div className="space-y-1">
                      {u.bookingsAsAdvertiser.slice(0, 10).map(b => (
                        <div key={b.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: '#363636' }}>
                          <div className="flex items-center gap-3">
                            <Link href={`/admin/bookings/${b.id}`} className="font-mono text-xs" style={{ color: '#debb73' }}>{shortId(b.id)}</Link>
                            <span className="text-sm text-white truncate max-w-[200px]">{b.listings?.title ?? '—'}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-white">{formatCurrency(b.total_price)}</span>
                            <StatusBadge status={b.status} />
                          </div>
                        </div>
                      ))}
                      {u.bookingsAsAdvertiser.length > 10 && <div className="text-xs text-center py-2" style={{ color: '#666' }}>+{u.bookingsAsAdvertiser.length - 10} more</div>}
                    </div>
                  </div>
                )}

                {u.bookingsAsHost.length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium mb-2" style={{ color: '#888' }}>Bookings as Host ({u.bookingsAsHost.length})</h3>
                    <div className="space-y-1">
                      {u.bookingsAsHost.slice(0, 10).map(b => (
                        <div key={b.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: '#363636' }}>
                          <div className="flex items-center gap-3">
                            <Link href={`/admin/bookings/${b.id}`} className="font-mono text-xs" style={{ color: '#debb73' }}>{shortId(b.id)}</Link>
                            <span className="text-sm text-white truncate max-w-[200px]">{b.listings?.title ?? '—'}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm" style={{ color: '#7ecfc0' }}>{formatCurrency(b.payout_amount ?? 0)} payout</span>
                            <StatusBadge status={b.status} />
                          </div>
                        </div>
                      ))}
                      {u.bookingsAsHost.length > 10 && <div className="text-xs text-center py-2" style={{ color: '#666' }}>+{u.bookingsAsHost.length - 10} more</div>}
                    </div>
                  </div>
                )}

                {u.bookingsAsAdvertiser.length === 0 && u.bookingsAsHost.length === 0 && u.listings.length === 0 && (
                  <div className="text-center py-4" style={{ color: '#666' }}>No activity yet</div>
                )}
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && <div className="text-center py-12" style={{ color: '#666' }}>No users found</div>}
      </div>
    </div>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-medium" style={{ color: '#666' }}>{label}</div>
      <div className="text-sm text-white truncate">{value}</div>
    </div>
  )
}
