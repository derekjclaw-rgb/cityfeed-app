'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { MapPin, Search, Star, ArrowRight, Calendar } from 'lucide-react'

// ─── Mock listing data (shared with marketplace) ──────────────────────────────
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
}

export const HOMEPAGE_LISTINGS: Listing[] = [
  { id: '1', title: 'Downtown Digital Billboard — Las Vegas Blvd', category: 'Digital Billboards', city: 'Las Vegas', state: 'NV', price_per_day: 450, rating: 4.9, review_count: 23, image_placeholder: 'from-purple-100 to-purple-200', tags: ['High traffic', 'LED', '24/7'] },
  { id: '2', title: 'Coffee Shop Window Wrap — Arts District', category: 'Outdoor Static', city: 'Los Angeles', state: 'CA', price_per_day: 85, rating: 4.7, review_count: 11, image_placeholder: 'from-amber-100 to-amber-200', tags: ['Street-level', 'High foot traffic'] },
  { id: '3', title: 'Food Truck Fleet Wraps — 5 Vehicles', category: 'Human-Based', city: 'Austin', state: 'TX', price_per_day: 200, rating: 4.8, review_count: 17, image_placeholder: 'from-orange-100 to-orange-200', tags: ['Mobile', 'Event-ready'] },
  { id: '4', title: 'Indoor Digital Screen — Union Square Mall', category: 'Display On-Premise', city: 'San Francisco', state: 'CA', price_per_day: 320, rating: 4.6, review_count: 8, image_placeholder: 'from-blue-100 to-blue-200', tags: ['Indoor', '4K display', 'Loop ads'] },
  { id: '5', title: 'Parking Lot Billboard — 15k Daily Impressions', category: 'Static Billboards', city: 'Chicago', state: 'IL', price_per_day: 380, rating: 4.9, review_count: 31, image_placeholder: 'from-red-100 to-red-200', tags: ['Verified traffic', 'Highway adjacent'] },
  { id: '6', title: 'Boutique Storefront Banner — SoHo Block', category: 'Outdoor Static', city: 'New York', state: 'NY', price_per_day: 150, rating: 4.5, review_count: 14, image_placeholder: 'from-pink-100 to-pink-200', tags: ['Fashion district', 'Pedestrian'] },
  { id: '7', title: 'Bus Stop Shelter — Metro Line 12', category: 'Transit', city: 'Seattle', state: 'WA', price_per_day: 120, rating: 4.7, review_count: 6, image_placeholder: 'from-teal-100 to-teal-200', tags: ['Transit', 'High volume'] },
  { id: '8', title: 'Rooftop LED Screen — Midtown East', category: 'Outdoor Digital', city: 'New York', state: 'NY', price_per_day: 680, rating: 5.0, review_count: 4, image_placeholder: 'from-indigo-100 to-indigo-200', tags: ['Premium', 'Times Square adjacent'] },
  { id: '9', title: 'Community Event Space Wall — East Village', category: 'Experiential', city: 'New York', state: 'NY', price_per_day: 95, rating: 4.4, review_count: 9, image_placeholder: 'from-yellow-100 to-yellow-200', tags: ['Mural-style', 'Cultural'] },
]

const CATEGORIES = [
  'All Types',
  'Digital Billboards',
  'Static Billboards',
  'Transit',
  'Outdoor Static',
  'Outdoor Digital',
  'Display On-Premise',
  'Event-Based',
  'Human-Based',
  'Experiential',
  'Street Furniture',
  'Unique',
]

// ─── Listing Card ──────────────────────────────────────────────────────────────
function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link href={`/marketplace/${listing.id}`} className="block group">
      <div className="bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-all hover:-translate-y-0.5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        {/* Image placeholder */}
        <div className={`h-44 bg-gradient-to-br ${listing.image_placeholder} relative`}>
          <div className="absolute top-3 left-3">
            <span className="bg-white/90 backdrop-blur-sm text-xs px-2.5 py-1 rounded-full font-medium shadow-sm" style={{ color: '#555' }}>
              {listing.category}
            </span>
          </div>
          <div className="absolute bottom-3 right-3">
            <span className="text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm" style={{ backgroundColor: '#e6964d' }}>
              ${listing.price_per_day}/day
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="font-semibold leading-snug mb-2 line-clamp-2 text-sm transition-colors group-hover:text-[#e6964d]" style={{ color: '#2b2b2b' }}>
            {listing.title}
          </h3>

          <div className="flex items-center gap-1.5 text-xs mb-3" style={{ color: '#888' }}>
            <MapPin className="w-3 h-3" />
            {listing.city}, {listing.state}
          </div>

          <div className="flex flex-wrap gap-1.5 mb-4">
            {listing.tags.slice(0, 2).map(tag => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#f4f4f0', color: '#888', border: '1px solid #e0e0d8' }}>
                {tag}
              </span>
            ))}
          </div>

          {/* Rating */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-[#e6964d]" style={{ color: '#e6964d' }} />
              <span className="text-xs font-semibold" style={{ color: '#2b2b2b' }}>{listing.rating}</span>
              <span className="text-xs" style={{ color: '#888' }}>({listing.review_count})</span>
            </div>
            <span className="text-xs font-medium" style={{ color: '#e6964d' }}>View details →</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All Types')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const filtered = useMemo(() => {
    return HOMEPAGE_LISTINGS.filter(l => {
      const matchesSearch =
        !search ||
        l.title.toLowerCase().includes(search.toLowerCase()) ||
        l.city.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = selectedCategory === 'All Types' || l.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [search, selectedCategory])

  return (
    <div style={{ backgroundColor: '#e6e6dd' }}>
      {/* Hero */}
      <section className="pt-16 pb-6 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 leading-[1.1]" style={{ color: '#2b2b2b' }}>
            Advertise on{' '}
            <span style={{ color: '#e6964d' }}>your terms</span>
          </h1>
          <p className="text-base md:text-lg mb-5 max-w-xl mx-auto leading-relaxed" style={{ color: '#555' }}>
            A marketplace for local advertising. Book unique, real-world ad placements in minutes—No haggling, no longterm contracts, no agency middlemen.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              href="/marketplace"
              className="group inline-flex items-center gap-2 font-semibold px-6 py-3 rounded-xl text-sm hover:opacity-90 transition-all hover:scale-105 shadow-lg"
              style={{ backgroundColor: '#e6964d', color: '#fff', boxShadow: '0 4px 16px rgba(230,150,77,0.35)' }}
            >
              Find Ad Space
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/signup?role=host"
              className="inline-flex items-center gap-2 font-semibold px-6 py-3 rounded-xl text-sm hover:opacity-90 transition-all hover:scale-105"
              style={{ backgroundColor: '#fff', color: '#2b2b2b', border: '1px solid #d4d4c9', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
            >
              List Your Space
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-4 px-6" style={{ backgroundColor: '#fff', borderTop: '1px solid #d4d4c9', borderBottom: '1px solid #d4d4c9' }}>
        <div className="max-w-5xl mx-auto flex justify-center gap-12 md:gap-16 text-center">
          {[
            { value: '2,400+', label: 'Active placements' },
            { value: '180+', label: 'Cities covered' },
            { value: '$0', label: 'Listing fee' },
            { value: '48hr', label: 'Avg. booking time' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-xl font-bold" style={{ color: '#e6964d' }}>{stat.value}</div>
              <div className="text-xs" style={{ color: '#888' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Search + Filter */}
      <section className="py-10 px-6" style={{ backgroundColor: '#e6e6dd' }}>
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl p-6 shadow-sm" style={{ border: '1px solid #d4d4c9' }}>
            {/* Search row */}
            <div className="flex flex-col md:flex-row gap-3 mb-4">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#888' }} />
                <input
                  type="text"
                  placeholder="Search by city or location..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none transition-colors"
                  style={{
                    backgroundColor: '#f4f4f0',
                    border: '1px solid #d4d4c9',
                    color: '#2b2b2b',
                  }}
                />
              </div>

              {/* Category dropdown */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-xl px-4 py-3 text-sm focus:outline-none cursor-pointer"
                style={{
                  backgroundColor: '#f4f4f0',
                  border: '1px solid #d4d4c9',
                  color: '#2b2b2b',
                  minWidth: '200px',
                }}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Date row */}
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex gap-3 flex-1">
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#888' }}>Start date (optional)</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#888' }} />
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none"
                      style={{
                        backgroundColor: '#f4f4f0',
                        border: '1px solid #d4d4c9',
                        color: '#2b2b2b',
                      }}
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#888' }}>End date (optional)</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#888' }} />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none"
                      style={{
                        backgroundColor: '#f4f4f0',
                        border: '1px solid #d4d4c9',
                        color: '#2b2b2b',
                      }}
                    />
                  </div>
                </div>
              </div>
              <button
                className="font-semibold px-8 py-3 rounded-xl text-sm flex items-center gap-2 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#e6964d', color: '#fff', boxShadow: '0 2px 8px rgba(230,150,77,0.3)' }}
              >
                <Search className="w-4 h-4" />
                Search
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Placements Grid */}
      <section className="pb-20 px-6" style={{ backgroundColor: '#e6e6dd' }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold" style={{ color: '#2b2b2b' }}>
              {filtered.length > 0
                ? `${filtered.length} placements available`
                : 'No placements found'}
            </h2>
          </div>

          {filtered.length > 0 ? (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
                {filtered.map(listing => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
              <div className="text-center">
                <Link
                  href="/marketplace"
                  className="inline-flex items-center gap-2 font-semibold text-sm hover:opacity-80 transition-opacity"
                  style={{ color: '#e6964d' }}
                >
                  View all placements →
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <div className="text-4xl mb-4">🗺️</div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#555' }}>No listings found</h3>
              <p className="text-sm mb-6" style={{ color: '#888' }}>Try a different search or category</p>
              <button
                onClick={() => { setSearch(''); setSelectedCategory('All Types') }}
                className="text-sm font-medium hover:opacity-80 transition-opacity"
                style={{ color: '#e6964d' }}
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
