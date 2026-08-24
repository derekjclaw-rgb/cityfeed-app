'use client'

/**
 * My Listings Dashboard — host view of their listings
 * Updated: new color palette, new categories
 * Batch-3: dropdown overflow fix, Unpublish action, Active/Inactive sections
 */
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, MapPin, Edit2, Trash2, Loader2, Eye, EyeOff, AlertCircle, MoreVertical, CalendarOff, ChevronDown, ChevronUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import AvailabilityManager from '@/components/AvailabilityManager'
import { getCategoryLabel } from '@/lib/design'
import { todayLocalStr } from '@/lib/fees'

interface Listing {
  id: string
  title: string
  category: string
  city: string
  state: string
  price_per_day: number
  status: string
  daily_impressions: number
  created_at: string
  images?: string[]
}

interface ListingBooking {
  id: string
  start_date: string
  end_date: string
  status: string
  advertiser_name: string
  total_price: number
}

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  pending: { backgroundColor: '#f0f8f5', color: '#2b6b5e', border: '1px solid #e8f5f3' },
  active: { backgroundColor: 'rgba(126,207,192,0.1)', color: '#7ecfc0', border: '1px solid rgba(126,207,192,0.3)' },
  inactive: { backgroundColor: '#f8f8f5', color: '#888', border: '1px solid #e0e0d8' },
  rejected: { backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' },
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Under review',
  active: 'Live',
  inactive: 'Paused',
  rejected: 'Rejected',
}

// Category labels imported from shared design constants

export default function MyListingsPage() {
  const router = useRouter()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [unpublishingId, setUnpublishingId] = useState<string | null>(null)
  const [unpublishErrors, setUnpublishErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [availabilityListing, setAvailabilityListing] = useState<{ id: string; title: string } | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [listingBookings, setListingBookings] = useState<Record<string, ListingBooking[]>>({})
  const [loadingBookings, setLoadingBookings] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/login')
        return
      }

      supabase
        .from('listings')
        .select('*')
        .eq('host_id', data.user.id)
        .order('created_at', { ascending: false })
        .then(({ data: rows, error }) => {
          if (error) {
            setError(error.message)
          } else {
            setListings(rows ?? [])
          }
          setLoading(false)
        })
    })
  }, [router])

  async function handleDelete(id: string) {
    const supabase = createClient()
    // Block deletion if listing has active or upcoming campaigns
    const today = todayLocalStr()
    const { data: activeBookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('listing_id', id)
      .not('status', 'in', '(cancelled,disputed)')
      .gte('end_date', today)
      .limit(1)

    if (activeBookings && activeBookings.length > 0) {
      alert('This listing has active or upcoming campaigns. You can delete it after all campaigns have ended.')
      setOpenMenuId(null)
      return
    }

    if (!confirm('Are you sure you want to delete this listing? This cannot be undone.')) return

    setDeletingId(id)
    const { error } = await supabase.from('listings').delete().eq('id', id)

    if (error) {
      setError(error.message)
    } else {
      setListings(prev => prev.filter(l => l.id !== id))
    }
    setDeletingId(null)
    setOpenMenuId(null)
  }

  async function handleUnpublish(id: string) {
    setOpenMenuId(null)
    // Clear any previous error for this listing
    setUnpublishErrors(prev => { const n = { ...prev }; delete n[id]; return n })

    const supabase = createClient()
    const today = todayLocalStr()

    // Block unpublish when listing has upcoming or live campaigns
    const { data: activeCampaigns } = await supabase
      .from('bookings')
      .select('id')
      .eq('listing_id', id)
      .in('status', ['pending', 'confirmed', 'active', 'pop_pending', 'pop_review'])
      .gte('end_date', today)
      .limit(1)

    if (activeCampaigns && activeCampaigns.length > 0) {
      setUnpublishErrors(prev => ({
        ...prev,
        [id]: 'This listing has upcoming or live campaigns and can\'t be unpublished.',
      }))
      return
    }

    setUnpublishingId(id)
    const { error } = await supabase
      .from('listings')
      .update({ status: 'inactive' })
      .eq('id', id)

    if (error) {
      setError(error.message)
    } else {
      setListings(prev => prev.map(l => l.id === id ? { ...l, status: 'inactive' } : l))
    }
    setUnpublishingId(null)
  }

  async function toggleExpand(listingId: string) {
    if (expandedIds.has(listingId)) {
      setExpandedIds(prev => {
        const next = new Set(prev)
        next.delete(listingId)
        return next
      })
      return
    }
    setExpandedIds(prev => new Set(prev).add(listingId))
    if (!listingBookings[listingId]) {
      setLoadingBookings(listingId)
      const supabase = createClient()
      const { data } = await supabase
        .from('bookings')
        .select('id, start_date, end_date, status, total_price, advertiser:profiles!bookings_advertiser_id_fkey(full_name)')
        .eq('listing_id', listingId)
        .not('status', 'in', '(cancelled,disputed)')
        .order('start_date', { ascending: true })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped: ListingBooking[] = (data ?? []).map((b: any) => ({
        id: b.id,
        start_date: b.start_date,
        end_date: b.end_date,
        status: b.status,
        advertiser_name: b.advertiser?.full_name ?? 'Advertiser',
        total_price: b.total_price,
      }))
      setListingBookings(prev => ({ ...prev, [listingId]: mapped }))
      setLoadingBookings(null)
    }
  }

  function bookingStatusColor(status: string, startDate: string, endDate: string): string {
    const now = new Date()
    const start = new Date(startDate + 'T00:00:00')
    const end = new Date(endDate + 'T00:00:00')
    // Completed (POP submitted) = live/green until end date
    if (status === 'completed' && now <= end) return '#16a34a'
    if (['confirmed', 'active'].includes(status) && now >= start && now < end) return '#16a34a'
    if (status === 'completed' && now > end) return '#888'
    if (now < start) return '#1d4ed8'
    if (status === 'pending') return '#b45309'
    return '#7ecfc0'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: '#f0f0ec' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#7ecfc0' }} />
      </div>
    )
  }

  // ── Section grouping ───────────────────────────────────────────────────────
  const activeListings = listings.filter(l => l.status === 'active')
  const inactiveListings = listings.filter(l => l.status !== 'active')

  // ── Render a single listing card ───────────────────────────────────────────
  function ListingCard({ listing }: { listing: Listing }) {
    return (
      <div
        key={listing.id}
        // overflow-hidden removed from this card so the absolutely-positioned
        // options menu is not clipped. The image container owns its own
        // overflow-hidden + rounded-t-2xl to keep the image properly masked.
        className="relative rounded-2xl transition-all hover:shadow-lg hover:-translate-y-0.5 group"
        // When this card's ⋮ menu is open, lift the whole card above sibling cards —
        // each card is its own stacking context (hover transform), so without this the
        // open menu paints UNDER the next card in the grid and looks "clipped".
        style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', zIndex: openMenuId === listing.id ? 60 : undefined }}
      >
        {/* Large thumbnail — clipped independently so card overflow can be visible */}
        <div className="relative h-[180px] overflow-hidden rounded-t-2xl cursor-pointer" onClick={() => toggleExpand(listing.id)}>
          {listing.images && listing.images.length > 0 ? (
            <img
              src={listing.images[0]}
              alt={listing.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#f0f0ec' }}>
              <MapPin className="w-10 h-10" style={{ color: '#ddd' }} />
            </div>
          )}
          {/* Status badge */}
          <span className="absolute top-3 left-3 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={STATUS_STYLES[listing.status] ?? STATUS_STYLES.pending}>
            {STATUS_LABELS[listing.status] ?? listing.status}
          </span>
          {/* Price badge */}
          <span className="absolute bottom-3 right-3 text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: '#debb73', color: '#2b2b2b', boxShadow: '0 2px 8px rgba(222,187,115,0.4)' }}>
            ${listing.price_per_day}/day
          </span>
        </div>

        {/* Card body */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="font-semibold text-sm leading-snug line-clamp-2" style={{ color: '#2b2b2b' }}>
              {listing.title}
            </h3>
            {/* Actions menu — rendered with z-50 so it floats above sibling cards */}
            <div className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => {
                  setOpenMenuId(openMenuId === listing.id ? null : listing.id)
                  // Clear any inline error when the menu re-opens
                  if (openMenuId !== listing.id) {
                    setUnpublishErrors(prev => { const n = { ...prev }; delete n[listing.id]; return n })
                  }
                }}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:opacity-80"
                style={{ backgroundColor: '#f8f8f5', border: '1px solid #e0e0d8' }}
              >
                <MoreVertical className="w-3.5 h-3.5" style={{ color: '#555' }} />
              </button>
              {openMenuId === listing.id && (
                <div className="absolute right-0 top-9 w-48 rounded-xl shadow-lg z-50" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', overflow: 'hidden' }}>
                  <Link
                    href={`/marketplace/${listing.id}`}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50"
                    style={{ color: '#555' }}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View listing
                  </Link>
                  <Link
                    href={`/dashboard/listings/${listing.id}/edit`}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 w-full text-left"
                    style={{ color: '#555' }}
                    onClick={() => setOpenMenuId(null)}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </Link>
                  <button
                    className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 w-full text-left"
                    style={{ color: '#555' }}
                    onClick={() => {
                      setOpenMenuId(null)
                      setAvailabilityListing({ id: listing.id, title: listing.title })
                    }}
                  >
                    <CalendarOff className="w-3.5 h-3.5" />
                    Availability
                  </button>
                  {/* Unpublish — only shown for live listings */}
                  {listing.status === 'active' && (
                    <button
                      className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 w-full text-left"
                      style={{ color: '#555' }}
                      onClick={() => handleUnpublish(listing.id)}
                      disabled={unpublishingId === listing.id}
                    >
                      {unpublishingId === listing.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <EyeOff className="w-3.5 h-3.5" />
                      }
                      Unpublish
                    </button>
                  )}
                  <button
                    className="flex items-center gap-2 px-4 py-2.5 text-sm w-full text-left hover:bg-red-50"
                    style={{ color: '#dc2626' }}
                    onClick={() => handleDelete(listing.id)}
                    disabled={deletingId === listing.id}
                  >
                    {deletingId === listing.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />
                    }
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Unpublish error — shown inline below title row */}
          {unpublishErrors[listing.id] && (
            <div className="mb-2 px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: '#fef9ec', border: '1px solid #f5e6b8', color: '#92660a' }}>
              {unpublishErrors[listing.id]}
            </div>
          )}

          <div className="flex items-center gap-1 text-xs mb-2" style={{ color: '#888' }}>
            <MapPin className="w-3 h-3" />
            {listing.city}, {listing.state}
            <span className="mx-1">·</span>
            {getCategoryLabel(listing.category)}
          </div>

          <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid #f0f0ec' }}>
            <div className="flex items-center gap-1 text-xs" style={{ color: '#888' }}>
              <Eye className="w-3 h-3" />
              {listing.daily_impressions?.toLocaleString() ?? 0} impr/day
            </div>
            <button
              onClick={() => toggleExpand(listing.id)}
              className="text-xs font-semibold flex items-center gap-1 hover:opacity-70"
              style={{ color: '#7ecfc0' }}
            >
              {expandedIds.has(listing.id) ? 'Hide' : 'Schedule'}
              {expandedIds.has(listing.id) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Expanded booking schedule */}
        {expandedIds.has(listing.id) && (
          <div className="px-4 pb-4 pt-1" style={{ borderTop: '1px solid #e0e0d8' }}>
            {loadingBookings === listing.id ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#7ecfc0' }} />
              </div>
            ) : (listingBookings[listing.id] ?? []).length > 0 ? (
              <div>
                <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: '#888' }}>
                  Bookings ({(listingBookings[listing.id] ?? []).length})
                </p>
                <div className="space-y-1.5">
                  {(listingBookings[listing.id] ?? []).map(b => (
                    <Link
                      key={b.id}
                      href={`/dashboard/bookings/${b.id}`}
                      onClick={e => e.stopPropagation()}
                      className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                      style={{ border: '1px solid #f0f0ea' }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: bookingStatusColor(b.status, b.start_date, b.end_date) }} />
                        <div>
                          <p className="text-xs font-medium" style={{ color: '#2b2b2b' }}>
                            {new Date(b.start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            {' — '}
                            {new Date(b.end_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                          <p className="text-[11px]" style={{ color: '#888' }}>{b.advertiser_name}</p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold" style={{ color: '#2b2b2b' }}>
                        ${b.total_price?.toLocaleString()}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs py-3 text-center" style={{ color: '#888' }}>No bookings yet</p>
            )}
            {/* Blocked / restricted dates — full availability picture for the host */}
            {(() => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const av = (listing as any).availability as { blocked?: Array<string | { start: string; end: string }> } | null
              const blocked = av?.blocked ?? []
              if (blocked.length === 0) return null
              const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              return (
                <div className="mt-3">
                  <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: '#888' }}>Blocked dates ({blocked.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {blocked.map((b, i) => (
                      <span key={i} className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
                        {typeof b === 'string' ? fmt(b) : b.start === b.end ? fmt(b.start) : `${fmt(b.start)} — ${fmt(b.end)}`}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-16 pb-20" style={{ backgroundColor: '#f0f0ec' }}>
      {availabilityListing && (
        <AvailabilityManager
          listingId={availabilityListing.id}
          listingTitle={availabilityListing.title}
          onClose={() => setAvailabilityListing(null)}
        />
      )}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#2b2b2b' }}>My Listings</h1>
            <p className="text-sm mt-1" style={{ color: '#888' }}>
              {listings.length} listing{listings.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link
            href="/dashboard/create-listing"
            className="inline-flex items-center gap-2 font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-colors text-sm"
            style={{ backgroundColor: '#debb73', color: '#2b2b2b', boxShadow: '0 4px 16px rgba(222,187,115,0.3)' }}
          >
            <Plus className="w-4 h-4" />
            Create new listing
          </Link>
        </div>

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm flex items-center justify-between gap-2 mb-6" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              Something went wrong. Please try again.
            </div>
            <button
              onClick={() => window.location.reload()}
              className="text-xs font-semibold underline underline-offset-2 hover:opacity-70"
            >
              Retry
            </button>
          </div>
        )}

        {listings.length === 0 ? (
          /* Empty state */
          <div className="rounded-2xl p-16 text-center" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: 'rgba(126,207,192,0.12)' }}>
              <MapPin className="w-7 h-7" style={{ color: '#7ecfc0' }} />
            </div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: '#2b2b2b' }}>You haven&apos;t listed any spaces yet.</h2>
            <p className="text-sm mb-8 max-w-sm mx-auto" style={{ color: '#888' }}>
              List your first ad space and start earning from brands looking for placements like yours.
            </p>
            <Link
              href="/dashboard/create-listing"
              className="inline-flex items-center gap-2 font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-colors"
              style={{ backgroundColor: '#debb73', color: '#2b2b2b', boxShadow: '0 4px 16px rgba(222,187,115,0.3)' }}
            >
              <Plus className="w-4 h-4" />
              Create your first listing
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            {/* ── Active listings ──────────────────────────────────────────── */}
            {activeListings.length > 0 && (
              <section>
                <h2 className="text-base font-semibold mb-4" style={{ color: '#2b2b2b' }}>Active listings</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
                  {activeListings.map(listing => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              </section>
            )}

            {/* ── Inactive listings — hidden when empty ────────────────────── */}
            {inactiveListings.length > 0 && (
              <section>
                <h2 className="text-base font-semibold mb-4" style={{ color: '#2b2b2b' }}>Inactive listings</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
                  {inactiveListings.map(listing => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
