'use client'

/**
 * Marketplace page — browse listing cards with search + category filter
 * Phase 3: Real Supabase data with mock fallback
 */
import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { MapPin, Search, Star, SlidersHorizontal, X, LayoutGrid, Map } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import FavoriteButton from '@/components/FavoriteButton'
import { SHOW_MOCK_DATA } from '@/lib/constants'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Listing {
  id: string
  title: string
  category: string
  city: string
  state: string
  price_per_day: number
  rating: number
  review_count: number
  image_placeholder: string
  images?: string[]
  tags: string[]
  lat: number
  lng: number
  daily_impressions: number
}

// ─── Mock data (fallback) ──────────────────────────────────────────────────────
export const MOCK_LISTINGS: Listing[] = [
  { id: '1', title: 'Downtown Digital Billboard — Las Vegas Blvd', category: 'Digital Billboard', city: 'Las Vegas', state: 'NV', price_per_day: 450, rating: 4.9, review_count: 23, image_placeholder: 'from-purple-100 to-purple-200', tags: ['High traffic', 'LED', '24/7'], lat: 36.1699, lng: -115.1398, daily_impressions: 45000 },
  { id: '2', title: 'Coffee Shop Window Wrap — Arts District', category: 'Outdoor Static', city: 'Los Angeles', state: 'CA', price_per_day: 85, rating: 4.7, review_count: 11, image_placeholder: 'from-amber-100 to-amber-200', tags: ['Street-level', 'High foot traffic'], lat: 34.0522, lng: -118.2437, daily_impressions: 3200 },
  { id: '3', title: 'Food Truck Fleet Wraps — 5 Vehicles', category: 'Human-Based', city: 'Austin', state: 'TX', price_per_day: 200, rating: 4.8, review_count: 17, image_placeholder: 'from-orange-100 to-orange-200', tags: ['Mobile', 'Event-ready'], lat: 30.2672, lng: -97.7431, daily_impressions: 12000 },
  { id: '4', title: 'Indoor Digital Screen — Union Square Mall', category: 'Display On-Premise', city: 'San Francisco', state: 'CA', price_per_day: 320, rating: 4.6, review_count: 8, image_placeholder: 'from-blue-100 to-blue-200', tags: ['Indoor', '4K display', 'Loop ads'], lat: 37.7749, lng: -122.4194, daily_impressions: 28000 },
  { id: '5', title: 'Parking Lot Billboard — 15k Daily Impressions', category: 'Static Billboard', city: 'Chicago', state: 'IL', price_per_day: 380, rating: 4.9, review_count: 31, image_placeholder: 'from-red-100 to-red-200', tags: ['Verified traffic', 'Highway adjacent'], lat: 41.8781, lng: -87.6298, daily_impressions: 15000 },
  { id: '6', title: 'Boutique Storefront Banner — SoHo Block', category: 'Outdoor Static', city: 'New York', state: 'NY', price_per_day: 150, rating: 4.5, review_count: 14, image_placeholder: 'from-pink-100 to-pink-200', tags: ['Fashion district', 'Pedestrian'], lat: 40.7128, lng: -74.0060, daily_impressions: 8000 },
  { id: '7', title: 'Bus Stop Shelter — Metro Line 12', category: 'Transit', city: 'Seattle', state: 'WA', price_per_day: 120, rating: 4.7, review_count: 6, image_placeholder: 'from-teal-100 to-teal-200', tags: ['Transit', 'High volume'], lat: 47.6062, lng: -122.3321, daily_impressions: 9500 },
  { id: '8', title: 'Rooftop LED Screen — Midtown East', category: 'Outdoor Digital', city: 'New York', state: 'NY', price_per_day: 680, rating: 5.0, review_count: 4, image_placeholder: 'from-indigo-100 to-indigo-200', tags: ['Premium', 'Times Square adjacent'], lat: 40.7549, lng: -73.9840, daily_impressions: 60000 },
  { id: '9', title: 'Community Event Space Wall — East Village', category: 'Experiential', city: 'New York', state: 'NY', price_per_day: 95, rating: 4.4, review_count: 9, image_placeholder: 'from-yellow-100 to-yellow-200', tags: ['Mural-style', 'Cultural'], lat: 40.7282, lng: -73.9857, daily_impressions: 5000 },
]

// ─── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'all', label: 'All types' },
  { value: 'Digital Billboard', label: 'Digital Billboard' },
  { value: 'Static Billboard', label: 'Static Billboard' },
  { value: 'Transit', label: 'Transit' },
  { value: 'Outdoor Static', label: 'Outdoor Static' },
  { value: 'Outdoor Digital', label: 'Outdoor Digital' },
  { value: 'Display On-Premise', label: 'Display On-Premise' },
  { value: 'Event-Based', label: 'Event-Based' },
  { value: 'Human-Based', label: 'Human-Based' },
  { value: 'Experiential', label: 'Experiential' },
  { value: 'Street Furniture', label: 'Street Furniture' },
  { value: 'Unique', label: 'Unique' },
  { value: 'Other', label: 'Other' },
]

const CATEGORY_MAP: Record<string, string> = {
  billboard: 'Billboard',
  digital_screen: 'Digital Screen',
  window: 'Window',
  storefront: 'Storefront',
  vehicle_wrap: 'Vehicle Wrap',
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
  other: 'Other',
}

const GRADIENT_POOL = [
  'from-purple-100 to-purple-200',
  'from-amber-100 to-amber-200',
  'from-orange-100 to-orange-200',
  'from-blue-100 to-blue-200',
  'from-red-100 to-red-200',
  'from-pink-100 to-pink-200',
  'from-teal-100 to-teal-200',
  'from-indigo-100 to-indigo-200',
  'from-yellow-100 to-yellow-200',
]

// ─── Normalize DB row to Listing ───────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeDbListing(row: Record<string, any>, index: number): Listing {
  return {
    id: row.id,
    title: row.title,
    category: CATEGORY_MAP[row.category] ?? row.category,
    city: row.city ?? '',
    state: row.state ?? '',
    price_per_day: row.price_per_day ?? 0,
    rating: 0,
    review_count: 0,
    image_placeholder: GRADIENT_POOL[index % GRADIENT_POOL.length],
    images: row.images ?? [],
    tags: [],
    lat: row.lat ?? 39.8283,
    lng: row.lng ?? -98.5795,
    daily_impressions: row.daily_impressions ?? 0,
  }
}

// ─── Listing Card ──────────────────────────────────────────────────────────────
function ListingCard({ listing, compact = false }: { listing: Listing; compact?: boolean }) {
  const firstImage = listing.images?.[0]

  return (
    <Link href={`/marketplace/${listing.id}`} className="block">
      <div
        className={`group bg-white rounded-2xl overflow-hidden transition-all ${compact ? '' : 'hover:-translate-y-1'}`}
        style={{ border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
        onMouseEnter={e => { if (!compact) (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)' }}
        onMouseLeave={e => { if (!compact) (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)' }}
      >
        {/* Image */}
        <div className={`${compact ? 'h-32' : 'h-44'} relative overflow-hidden`}>
          {firstImage ? (
            <img src={firstImage} alt={listing.title} className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${listing.image_placeholder}`} />
          )}
          <div className="absolute top-3 left-3">
            <span className="bg-white/90 backdrop-blur-sm text-xs px-2.5 py-1 rounded-full font-medium shadow-sm" style={{ color: '#555' }}>
              {listing.category}
            </span>
          </div>
          {/* Favorite button — only show for real listings (non-numeric IDs) */}
          {!/^\d+$/.test(listing.id) && (
            <div className="absolute top-3 right-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)' }}>
                <FavoriteButton listingId={listing.id} size={16} />
              </div>
            </div>
          )}
          <div className="absolute bottom-3 right-3">
            <span className="text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm" style={{ backgroundColor: '#debb73' }}>
              ${listing.price_per_day}/day
            </span>
          </div>
        </div>

        {/* Content */}
        <div className={`${compact ? 'p-3' : 'p-5'}`}>
          <h3 className={`font-semibold leading-snug mb-2 line-clamp-2 transition-colors ${compact ? 'text-xs' : 'text-sm'}`} style={{ color: '#2b2b2b' }}>
            {listing.title}
          </h3>

          <div className="flex items-center gap-1.5 text-xs mb-3" style={{ color: '#888' }}>
            <MapPin className="w-3 h-3" />
            {listing.city}, {listing.state}
          </div>

          {!compact && listing.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {listing.tags.slice(0, 2).map(tag => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#f8f8f5', color: '#888', border: '1px solid #e0e0d8' }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Rating + CTA */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-[#debb73]" style={{ color: '#debb73' }} />
              <span className="text-xs font-semibold" style={{ color: '#2b2b2b' }}>{listing.rating > 0 ? listing.rating : 'New'}</span>
              {!compact && listing.review_count > 0 && <span className="text-xs" style={{ color: '#888' }}>({listing.review_count})</span>}
            </div>
            {!compact && (
              <span className="text-xs font-medium" style={{ color: '#7ecfc0' }}>View details →</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

// ─── Map View ──────────────────────────────────────────────────────────────────
function MapView({ listings }: { listings: Listing[] }) {
  const mapContainer = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null)
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null)
  // Track whether a marker was just clicked so map.on('click') doesn't immediately dismiss
  const markerClickedRef = useRef(false)

  useEffect(() => {
    if (!mapContainer.current) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let MapGL: any
    import('mapbox-gl').then((mb) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapboxgl = mb as any
      mapboxgl.default.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''
      MapGL = mapboxgl.default
      const hasListings = listings.length > 0 && listings[0].lat && listings[0].lng
      const defaultCenter: [number, number] = hasListings
        ? [listings[0].lng, listings[0].lat]
        : [-115.1398, 36.1699]
      const defaultZoom = hasListings ? 11 : 3.5
      map = new MapGL.Map({
        container: mapContainer.current!,
        style: 'mapbox://styles/mapbox/light-v11',
        center: defaultCenter,
        zoom: defaultZoom,
      })
      mapRef.current = map
      let markersAdded = false
      function addMarkers() {
        if (markersAdded) return
        markersAdded = true
        listings.forEach((listing) => {
          if (listing.lat == null || listing.lng == null) return
          const el = document.createElement('div')
          el.style.cursor = 'pointer'
          el.innerHTML = `<div style="background:#7ecfc0;color:#fff;font-size:11px;font-weight:700;padding:4px 8px;border-radius:20px;white-space:nowrap;cursor:pointer;box-shadow:0 2px 8px rgba(126,207,192,0.5);border:2px solid white;font-family:system-ui,sans-serif;z-index:10;">$${listing.price_per_day}</div>`
          const captured = listing
          el.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()
            // Flag so the mapbox click handler knows to skip
            markerClickedRef.current = true
            setTimeout(() => { markerClickedRef.current = false }, 100)
            setSelectedListing((prev) => prev?.id === captured.id ? null : captured)
          })
          new MapGL.Marker({ element: el }).setLngLat([listing.lng, listing.lat]).addTo(map)
        })
      }
      // Dismiss popup when clicking empty map area (but NOT when clicking a marker)
      map.on('click', () => {
        if (markerClickedRef.current) return
        setSelectedListing(null)
      })
      map.on('load', addMarkers)
      map.on('style.load', addMarkers)
      setTimeout(addMarkers, 2000)
    })
    return () => { map?.remove() }
  }, [listings])

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full rounded-xl" />
      {selectedListing && typeof document !== 'undefined' && createPortal(
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-80 rounded-2xl shadow-xl overflow-hidden" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', zIndex: 9999 }}>
          {selectedListing.images && selectedListing.images.length > 0 && selectedListing.images[0] ? (
            <img
              src={selectedListing.images[0]}
              alt={selectedListing.title}
              className="h-28 w-full object-cover"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement)?.style.setProperty('display', 'block') }}
            />
          ) : null}
          <div className={`h-28 bg-gradient-to-br ${selectedListing.image_placeholder}`} style={{ display: selectedListing.images && selectedListing.images.length > 0 && selectedListing.images[0] ? 'none' : 'block' }} />
          <div className="p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm leading-snug line-clamp-2" style={{ color: '#2b2b2b' }}>{selectedListing.title}</h3>
              <button onClick={() => setSelectedListing(null)} className="flex-shrink-0 mt-0.5 hover:opacity-70" style={{ color: '#888' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-xs mt-1 mb-3" style={{ color: '#888' }}>
              <MapPin className="w-3 h-3" />
              {selectedListing.city}, {selectedListing.state}
            </div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm" style={{ color: '#debb73' }}>${selectedListing.price_per_day}/day</span>
              <Link href={`/marketplace/${selectedListing.id}`} className="text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-90" style={{ backgroundColor: '#debb73' }}>
                View listing →
              </Link>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function MarketplacePage() {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'rating'>('rating')
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid')
  const [allListings, setAllListings] = useState<Listing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [usingRealData, setUsingRealData] = useState(false)

  const fetchListings = useCallback(async () => {
    try {
      const supabase = createClient()
      let query = supabase
        .from('listings')
        .select('*')
        .eq('status', 'active')

      if (selectedCategory !== 'all') {
        // Map display category back to db value
        const dbCategory = Object.entries(CATEGORY_MAP).find(([, v]) => v === selectedCategory)?.[0]
        if (dbCategory) query = query.eq('category', dbCategory)
      }

      if (search) {
        query = query.or(`title.ilike.%${search}%,city.ilike.%${search}%`)
      }

      if (sortBy === 'price_asc') query = query.order('price_per_day', { ascending: true })
      else if (sortBy === 'price_desc') query = query.order('price_per_day', { ascending: false })
      else query = query.order('created_at', { ascending: false })

      const { data, error } = await query

      if (!error && data && data.length > 0) {
        const realListings = data.map((row, i) => normalizeDbListing(row, i))
        // Merge: real listings + mock data (if enabled and IDs don't collide)
        if (SHOW_MOCK_DATA) {
          setAllListings([...realListings, ...MOCK_LISTINGS])
        } else {
          setAllListings(realListings)
        }
        setUsingRealData(true)
      } else {
        // No real data — fall back to mock if enabled
        if (SHOW_MOCK_DATA) {
          setAllListings(MOCK_LISTINGS)
        } else {
          setAllListings([])
        }
        setUsingRealData(false)
      }
    } catch {
      if (SHOW_MOCK_DATA) {
        setAllListings(MOCK_LISTINGS)
      } else {
        setAllListings([])
      }
      setUsingRealData(false)
    } finally {
      setIsLoading(false)
    }
  }, [selectedCategory, search, sortBy])

  useEffect(() => {
    setIsLoading(true)
    const t = setTimeout(fetchListings, 300)
    return () => clearTimeout(t)
  }, [fetchListings])

  const filtered = useMemo(() => {
    // Always apply client-side filter (handles both real+mock data in merged array)
    return allListings
      .filter(l => {
        const matchesSearch = !search || l.title.toLowerCase().includes(search.toLowerCase()) || l.city.toLowerCase().includes(search.toLowerCase())
        const matchesCategory = selectedCategory === 'all' || l.category === selectedCategory
        return matchesSearch && matchesCategory
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return a.price_per_day - b.price_per_day
        if (sortBy === 'price_desc') return b.price_per_day - a.price_per_day
        return b.rating - a.rating
      })
  }, [allListings, search, selectedCategory, sortBy])

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0f0ec' }}>
      <div className="pt-16 max-w-7xl mx-auto px-6 pb-20">
        {/* Header */}
        <div className="py-10">
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#2b2b2b' }}>Browse ad placements</h1>
          <p style={{ color: '#888' }}>
            {isLoading ? 'Loading...' : `${filtered.length} listing${filtered.length !== 1 ? 's' : ''} across the US`}
          </p>
        </div>

        {/* Search + Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#888' }} />
            <input
              type="text"
              placeholder="Search by location, type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl pl-11 pr-10 py-3 text-sm focus:outline-none"
              style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', color: '#2b2b2b', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#888' }}>
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4" style={{ color: '#888' }} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-xl px-4 py-3 text-sm focus:outline-none cursor-pointer"
              style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', color: '#555', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
            >
              <option value="rating">Top rated</option>
              <option value="price_asc">Price: Low to high</option>
              <option value="price_desc">Price: High to low</option>
            </select>
          </div>
          <div className="flex items-center rounded-xl overflow-hidden" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <button
              onClick={() => setViewMode('grid')}
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors"
              style={viewMode === 'grid' ? { backgroundColor: '#debb73', color: '#2b2b2b' } : { color: '#888' }}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors"
              style={viewMode === 'map' ? { backgroundColor: '#debb73', color: '#2b2b2b' } : { color: '#888' }}
            >
              <Map className="w-4 h-4" />
              <span className="hidden sm:inline">Map</span>
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 flex-wrap mb-6">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
              style={selectedCategory === cat.value ? { backgroundColor: '#debb73', color: '#2b2b2b' } : { backgroundColor: '#fff', color: '#555', border: '1px solid #e0e0d8' }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Results count */}
        <div className="text-sm mb-6" style={{ color: '#888' }}>
          {isLoading ? 'Searching...' : (
            <>
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              {selectedCategory !== 'all' && ` in ${CATEGORIES.find(c => c.value === selectedCategory)?.label}`}
              {search && ` for "${search}"`}
            </>
          )}
        </div>

        {/* Content */}
        {viewMode === 'grid' ? (
          filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(listing => <ListingCard key={listing.id} listing={listing} />)}
            </div>
          ) : (
            <div className="text-center py-24">
              <div className="text-4xl mb-4">🗺️</div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#555' }}>No placements found. Try a different search or check back soon.</h3>
              <button onClick={() => { setSearch(''); setSelectedCategory('all') }} className="mt-6 text-sm font-medium px-5 py-2.5 rounded-xl hover:opacity-90" style={{ backgroundColor: '#debb73', color: '#2b2b2b' }}>
                Clear filters
              </button>
            </div>
          )
        ) : (
          /* Map view — stacks vertically on mobile, side-by-side on lg */
          <div className="flex flex-col lg:flex-row gap-5 lg:h-[680px]">
            {/* Map first on mobile (full width), sidebar on desktop */}
            <div className="w-full lg:hidden rounded-2xl overflow-hidden shadow-sm" style={{ height: '320px', border: '1px solid #e0e0d8' }}>
              <MapView listings={filtered} />
            </div>
            <div className="w-full lg:w-96 flex-shrink-0 overflow-y-auto space-y-3 pr-1">
              {filtered.map(listing => <ListingCard key={listing.id} listing={listing} compact />)}
            </div>
            <div className="hidden lg:block flex-1 rounded-2xl overflow-hidden shadow-sm" style={{ border: '1px solid #e0e0d8' }}>
              <MapView listings={filtered} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
