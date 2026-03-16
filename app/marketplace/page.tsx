'use client'

/**
 * Marketplace page — browse listing cards with search + category filter
 * Mock data for Phase 1; will pull from Supabase in Phase 2
 */
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { MapPin, Search, Star, SlidersHorizontal, X } from 'lucide-react'

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
  image_placeholder: string   // gradient color for mock
  tags: string[]
}

// ─── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_LISTINGS: Listing[] = [
  { id: '1', title: 'Downtown Digital Billboard — Las Vegas Blvd', category: 'billboard', city: 'Las Vegas', state: 'NV', price_per_day: 450, rating: 4.9, review_count: 23, image_placeholder: 'from-purple-900 to-purple-600', tags: ['High traffic', 'LED', '24/7'] },
  { id: '2', title: 'Coffee Shop Window Wrap — Arts District', category: 'window', city: 'Los Angeles', state: 'CA', price_per_day: 85, rating: 4.7, review_count: 11, image_placeholder: 'from-emerald-900 to-emerald-600', tags: ['Street-level', 'High foot traffic'] },
  { id: '3', title: 'Food Truck Fleet Wraps — 5 Vehicles', category: 'vehicle_wrap', city: 'Austin', state: 'TX', price_per_day: 200, rating: 4.8, review_count: 17, image_placeholder: 'from-orange-900 to-orange-600', tags: ['Mobile', 'Event-ready'] },
  { id: '4', title: 'Indoor Digital Screen — Union Square Mall', category: 'digital_screen', city: 'San Francisco', state: 'CA', price_per_day: 320, rating: 4.6, review_count: 8, image_placeholder: 'from-blue-900 to-blue-600', tags: ['Indoor', '4K display', 'Loop ads'] },
  { id: '5', title: 'Parking Lot Billboard — 15k Daily Impressions', category: 'billboard', city: 'Chicago', state: 'IL', price_per_day: 380, rating: 4.9, review_count: 31, image_placeholder: 'from-red-900 to-red-600', tags: ['Verified traffic', 'Highway adjacent'] },
  { id: '6', title: 'Boutique Storefront Banner — SoHo Block', category: 'storefront', city: 'New York', state: 'NY', price_per_day: 150, rating: 4.5, review_count: 14, image_placeholder: 'from-pink-900 to-pink-600', tags: ['Fashion district', 'Pedestrian'] },
  { id: '7', title: 'Bus Stop Shelter — Metro Line 12', category: 'transit', city: 'Seattle', state: 'WA', price_per_day: 120, rating: 4.7, review_count: 6, image_placeholder: 'from-teal-900 to-teal-600', tags: ['Transit', 'High volume'] },
  { id: '8', title: 'Rooftop LED Screen — Midtown East', category: 'digital_screen', city: 'New York', state: 'NY', price_per_day: 680, rating: 5.0, review_count: 4, image_placeholder: 'from-indigo-900 to-indigo-600', tags: ['Premium', 'Times Square adjacent'] },
  { id: '9', title: 'Community Event Space Wall — East Village', category: 'event_space', city: 'New York', state: 'NY', price_per_day: 95, rating: 4.4, review_count: 9, image_placeholder: 'from-yellow-900 to-yellow-600', tags: ['Mural-style', 'Cultural'] },
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

// ─── Components ────────────────────────────────────────────────────────────────
function ListingCard({ listing }: { listing: Listing }) {
  return (
    <div className="group bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden hover:border-[#22c55e]/30 transition-all hover:-translate-y-1">
      {/* Image placeholder */}
      <div className={`h-44 bg-gradient-to-br ${listing.image_placeholder} relative`}>
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute top-3 left-3">
          <span className="bg-black/40 backdrop-blur-sm text-white/80 text-xs px-2.5 py-1 rounded-full">
            {CATEGORIES.find(c => c.value === listing.category)?.label ?? listing.category}
          </span>
        </div>
        <div className="absolute bottom-3 right-3">
          <span className="bg-[#22c55e] text-black text-xs font-bold px-2.5 py-1 rounded-full">
            ${listing.price_per_day}/day
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-semibold text-white text-sm leading-snug mb-2 line-clamp-2 group-hover:text-[#22c55e] transition-colors">
          {listing.title}
        </h3>

        <div className="flex items-center gap-1.5 text-white/40 text-xs mb-3">
          <MapPin className="w-3 h-3" />
          {listing.city}, {listing.state}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {listing.tags.slice(0, 2).map(tag => (
            <span key={tag} className="bg-white/[0.05] text-white/40 text-xs px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>

        {/* Rating + CTA */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-[#22c55e] fill-[#22c55e]" />
            <span className="text-white text-xs font-semibold">{listing.rating}</span>
            <span className="text-white/30 text-xs">({listing.review_count})</span>
          </div>
          <button className="text-xs text-[#22c55e] font-medium hover:text-white transition-colors">
            View details →
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function MarketplacePage() {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'rating'>('rating')

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
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Top Nav */}
      <nav className="fixed top-0 w-full z-50 bg-[#0a0a0f]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-[#22c55e] flex items-center justify-center">
              <MapPin className="w-4 h-4 text-black" />
            </div>
            <span className="font-bold text-lg tracking-tight">City Feed</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-white/50 hover:text-white transition-colors">Sign in</Link>
            <Link href="/signup" className="text-sm bg-[#22c55e] text-black font-semibold px-4 py-2 rounded-lg hover:bg-[#16a34a] transition-colors">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-20 max-w-7xl mx-auto px-6 pb-20">
        {/* Header */}
        <div className="py-10">
          <h1 className="text-3xl font-bold mb-2">Browse ad placements</h1>
          <p className="text-white/40">
            {MOCK_LISTINGS.length} listings across the US
          </p>
        </div>

        {/* Search + Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Search by location, type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl pl-11 pr-10 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 transition-colors text-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-white/30" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#22c55e]/50 cursor-pointer"
            >
              <option value="rating" className="bg-[#0a0a0f]">Top rated</option>
              <option value="price_asc" className="bg-[#0a0a0f]">Price: Low to high</option>
              <option value="price_desc" className="bg-[#0a0a0f]">Price: High to low</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 flex-wrap mb-8">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                selectedCategory === cat.value
                  ? 'bg-[#22c55e] text-black'
                  : 'bg-white/[0.05] text-white/50 hover:bg-white/10 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Results count */}
        <div className="text-sm text-white/30 mb-6">
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          {selectedCategory !== 'all' && ` in ${CATEGORIES.find(c => c.value === selectedCategory)?.label}`}
          {search && ` for "${search}"`}
        </div>

        {/* Listing Grid */}
        {filtered.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <div className="text-4xl mb-4">🗺️</div>
            <h3 className="text-lg font-semibold text-white/60 mb-2">No listings found</h3>
            <p className="text-white/30 text-sm">Try a different search or category</p>
            <button
              onClick={() => { setSearch(''); setSelectedCategory('all') }}
              className="mt-6 text-[#22c55e] text-sm hover:text-[#16a34a] transition-colors"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
