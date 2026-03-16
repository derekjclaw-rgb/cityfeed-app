'use client'

/**
 * My Listings Dashboard — host view of their listings
 */
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, MapPin, Star, Edit2, Trash2, Loader2, Eye, AlertCircle, MoreVertical } from 'lucide-react'
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

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  active: 'bg-green-50 text-green-700 border border-green-200',
  inactive: 'bg-gray-100 text-gray-500 border border-gray-200',
  rejected: 'bg-red-50 text-red-600 border border-red-200',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Under review',
  active: 'Live',
  inactive: 'Paused',
  rejected: 'Rejected',
}

const CATEGORY_LABELS: Record<string, string> = {
  billboard: 'Billboard',
  digital_screen: 'Digital Screen',
  window: 'Window Wrap',
  storefront: 'Storefront',
  vehicle_wrap: 'Vehicle Wrap',
  event_space: 'Event Space',
  transit: 'Transit',
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#22c55e]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16 pb-20">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Listings</h1>
            <p className="text-gray-500 text-sm mt-1">
              {listings.length} listing{listings.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link
            href="/dashboard/create-listing"
            className="inline-flex items-center gap-2 bg-[#22c55e] text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-[#16a34a] transition-colors shadow-lg shadow-green-200 text-sm"
          >
            <Plus className="w-4 h-4" />
            Create new listing
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm flex items-center gap-2 mb-6">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {listings.length === 0 ? (
          /* Empty state */
          <div className="bg-white border border-gray-100 rounded-2xl p-16 text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-5">
              <MapPin className="w-7 h-7 text-[#22c55e]" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No listings yet</h2>
            <p className="text-gray-500 text-sm mb-8 max-w-sm mx-auto">
              List your first ad space and start earning from brands looking for placements like yours.
            </p>
            <Link
              href="/dashboard/create-listing"
              className="inline-flex items-center gap-2 bg-[#22c55e] text-white font-semibold px-6 py-3 rounded-xl hover:bg-[#16a34a] transition-colors shadow-lg shadow-green-200"
            >
              <Plus className="w-4 h-4" />
              Create your first listing
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map(listing => (
              <div key={listing.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {/* Image placeholder */}
                <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <MapPin className="w-8 h-8 text-gray-300" />
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[listing.status] ?? STATUS_STYLES.pending}`}>
                      {STATUS_LABELS[listing.status] ?? listing.status}
                    </span>
                  </div>
                  {/* Actions menu */}
                  <div className="absolute top-3 left-3">
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === listing.id ? null : listing.id)}
                        className="w-8 h-8 rounded-lg bg-white/90 hover:bg-white flex items-center justify-center shadow-sm transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-600" />
                      </button>
                      {openMenuId === listing.id && (
                        <div className="absolute left-0 top-10 w-40 bg-white border border-gray-100 rounded-xl shadow-lg z-10 overflow-hidden">
                          <Link
                            href={`/marketplace/${listing.id}`}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View listing
                          </Link>
                          <button
                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
                            onClick={() => setOpenMenuId(null)}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Edit
                          </button>
                          <button
                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full text-left"
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
                  <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-2 line-clamp-2">
                    {listing.title}
                  </h3>

                  <div className="flex items-center gap-1 text-gray-400 text-xs mb-3">
                    <MapPin className="w-3 h-3" />
                    {listing.city}, {listing.state}
                    <span className="mx-1">·</span>
                    {CATEGORY_LABELS[listing.category] ?? listing.category}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#22c55e] font-bold text-sm">${listing.price_per_day}/day</span>
                    <div className="flex items-center gap-1 text-gray-400 text-xs">
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
