'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { MapPin, Search, Star, ArrowRight, LayoutGrid, Map, Globe, Zap, Tag, ShieldCheck, Home } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { MOCK_LISTINGS } from './marketplace/page'
import type { Listing } from './marketplace/page'
import DateRangePicker from '@/components/DateRangePicker'

const CATEGORIES = [
  'All Types',
  'Digital Billboard',
  'Static Billboard',
  'Transit',
  'Outdoor Static',
  'Outdoor Digital',
  'Display On-Premise',
  'Event-Based',
  'Human-Based',
  'Experiential',
  'Street Furniture',
  'Unique',
  'Other',
]

const CATEGORY_MAP: Record<string, string> = {
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

// ─── Listing Card ──────────────────────────────────────────────────────────────
function ListingCard({ listing }: { listing: Listing }) {
  const firstImage = listing.images?.[0]
  return (
    <Link href={`/marketplace/${listing.id}`} className="block group">
      <div
        className="bg-white overflow-hidden transition-all duration-300 hover:-translate-y-[3px]"
        style={{
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-lg)')}
        onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-sm)')}
      >
        {/* Image area */}
        <div className="h-[200px] relative overflow-hidden">
          {firstImage ? (
            <img src={firstImage} alt={listing.title} className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${listing.image_placeholder}`} />
          )}
          {/* Category badge — top-left */}
          <span
            className="absolute top-3.5 left-3.5 text-xs font-semibold px-3.5 py-1"
            style={{
              borderRadius: 'var(--radius-pill)',
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(8px)',
              color: '#555',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {listing.category}
          </span>
          {/* Price badge — bottom-right */}
          <span
            className="absolute bottom-3.5 right-3.5 text-xs font-bold px-3.5 py-1"
            style={{
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--gold)',
              color: 'var(--charcoal)',
              boxShadow: '0 2px 8px rgba(222,187,115,0.4)',
            }}
          >
            ${listing.price_per_day}/day
          </span>
        </div>

        {/* Card body */}
        <div className="px-[22px] pt-5 pb-[22px]">
          <h3
            className="text-base font-bold leading-snug mb-2 line-clamp-2 transition-colors group-hover:text-[var(--mint-dark)]"
            style={{ color: 'var(--charcoal)', letterSpacing: '-0.2px' }}
          >
            {listing.title}
          </h3>
          <div className="flex items-center gap-1.5 text-[13px] mb-3.5" style={{ color: 'var(--text-secondary)' }}>
            <MapPin className="w-3.5 h-3.5 opacity-60" />
            {listing.city}, {listing.state}
          </div>
          {/* Footer */}
          <div
            className="flex items-center justify-between pt-3.5"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 fill-[var(--gold)]" style={{ color: 'var(--gold)' }} />
              <span className="text-[13px] font-bold" style={{ color: 'var(--charcoal)' }}>
                {listing.rating > 0 ? listing.rating : 'New'}
              </span>
              {listing.review_count > 0 && (
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  ({listing.review_count})
                </span>
              )}
            </div>
            <span
              className="text-[13px] font-semibold flex items-center gap-1 transition-opacity hover:opacity-70"
              style={{ color: 'var(--mint-dark)' }}
            >
              View details
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

// ─── Home Map ──────────────────────────────────────────────────────────────────
function HomeMap({ listings }: { listings: Listing[] }) {
  const mapContainer = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!mapContainer.current || listings.length === 0) return
    let map: any
    import('mapbox-gl').then((mb) => {
      const mapboxgl = (mb as any).default
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''
      const center: [number, number] = listings[0]?.lat && listings[0]?.lng
        ? [listings[0].lng, listings[0].lat]
        : [-115.14, 36.17]
      map = new mapboxgl.Map({
        container: mapContainer.current!,
        style: 'mapbox://styles/mapbox/light-v11',
        center,
        zoom: 11,
      })
      function addMarkers() {
        listings.forEach((l) => {
          if (l.lat == null || l.lng == null) return
          const el = document.createElement('div')
          el.style.cursor = 'pointer'
          el.innerHTML = `<div style="background:#7ecfc0;color:#fff;font-size:11px;font-weight:700;padding:4px 8px;border-radius:20px;white-space:nowrap;cursor:pointer;box-shadow:0 2px 8px rgba(126,207,192,0.5);border:2px solid white;font-family:system-ui,sans-serif;">$${l.price_per_day}</div>`
          el.addEventListener('click', () => window.location.href = `/marketplace/${l.id}`)
          new mapboxgl.Marker({ element: el }).setLngLat([l.lng, l.lat]).addTo(map)
        })
      }
      map.on('load', addMarkers)
      map.on('style.load', addMarkers)
      setTimeout(addMarkers, 2000)
    })
    return () => { map?.remove() }
  }, [listings])
  return (
    <div className="lg:w-2/3 h-[400px] lg:h-[600px] rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  )
}

// ─── Stats Data ────────────────────────────────────────────────────────────────
const STATS = [
  {
    icon: Globe,
    value: 'Real World',
    label: 'Not another digital ad',
    bgClass: 'bg-[var(--mint-light)]',
    iconColor: 'var(--mint-dark)',
  },
  {
    icon: Zap,
    value: 'Book in Minutes',
    label: 'No contracts, no calls',
    bgClass: 'bg-[var(--gold-light)]',
    iconColor: 'var(--gold-dark)',
  },
  {
    icon: Tag,
    value: '$0 to List',
    label: 'Free for space owners',
    bgClass: 'bg-[#e8f5ec]',
    iconColor: '#16a34a',
  },
  {
    icon: ShieldCheck,
    value: 'Escrow Protected',
    label: 'Pay only for results',
    bgClass: 'bg-[var(--light-gray)]',
    iconColor: 'var(--text-secondary)',
  },
]

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All Types')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const showMockData = process.env.NEXT_PUBLIC_SHOW_MOCK_DATA === 'true'
  const [featuredListings, setFeaturedListings] = useState<Listing[]>(showMockData ? MOCK_LISTINGS.slice(0, 6) : [])
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid')
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    // Check if user is logged in
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setIsLoggedIn(true)
    })
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
        // else: keep mock data only if explicitly enabled
        else if (!showMockData) {
          setFeaturedListings([])
        }
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
    <div style={{ backgroundColor: 'var(--cream)' }}>

      {/* ═══════════════════════════════════════
          HERO — Dark charcoal with radial accents
          ═══════════════════════════════════════ */}
      <section
        className="relative overflow-hidden pt-[120px] pb-14 px-6"
        style={{ backgroundColor: 'var(--charcoal)' }}
      >
        {/* Radial gradient accents */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '-40%',
            right: '-15%',
            width: 700,
            height: 700,
            background: 'radial-gradient(circle, rgba(126,207,192,0.12) 0%, transparent 65%)',
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: '-30%',
            left: '10%',
            width: 500,
            height: 500,
            background: 'radial-gradient(circle, rgba(222,187,115,0.08) 0%, transparent 65%)',
          }}
        />

        <div className="relative z-10 max-w-[900px] mx-auto text-center">
          {/* Eyebrow pill */}
          <div
            className="inline-flex items-center gap-2 px-5 py-2 mb-8 text-[13px] font-medium backdrop-blur-sm"
            style={{
              borderRadius: 'var(--radius-pill)',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse-glow"
              style={{ backgroundColor: 'var(--mint)' }}
            />
            Placements available nationwide
          </div>

          {/* Headline */}
          <h1
            className="text-4xl sm:text-5xl md:text-[56px] font-extrabold leading-[1.08] mb-5"
            style={{ color: 'var(--white)', letterSpacing: '-2px' }}
          >
            Advertise on<br />
            <span style={{ color: 'var(--gold)' }}>your terms</span>
          </h1>

          {/* Subtitle */}
          <p
            className="text-base sm:text-lg max-w-[560px] mx-auto mb-10 leading-relaxed font-normal"
            style={{ color: 'rgba(255,255,255,0.55)' }}
          >
            A marketplace for local, real-world advertising. Book unique placements
            in minutes — no contracts, no calls, no agency middlemen.
          </p>

          {/* CTA Buttons */}
          <div className="flex gap-3.5 justify-center flex-wrap">
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 px-8 py-3.5 text-[15px] font-bold transition-all hover:-translate-y-0.5"
              style={{
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--gold)',
                color: 'var(--charcoal)',
                boxShadow: '0 4px 20px rgba(222,187,115,0.4)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 8px 30px rgba(222,187,115,0.5)')}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(222,187,115,0.4)')}
            >
              Find Ad Space
              <ArrowRight className="w-[18px] h-[18px]" />
            </Link>
            <Link
              href={isLoggedIn ? '/dashboard/create-listing' : '/signup?role=host'}
              className="inline-flex items-center gap-2 px-8 py-3.5 text-[15px] font-semibold transition-all hover:bg-white/5"
              style={{
                borderRadius: 'var(--radius-pill)',
                color: 'var(--white)',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.25)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)')}
            >
              <Home className="w-[18px] h-[18px]" />
              List Your Space
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          STATS BAR — White bg, 4 value props
          ═══════════════════════════════════════ */}
      <div
        className="px-6"
        style={{ backgroundColor: 'var(--white)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="max-w-[1000px] mx-auto grid grid-cols-2 sm:grid-cols-4">
          {STATS.map((stat, i) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="relative py-7 px-4 text-center">
                {/* Divider between items */}
                {i < STATS.length - 1 && (
                  <div
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-10 hidden sm:block"
                    style={{ backgroundColor: 'var(--border)' }}
                  />
                )}
                {/* Icon box */}
                <div
                  className={`w-9 h-9 rounded-[10px] flex items-center justify-center mx-auto mb-2.5 ${stat.bgClass}`}
                >
                  <Icon className="w-[18px] h-[18px]" style={{ color: stat.iconColor }} />
                </div>
                <div
                  className="text-lg font-extrabold mb-0.5"
                  style={{ color: 'var(--charcoal)', letterSpacing: '-0.5px' }}
                >
                  {stat.value}
                </div>
                <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {stat.label}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════
          SEARCH SECTION — Cream bg, white card
          ═══════════════════════════════════════ */}
      <section className="pt-12 pb-5 px-6" style={{ backgroundColor: 'var(--cream)' }}>
        <div
          className="max-w-[900px] mx-auto bg-white px-8 py-7 relative z-10"
          style={{
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {/* Main search row */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            {/* Search input */}
            <div className="relative flex-1">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px]"
                style={{ color: 'var(--text-secondary)' }}
              />
              <input
                type="text"
                placeholder="Search by city, location, or keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full py-3.5 pl-[46px] pr-4 text-sm focus:outline-none transition-colors"
                style={{
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--light-gray)',
                  color: 'var(--charcoal)',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--mint)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
            </div>
            {/* Category select */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="py-3.5 px-4 text-sm focus:outline-none cursor-pointer min-w-[180px]"
              style={{
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--light-gray)',
                color: 'var(--charcoal)',
              }}
            >
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            {/* Search button */}
            <Link
              href={`/marketplace?search=${encodeURIComponent(search)}&category=${encodeURIComponent(selectedCategory)}`}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-bold whitespace-nowrap transition-all hover:-translate-y-0.5"
              style={{
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--gold)',
                color: 'var(--charcoal)',
                boxShadow: '0 2px 8px rgba(222,187,115,0.3)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(222,187,115,0.45)')}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(222,187,115,0.3)')}
            >
              <Search className="w-4 h-4" />
              Search
            </Link>
          </div>

          {/* Date range picker */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Dates (optional)
            </label>
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onChange={(start, end) => { setStartDate(start); setEndDate(end) }}
              placeholder="Pick start & end date"
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          FEATURED LISTINGS — Cream bg
          ═══════════════════════════════════════ */}
      <section className="pt-8 pb-20 px-6" style={{ backgroundColor: 'var(--cream)' }}>
        <div className="max-w-[1120px] mx-auto">
          {/* Section header */}
          <div className="flex items-baseline justify-between mb-7 flex-wrap gap-2">
            <h2
              className="text-2xl font-bold"
              style={{ color: 'var(--charcoal)', letterSpacing: '-0.3px' }}
            >
              {filtered.length > 0
                ? `${filtered.length} placements available`
                : 'No placements found'}
            </h2>
            <div className="flex items-center gap-4">
              {/* Grid / Map toggle */}
              <div
                className="flex items-center gap-1 rounded-xl p-1"
                style={{ backgroundColor: 'var(--white)', border: '1px solid var(--border)' }}
              >
                <button
                  onClick={() => setViewMode('grid')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    backgroundColor: viewMode === 'grid' ? 'var(--mint)' : 'transparent',
                    color: viewMode === 'grid' ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  List
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    backgroundColor: viewMode === 'map' ? 'var(--mint)' : 'transparent',
                    color: viewMode === 'map' ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  <Map className="w-3.5 h-3.5" />
                  Map
                </button>
              </div>
              {/* View all link */}
              <Link
                href="/marketplace"
                className="text-sm font-medium flex items-center gap-1 transition-opacity hover:opacity-70"
                style={{ color: 'var(--mint-dark)' }}
              >
                View all
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Listings */}
          {filtered.length > 0 ? (
            <>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[22px] mb-8">
                  {filtered.map(listing => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col lg:flex-row gap-4 mb-8">
                  {/* Listing sidebar */}
                  <div className="lg:w-1/3 space-y-3 max-h-[600px] overflow-y-auto pr-2">
                    {filtered.map(listing => (
                      <Link key={listing.id} href={`/marketplace/${listing.id}`} className="block group">
                        <div
                          className="flex gap-3 p-3 rounded-xl bg-white hover:shadow-md transition-all"
                          style={{ border: '1px solid var(--border)' }}
                        >
                          <div className="w-20 h-20 rounded-lg flex-shrink-0 overflow-hidden">
                            {listing.images?.[0] ? (
                              <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className={`w-full h-full bg-gradient-to-br ${listing.image_placeholder}`} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div
                              className="text-sm font-semibold truncate group-hover:text-[var(--mint)]"
                              style={{ color: 'var(--charcoal)' }}
                            >
                              {listing.title}
                            </div>
                            <div
                              className="text-xs flex items-center gap-1 mt-1"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              <MapPin className="w-3 h-3" />{listing.city}, {listing.state}
                            </div>
                            <div className="text-sm font-bold mt-1" style={{ color: 'var(--gold)' }}>
                              ${listing.price_per_day}/day
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                  {/* Map */}
                  <HomeMap listings={filtered} />
                </div>
              )}
              <div className="text-center">
                <Link
                  href="/marketplace"
                  className="inline-flex items-center gap-2 font-semibold text-sm hover:opacity-80"
                  style={{ color: 'var(--mint)' }}
                >
                  View all placements →
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <div className="text-4xl mb-4">🗺️</div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#555' }}>
                No listings found
              </h3>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                Try a different search or category
              </p>
              <button
                onClick={() => { setSearch(''); setSelectedCategory('All Types') }}
                className="text-sm font-medium"
                style={{ color: 'var(--mint)' }}
                type="button"
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
