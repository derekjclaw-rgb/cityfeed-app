'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { MapPin, Search, Star, ArrowRight, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { MOCK_LISTINGS } from './marketplace/page'
import type { Listing } from './marketplace/page'

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

const CATEGORY_MAP: Record<string, string> = {
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

// ─── Listing Card ──────────────────────────────────────────────────────────────
function ListingCard({ listing }: { listing: Listing }) {
  const firstImage = listing.images?.[0]
  return (
    <Link href={`/marketplace/${listing.id}`} className="block group">
      <div className="bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-all hover:-translate-y-0.5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <div className={`h-44 relative overflow-hidden`}>
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
          <div className="absolute bottom-3 right-3">
            <span className="text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm" style={{ backgroundColor: '#e6964d' }}>
              ${listing.price_per_day}/day
            </span>
          </div>
        </div>
        <div className="p-5">
          <h3 className="font-semibold leading-snug mb-2 line-clamp-2 text-sm transition-colors group-hover:text-[#e6964d]" style={{ color: '#2b2b2b' }}>
            {listing.title}
          </h3>
          <div className="flex items-center gap-1.5 text-xs mb-3" style={{ color: '#888' }}>
            <MapPin className="w-3 h-3" />
            {listing.city}, {listing.state}
          </div>
          {listing.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {listing.tags.slice(0, 2).map(tag => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#f4f4f0', color: '#888', border: '1px solid #e0e0d8' }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-[#e6964d]" style={{ color: '#e6964d' }} />
              <span className="text-xs font-semibold" style={{ color: '#2b2b2b' }}>{listing.rating > 0 ? listing.rating : 'New'}</span>
              {listing.review_count > 0 && <span className="text-xs" style={{ color: '#888' }}>({listing.review_count})</span>}
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
  const [featuredListings, setFeaturedListings] = useState<Listing[]>(MOCK_LISTINGS.slice(0, 6))

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('listings')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          setFeaturedListings(
            data.map((row, i) => ({
              id: row.id,
              title: row.title,
              category: CATEGORY_MAP[row.category] ?? row.category,
              city: row.city ?? '',
              state: row.state ?? '',
              price_per_day: row.price_per_day ?? 0,
              rating: 0,
              review_count: 0,
              image_placeholder: GRADIENT_POOL[i % GRADIENT_POOL.length],
              images: row.images ?? [],
              tags: [],
              lat: row.lat ?? 39.8283,
              lng: row.lng ?? -98.5795,
              daily_impressions: row.daily_impressions ?? 0,
            }))
          )
        }
        // else: keep mock data
      })
  }, [])

  const filtered = useMemo(() => {
    return featuredListings.filter(l => {
      const matchesSearch = !search || l.title.toLowerCase().includes(search.toLowerCase()) || l.city.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = selectedCategory === 'All Types' || l.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [featuredListings, search, selectedCategory])

  return (
    <div style={{ backgroundColor: '#e6e6dd' }}>
      {/* Hero */}
      <section className="pt-28 pb-6 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-3 leading-[1.1]" style={{ color: '#2b2b2b' }}>
            Advertise on{' '}
            <span style={{ color: '#e6964d' }}>your terms</span>
          </h1>
          <p className="text-base md:text-lg mb-6 max-w-2xl mx-auto leading-relaxed" style={{ color: '#555' }}>
            A marketplace for local advertising. Book unique, real-world ad placements in minutes—No haggling, no long-term contracts, no agency middlemen.
          </p>
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
      <section className="py-3 px-4 sm:px-6" style={{ backgroundColor: '#fff', borderTop: '1px solid #d4d4c9', borderBottom: '1px solid #d4d4c9' }}>
        <div className="max-w-5xl mx-auto grid grid-cols-4 gap-2 sm:gap-16 text-center">
          {[
            { value: '2,400+', label: 'Active placements' },
            { value: '180+', label: 'Cities covered' },
            { value: '$0', label: 'Listing fee' },
            { value: '48hr', label: 'Avg. booking time' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-base sm:text-xl font-bold" style={{ color: '#e6964d' }}>{stat.value}</div>
              <div className="text-[10px] sm:text-xs" style={{ color: '#888' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Search + Filter */}
      <section className="py-6 sm:py-10 px-4 sm:px-6" style={{ backgroundColor: '#e6e6dd' }}>
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm" style={{ border: '1px solid #d4d4c9' }}>
            <div className="flex flex-col md:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#888' }} />
                <input
                  type="text"
                  placeholder="Search by city or location..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none"
                  style={{ backgroundColor: '#f4f4f0', border: '1px solid #d4d4c9', color: '#2b2b2b' }}
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-xl px-4 py-3 text-sm focus:outline-none cursor-pointer"
                style={{ backgroundColor: '#f4f4f0', border: '1px solid #d4d4c9', color: '#2b2b2b', minWidth: 0 }}
              >
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#888' }}>Start date (optional)</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#888' }} />
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none" style={{ backgroundColor: '#f4f4f0', border: '1px solid #d4d4c9', color: '#2b2b2b' }} />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#888' }}>End date (optional)</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#888' }} />
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none" style={{ backgroundColor: '#f4f4f0', border: '1px solid #d4d4c9', color: '#2b2b2b' }} />
                  </div>
                </div>
              </div>
              <Link
                href={`/marketplace?search=${encodeURIComponent(search)}&category=${encodeURIComponent(selectedCategory)}`}
                className="font-semibold px-8 py-3 rounded-xl text-sm flex items-center justify-center gap-2 hover:opacity-90 w-full sm:w-auto"
                style={{ backgroundColor: '#e6964d', color: '#fff', boxShadow: '0 2px 8px rgba(230,150,77,0.3)' }}
              >
                <Search className="w-4 h-4" />
                Search
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Placements Grid */}
      <section className="pb-20 px-4 sm:px-6" style={{ backgroundColor: '#e6e6dd' }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold" style={{ color: '#2b2b2b' }}>
              {filtered.length > 0 ? `${filtered.length} placements available` : 'No placements found'}
            </h2>
          </div>
          {filtered.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
                {filtered.map(listing => <ListingCard key={listing.id} listing={listing} />)}
              </div>
              <div className="text-center">
                <Link href="/marketplace" className="inline-flex items-center gap-2 font-semibold text-sm hover:opacity-80" style={{ color: '#e6964d' }}>
                  View all placements →
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <div className="text-4xl mb-4">🗺️</div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#555' }}>No listings found</h3>
              <p className="text-sm mb-6" style={{ color: '#888' }}>Try a different search or category</p>
              <button onClick={() => { setSearch(''); setSelectedCategory('All Types') }} className="text-sm font-medium" style={{ color: '#e6964d' }}>
                Clear filters
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
