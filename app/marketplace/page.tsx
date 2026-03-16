'use client'

/**
 * Marketplace page — browse listing cards with search + category filter
 * Light theme, Zillow-style grid/map toggle
 */
import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { MapPin, Search, Star, SlidersHorizontal, X, LayoutGrid, Map } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Listing {
  id: string
  title: string
  category: string
  city: string
  state: string
  price_per_day: number
  rating: number
  review_count: number
  image_placeholder: string
  tags: string[]
  lat: number
  lng: number
  daily_impressions: number
}

// ─── Mock data ─────────────────────────────────────────────────────────────────
export const MOCK_LISTINGS: Listing[] = [
  { id: '1', title: 'Downtown Digital Billboard — Las Vegas Blvd', category: 'billboard', city: 'Las Vegas', state: 'NV', price_per_day: 450, rating: 4.9, review_count: 23, image_placeholder: 'from-purple-100 to-purple-200', tags: ['High traffic', 'LED', '24/7'], lat: 36.1699, lng: -115.1398, daily_impressions: 45000 },
  { id: '2', title: 'Coffee Shop Window Wrap — Arts District', category: 'window', city: 'Los Angeles', state: 'CA', price_per_day: 85, rating: 4.7, review_count: 11, image_placeholder: 'from-emerald-100 to-emerald-200', tags: ['Street-level', 'High foot traffic'], lat: 34.0522, lng: -118.2437, daily_impressions: 3200 },
  { id: '3', title: 'Food Truck Fleet Wraps — 5 Vehicles', category: 'vehicle_wrap', city: 'Austin', state: 'TX', price_per_day: 200, rating: 4.8, review_count: 17, image_placeholder: 'from-orange-100 to-orange-200', tags: ['Mobile', 'Event-ready'], lat: 30.2672, lng: -97.7431, daily_impressions: 12000 },
  { id: '4', title: 'Indoor Digital Screen — Union Square Mall', category: 'digital_screen', city: 'San Francisco', state: 'CA', price_per_day: 320, rating: 4.6, review_count: 8, image_placeholder: 'from-blue-100 to-blue-200', tags: ['Indoor', '4K display', 'Loop ads'], lat: 37.7749, lng: -122.4194, daily_impressions: 28000 },
  { id: '5', title: 'Parking Lot Billboard — 15k Daily Impressions', category: 'billboard', city: 'Chicago', state: 'IL', price_per_day: 380, rating: 4.9, review_count: 31, image_placeholder: 'from-red-100 to-red-200', tags: ['Verified traffic', 'Highway adjacent'], lat: 41.8781, lng: -87.6298, daily_impressions: 15000 },
  { id: '6', title: 'Boutique Storefront Banner — SoHo Block', category: 'storefront', city: 'New York', state: 'NY', price_per_day: 150, rating: 4.5, review_count: 14, image_placeholder: 'from-pink-100 to-pink-200', tags: ['Fashion district', 'Pedestrian'], lat: 40.7128, lng: -74.0060, daily_impressions: 8000 },
  { id: '7', title: 'Bus Stop Shelter — Metro Line 12', category: 'transit', city: 'Seattle', state: 'WA', price_per_day: 120, rating: 4.7, review_count: 6, image_placeholder: 'from-teal-100 to-teal-200', tags: ['Transit', 'High volume'], lat: 47.6062, lng: -122.3321, daily_impressions: 9500 },
  { id: '8', title: 'Rooftop LED Screen — Midtown East', category: 'digital_screen', city: 'New York', state: 'NY', price_per_day: 680, rating: 5.0, review_count: 4, image_placeholder: 'from-indigo-100 to-indigo-200', tags: ['Premium', 'Times Square adjacent'], lat: 40.7549, lng: -73.9840, daily_impressions: 60000 },
  { id: '9', title: 'Community Event Space Wall — East Village', category: 'event_space', city: 'New York', state: 'NY', price_per_day: 95, rating: 4.4, review_count: 9, image_placeholder: 'from-yellow-100 to-yellow-200', tags: ['Mural-style', 'Cultural'], lat: 40.7282, lng: -73.9857, daily_impressions: 5000 },
]

// ─── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'all', label: 'All types' },
  { value: 'billboard', label: 'Billboard' },
  { value: 'digital_screen', label: 'Digital Screen' },
  { value: 'window', label: 'Window' },
  { value: 'storefront', label: 'Storefront' },
  { value: 'vehicle_wrap', label: 'Vehicle Wrap' },
  { value: 'event_space', label: 'Event Space' },
  { value: 'transit', label: 'Transit' },
]

// ─── Listing Card ──────────────────────────────────────────────────────────────
function ListingCard({ listing, compact = false }: { listing: Listing; compact?: boolean }) {
  return (
    <Link href={`/marketplace/${listing.id}`} className="block">
      <div className={`group bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-green-200 hover:shadow-md transition-all ${compact ? '' : 'hover:-translate-y-1'}`}>
        {/* Image placeholder */}
        <div className={`${compact ? 'h-32' : 'h-44'} bg-gradient-to-br ${listing.image_placeholder} relative`}>
          <div className="absolute top-3 left-3">
            <span className="bg-white/90 backdrop-blur-sm text-gray-700 text-xs px-2.5 py-1 rounded-full font-medium shadow-sm">
              {CATEGORIES.find(c => c.value === listing.category)?.label ?? listing.category}
            </span>
          </div>
          <div className="absolute bottom-3 right-3">
            <span className="bg-[#22c55e] text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
              ${listing.price_per_day}/day
            </span>
          </div>
        </div>

        {/* Content */}
        <div className={`${compact ? 'p-3' : 'p-5'}`}>
          <h3 className={`font-semibold text-gray-900 leading-snug mb-2 line-clamp-2 group-hover:text-[#22c55e] transition-colors ${compact ? 'text-xs' : 'text-sm'}`}>
            {listing.title}
          </h3>

          <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-3">
            <MapPin className="w-3 h-3" />
            {listing.city}, {listing.state}
          </div>

          {!compact && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {listing.tags.slice(0, 2).map(tag => (
                <span key={tag} className="bg-gray-50 text-gray-500 text-xs px-2 py-0.5 rounded-full border border-gray-100">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Rating + CTA */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-[#22c55e] fill-[#22c55e]" />
              <span className="text-gray-900 text-xs font-semibold">{listing.rating}</span>
              {!compact && <span className="text-gray-400 text-xs">({listing.review_count})</span>}
            </div>
            {!compact && (
              <span className="text-xs text-[#22c55e] font-medium">View details →</span>
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

  useEffect(() => {
    if (!mapContainer.current) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any

    import('mapbox-gl').then((mb) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapboxgl = mb as any
      mapboxgl.default.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''
      const MapGL = mapboxgl.default

      map = new MapGL.Map({
        container: mapContainer.current!,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [-98.5795, 39.8283],
        zoom: 3.5,
      })

      mapRef.current = map

      map.on('load', () => {
        listings.forEach((listing) => {
          const el = document.createElement('div')
          el.className = 'mapbox-marker'
          el.innerHTML = `
            <div style="
              background: #22c55e;
              color: white;
              font-size: 11px;
              font-weight: 700;
              padding: 4px 8px;
              border-radius: 20px;
              white-space: nowrap;
              cursor: pointer;
              box-shadow: 0 2px 8px rgba(34,197,94,0.4);
              border: 2px solid white;
              font-family: system-ui, sans-serif;
            ">$${listing.price_per_day}</div>
          `

          el.addEventListener('click', () => {
            setSelectedListing(listing)
          })

          new MapGL.Marker({ element: el })
            .setLngLat([listing.lng, listing.lat])
            .addTo(map)
        })
      })
    })

    return () => {
      map?.remove()
    }
  }, [listings])

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full rounded-xl" />

      {/* Popup overlay */}
      {selectedListing && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-10">
          <div className={`h-28 bg-gradient-to-br ${selectedListing.image_placeholder}`} />
          <div className="p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">
                {selectedListing.title}
              </h3>
              <button
                onClick={() => setSelectedListing(null)}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400 text-xs mt-1 mb-3">
              <MapPin className="w-3 h-3" />
              {selectedListing.city}, {selectedListing.state}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#22c55e] font-bold text-sm">${selectedListing.price_per_day}/day</span>
              <Link
                href={`/marketplace/${selectedListing.id}`}
                className="bg-[#22c55e] text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#16a34a] transition-colors"
              >
                View listing →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function MarketplacePage() {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'rating'>('rating')
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid')

  const filtered = useMemo(() => {
    return MOCK_LISTINGS
      .filter(l => {
        const matchesSearch =
          !search ||
          l.title.toLowerCase().includes(search.toLowerCase()) ||
          l.city.toLowerCase().includes(search.toLowerCase())
        const matchesCategory = selectedCategory === 'all' || l.category === selectedCategory
        return matchesSearch && matchesCategory
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return a.price_per_day - b.price_per_day
        if (sortBy === 'price_desc') return b.price_per_day - a.price_per_day
        return b.rating - a.rating
      })
  }, [search, selectedCategory, sortBy])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-16 max-w-7xl mx-auto px-6 pb-20">
        {/* Header */}
        <div className="py-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Browse ad placements</h1>
          <p className="text-gray-500">
            {MOCK_LISTINGS.length} listings across the US
          </p>
        </div>

        {/* Search + Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by location, type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl pl-11 pr-10 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#22c55e] focus:ring-2 focus:ring-green-100 transition-colors text-sm shadow-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-700 text-sm focus:outline-none focus:border-[#22c55e] cursor-pointer shadow-sm"
            >
              <option value="rating">Top rated</option>
              <option value="price_asc">Price: Low to high</option>
              <option value="price_desc">Price: High to low</option>
            </select>
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                viewMode === 'grid' ? 'bg-[#22c55e] text-white' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                viewMode === 'map' ? 'bg-[#22c55e] text-white' : 'text-gray-500 hover:text-gray-900'
              }`}
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
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                selectedCategory === cat.value
                  ? 'bg-[#22c55e] text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:text-gray-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Results count */}
        <div className="text-sm text-gray-400 mb-6">
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          {selectedCategory !== 'all' && ` in ${CATEGORIES.find(c => c.value === selectedCategory)?.label}`}
          {search && ` for "${search}"`}
        </div>

        {/* Content */}
        {viewMode === 'grid' ? (
          filtered.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(listing => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="text-center py-24">
              <div className="text-4xl mb-4">🗺️</div>
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No listings found</h3>
              <p className="text-gray-400 text-sm">Try a different search or category</p>
              <button
                onClick={() => { setSearch(''); setSelectedCategory('all') }}
                className="mt-6 text-[#22c55e] text-sm hover:text-[#16a34a] transition-colors"
              >
                Clear filters
              </button>
            </div>
          )
        ) : (
          /* Map view — Zillow-style side-by-side */
          <div className="flex gap-5 h-[680px]">
            {/* Left: scrollable list */}
            <div className="w-96 flex-shrink-0 overflow-y-auto space-y-3 pr-1">
              {filtered.map(listing => (
                <ListingCard key={listing.id} listing={listing} compact />
              ))}
            </div>
            {/* Right: map */}
            <div className="flex-1 rounded-2xl overflow-hidden shadow-sm border border-gray-100">
              <MapView listings={filtered} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
