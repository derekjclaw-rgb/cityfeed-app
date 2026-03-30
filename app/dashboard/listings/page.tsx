'use client'

/**
 * My Listings Dashboard — host view of their listings
 * Updated: new color palette, new categories
 */
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, MapPin, Edit2, Trash2, Loader2, Eye, AlertCircle, MoreVertical, CalendarOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import AvailabilityManager from '@/components/AvailabilityManager'

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

const CATEGORY_LABELS: Record<string, string> = {
  digital_billboards: 'Digital Billboard',
  static_billboards: 'Static Billboard',
  transit: 'Transit',
  outdoor_static: 'Outdoor Static',
  outdoor_digital: 'Outdoor Digital',
  display_on_premise: 'Display On-Premise',
  event_based: 'Event-Based',
  human_based: 'Human-Based',
  experiential: 'Experiential',
  street_furniture: 'Street Furniture',
  unique: 'Unique',
  // legacy
  billboard: 'Billboard',
  digital_screen: 'Digital Screen',
  window: 'Window Wrap',
  storefront: 'Storefront',
  vehicle_wrap: 'Vehicle Wrap',
  event_space: 'Event Space',
  other: 'Other',
}

export default function MyListingsPage() {
  const router = useRouter()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [availabilityListing, setAvailabilityListing] = useState<{ id: string; title: string } | null>(null)

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
    if (!confirm('Are you sure you want to delete this listing? This cannot be undone.')) return

    setDeletingId(id)
    const supabase = createClient()
    const { error } = await supabase.from('listings').delete().eq('id', id)

    if (error) {
      setError(error.message)
    } else {
      setListings(prev => prev.filter(l => l.id !== id))
    }
    setDeletingId(null)
    setOpenMenuId(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: '#f0f0ec' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#7ecfc0' }} />
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
          <div className="space-y-4">
            {listings.map(listing => (
              <div
                key={listing.id}
                className="rounded-2xl overflow-visible transition-shadow hover:shadow-md flex items-center gap-4 p-4"
                style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
              >
                {/* Thumbnail */}
                {listing.images && listing.images.length > 0 ? (
                  <img
                    src={listing.images[0]}
                    alt={listing.title}
                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                    style={{ border: '1px solid #e0e0d8' }}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f0f0ec', border: '1px solid #e0e0d8' }}>
                    <MapPin className="w-6 h-6" style={{ color: '#ccc' }} />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-sm leading-snug line-clamp-1" style={{ color: '#2b2b2b' }}>
                      {listing.title}
                    </h3>
                    <span className="flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full" style={STATUS_STYLES[listing.status] ?? STATUS_STYLES.pending}>
                      {STATUS_LABELS[listing.status] ?? listing.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-xs mb-2" style={{ color: '#888' }}>
                    <MapPin className="w-3 h-3" />
                    {listing.city}, {listing.state}
                    <span className="mx-1">·</span>
                    {CATEGORY_LABELS[listing.category] ?? listing.category}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm" style={{ color: '#7ecfc0' }}>${listing.price_per_day}/day</span>
                    <div className="flex items-center gap-1 text-xs" style={{ color: '#888' }}>
                      <Eye className="w-3 h-3" />
                      {listing.daily_impressions?.toLocaleString() ?? 0} impr/day
                    </div>
                  </div>
                </div>

                {/* Actions menu */}
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setOpenMenuId(openMenuId === listing.id ? null : listing.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:opacity-80"
                    style={{ backgroundColor: '#f8f8f5', border: '1px solid #e0e0d8' }}
                  >
                    <MoreVertical className="w-4 h-4" style={{ color: '#555' }} />
                  </button>
                  {openMenuId === listing.id && (
                    <div className="absolute right-0 top-10 w-40 rounded-xl shadow-lg z-10 overflow-hidden" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8' }}>
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
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
