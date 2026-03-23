'use client'

/**
 * My Listings Dashboard — host view of their listings
 * Updated: new color palette, new categories
 */
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, MapPin, Edit2, Trash2, Loader2, Eye, AlertCircle, MoreVertical } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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
  digital_billboards: 'Digital Billboards',
  static_billboards: 'Static Billboards',
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
            style={{ backgroundColor: '#ef4135', color: '#fff', boxShadow: '0 4px 16px rgba(239,65,53,0.3)' }}
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
              style={{ backgroundColor: '#ef4135', color: '#fff', boxShadow: '0 4px 16px rgba(239,65,53,0.3)' }}
            >
              <Plus className="w-4 h-4" />
              Create your first listing
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map(listing => (
              <div
                key={listing.id}
                className="rounded-2xl overflow-hidden transition-shadow hover:shadow-md"
                style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
              >
                {/* Image placeholder */}
                <div className="h-40 relative" style={{ backgroundColor: '#f0f0ec' }}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <MapPin className="w-8 h-8" style={{ color: '#e0e0d8' }} />
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={STATUS_STYLES[listing.status] ?? STATUS_STYLES.pending}>
                      {STATUS_LABELS[listing.status] ?? listing.status}
                    </span>
                  </div>
                  {/* Actions menu */}
                  <div className="absolute top-3 left-3">
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === listing.id ? null : listing.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:opacity-80"
                        style={{ backgroundColor: 'rgba(255,255,255,0.9)', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}
                      >
                        <MoreVertical className="w-4 h-4" style={{ color: '#555' }} />
                      </button>
                      {openMenuId === listing.id && (
                        <div className="absolute left-0 top-10 w-40 rounded-xl shadow-lg z-10 overflow-hidden" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8' }}>
                          <Link
                            href={`/marketplace/${listing.id}`}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50"
                            style={{ color: '#555' }}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View listing
                          </Link>
                          <button
                            className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 w-full text-left"
                            style={{ color: '#555' }}
                            onClick={() => setOpenMenuId(null)}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Edit
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
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-sm leading-snug mb-2 line-clamp-2" style={{ color: '#2b2b2b' }}>
                    {listing.title}
                  </h3>

                  <div className="flex items-center gap-1 text-xs mb-3" style={{ color: '#888' }}>
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
