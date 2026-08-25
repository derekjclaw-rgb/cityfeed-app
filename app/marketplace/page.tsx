'use client'

/**
 * Marketplace page — browse listing cards with search + category filter
 * Phase 3: Real Supabase data with mock fallback
 * Design: marketplace-v2 (clean toolbar, category pills with icons, enhanced cards)
 */
import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import {
  MapPin, Search, Star, X, LayoutGrid, Map, ArrowUpDown, SlidersHorizontal,
  Layers, Monitor, Image, Bus, TreePine, Tv, Store, Calendar,
  Users, Sparkles, MonitorSmartphone, Frame, Lamp, MoreHorizontal,
  ArrowRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import FavoriteButton from '@/components/FavoriteButton'
import { SHOW_MOCK_DATA } from '@/lib/constants'
import { CATEGORY_LABELS, getCategoryLabel, CATEGORY_OPTIONS } from '@/lib/design'

// We alias Star as StarIcon to use as a component in the category list without conflict
const StarIcon = Star

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
// Category icon mapping for the pill strip
const CATEGORY_ICONS: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  'all': Layers,
  'Digital Billboard': Monitor,
  'Static Billboard': Image,
  'Transit': Bus,
  'Outdoor Static': TreePine,
  'Outdoor Digital': Tv,
  'Display On-Premise': Store,
  'Event-Based': Calendar,
  'Human-Based': Users,
  'Experiential': Sparkles,
  'Indoor Digital': MonitorSmartphone,
  'Indoor Static': Frame,
  'Street Furniture': Lamp,
  'Unique': StarIcon,
  'Billboard': Image,
  'Storefront': Store,
  'Window Display': Frame,
  'Vehicle Wrap': Bus,
  'Other': MoreHorizontal,
}

// Derive marketplace filter from shared CATEGORY_OPTIONS (all 18 active categories)
const CATEGORIES = [
  { value: 'all', label: 'All types' },
  ...CATEGORY_OPTIONS.map(c => ({ value: c.label, label: c.label })),
]

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
    category: getCategoryLabel(row.category),
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

// ─── Listing Card (v2 design) ──────────────────────────────────────────────────
// ─── Card Carousel (Airbnb pattern) ────────────────────────────────────────────
// Native scroll-snap carousel — real touch swipe with momentum (no JS touch math,
// which fought the Link wrapper + page scroll on iOS and never felt swipeable).
function CardCarousel({ images, placeholder, height }: { images: string[]; placeholder: string; height: string }) {
  const [idx, setIdx] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const count = images.length

  function goTo(e: React.MouseEvent, i: number) {
    e.preventDefault(); e.stopPropagation()
    const el = scrollRef.current
    if (!el) return
    const clamped = Math.max(0, Math.min(count - 1, i))
    el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' })
  }

  function onScroll() {
    const el = scrollRef.current
    if (!el) return
    const i = Math.max(0, Math.min(count - 1, Math.round(el.scrollLeft / el.clientWidth)))
    if (i !== idx) setIdx(i)
  }

  if (count === 0) return <div className={`w-full bg-gradient-to-br ${placeholder}`} style={{ height }} />

  return (
    <div className="relative w-full overflow-hidden group/carousel" style={{ height }}>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex w-full h-full overflow-x-auto snap-x snap-mandatory no-scrollbar"
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y', scrollbarWidth: 'none' }}
      >
        {images.map((src, i) => (
          <img key={i} src={src} alt="" className="w-full h-full object-cover flex-shrink-0 snap-center" loading={i === 0 ? 'eager' : 'lazy'} draggable={false} />
        ))}
      </div>
      {count > 1 && (
        <>
          <button type="button" onClick={e => goTo(e, idx - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity hidden sm:flex" style={{ backgroundColor: 'rgba(255,255,255,0.9)', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} aria-label="Previous photo">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2b2b2b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <button type="button" onClick={e => goTo(e, idx + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity hidden sm:flex" style={{ backgroundColor: 'rgba(255,255,255,0.9)', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} aria-label="Next photo">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2b2b2b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </>
      )}
      {count > 1 && count <= 8 && (
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, i) => (
            <button key={i} type="button" onClick={e => goTo(e, i)} className="p-1 -m-0.5 border-none" aria-label={`Photo ${i + 1}`}>
              <span className="block rounded-full transition-all" style={{ width: 6, height: 6, backgroundColor: i === idx ? '#fff' : 'rgba(255,255,255,0.5)', boxShadow: '0 0 2px rgba(0,0,0,0.3)' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Listing Card (v2 design) ──────────────────────────────────────────────────
function ListingCard({ listing, compact = false }: { listing: Listing; compact?: boolean }) {
  const images = listing.images ?? []

  return (
    <Link href={`/marketplace/${listing.id}`} className="block">
      <div
        className={`group overflow-hidden transition-all duration-300 ${compact ? '' : 'hover:-translate-y-[3px]'}`}
        style={{
          backgroundColor: 'var(--white, #ffffff)',
          borderRadius: 'var(--radius-md, 16px)',
          border: '1px solid var(--border, #e0e0d8)',
          boxShadow: compact ? 'none' : undefined,
        }}
        onMouseEnter={e => { if (!compact) (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-lg, 0 12px 40px rgba(43,43,43,0.08), 0 4px 12px rgba(43,43,43,0.04))' }}
        onMouseLeave={e => { if (!compact) (e.currentTarget as HTMLDivElement).style.boxShadow = '' }}
      >
        {/* Image area with carousel */}
        <div className={`relative overflow-hidden ${compact ? 'h-32' : 'h-[150px] sm:h-[200px]'}`}>
          <CardCarousel images={images} placeholder={listing.image_placeholder} height={compact ? '128px' : '100%'} />
          {/* Category badge — top left */}
          <span
            className="absolute top-2 left-2 sm:top-3.5 sm:left-3.5 text-[10px] sm:text-xs font-semibold px-2.5 sm:px-3.5 py-1 rounded-full shadow-sm"
            style={{
              backgroundColor: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              color: '#555',
            }}
          >
            {listing.category}
          </span>
          {/* Favorite button — top right (only for real listings) */}
          {!/^\d+$/.test(listing.id) && (
            <div
              className="absolute top-3.5 right-3.5 w-[34px] h-[34px] rounded-full flex items-center justify-center shadow-sm transition-transform hover:scale-110"
              style={{
                backgroundColor: 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
              }}
            >
              <FavoriteButton listingId={listing.id} size={16} />
            </div>
          )}
          {/* Price badge — bottom right */}
          <span
            className="absolute bottom-2 right-2 sm:bottom-3.5 sm:right-3.5 text-[10px] sm:text-xs font-bold px-2.5 sm:px-3.5 py-1 rounded-full"
            style={{
              backgroundColor: 'var(--gold, #debb73)',
              color: 'var(--charcoal, #2b2b2b)',
              boxShadow: '0 2px 8px rgba(222,187,115,0.4)',
            }}
          >
            ${listing.price_per_day}/day
          </span>
        </div>

        {/* Card body */}
        <div className={compact ? 'p-3' : 'p-3.5 sm:px-[22px] sm:pt-5 sm:pb-[22px]'}>
          <h3
            className={`font-bold leading-snug line-clamp-2 transition-colors ${compact ? 'text-xs mb-2' : 'text-sm sm:text-base mb-2'}`}
            style={{ color: 'var(--charcoal, #2b2b2b)', letterSpacing: '-0.2px' }}
          >
            {listing.title}
          </h3>

          <div className="flex items-center gap-1.5 text-[13px] mb-3.5" style={{ color: 'var(--text-secondary, #888888)' }}>
            <MapPin className="w-3.5 h-3.5 opacity-60" />
            {listing.city}, {listing.state}
          </div>

          {/* Footer — rating + CTA */}
          {!compact && (
            <div
              className="flex items-center justify-between pt-3.5"
              style={{ borderTop: '1px solid var(--border, #e0e0d8)' }}
            >
              <div className="flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5" style={{ color: 'var(--gold, #debb73)', fill: 'var(--gold, #debb73)' }} />
                <span className="text-[13px] font-bold" style={{ color: 'var(--charcoal, #2b2b2b)' }}>
                  {listing.rating > 0 ? listing.rating : 'New'}
                </span>
                {listing.review_count > 0 && (
                  <span className="text-xs" style={{ color: 'var(--text-secondary, #888888)' }}>
                    ({listing.review_count})
                  </span>
                )}
              </div>
              <span
                className="text-[13px] font-semibold flex items-center gap-1 transition-opacity hover:opacity-70"
                style={{ color: 'var(--mint-dark, #5bb8a8)' }}
              >
                View details <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          )}

          {/* Compact mode: just rating */}
          {compact && (
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5" style={{ color: 'var(--gold, #debb73)', fill: 'var(--gold, #debb73)' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--charcoal, #2b2b2b)' }}>
                {listing.rating > 0 ? listing.rating : 'New'}
              </span>
              {listing.review_count > 0 && (
                <span className="text-xs" style={{ color: 'var(--text-secondary, #888888)' }}>({listing.review_count})</span>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Title color change on hover via group */}
      <style jsx>{`
        .group:hover h3 { color: var(--mint-dark, #5bb8a8) !important; }
      `}</style>
    </Link>
  )
}

// ─── Map View ──────────────────────────────────────────────────────────────────
function MapView({ listings, visible = true, mobileTile = false, selectedId = null, flyTo = null, onPinClick, onViewportIds }: {
  listings: Listing[]
  visible?: boolean
  mobileTile?: boolean
  selectedId?: string | null
  flyTo?: [number, number] | null
  onPinClick?: (l: Listing | null) => void
  onViewportIds?: (ids: string[]) => void
}) {
  const mapContainer = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null)
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null)
  const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(null)
  // Track whether a marker was just clicked so map.on('click') doesn't immediately dismiss
  const markerClickedRef = useRef(false)
  // Refs so marker handlers (bound once per listings change) always see fresh props
  const markerElsRef = useRef<Record<string, HTMLElement>>({})
  const onPinClickRef = useRef(onPinClick); onPinClickRef.current = onPinClick
  const onViewportIdsRef = useRef(onViewportIds); onViewportIdsRef.current = onViewportIds
  const mobileTileRef = useRef(mobileTile); mobileTileRef.current = mobileTile
  const mobileSelectedRef = useRef<string | null>(null)

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
        style: 'mapbox://styles/mapbox/streets-v12',
        center: defaultCenter,
        zoom: defaultZoom,
        // Smallest legally-permitted branding: attribution collapses to a ⓘ,
        // logo stays (required by Mapbox ToS on standard plans)
        attributionControl: false,
      })
      map.addControl(new mapboxgl.default.AttributionControl({ compact: true }), 'bottom-right')
      mapRef.current = map
      let markersAdded = false
      function addMarkers() {
        if (markersAdded) return
        markersAdded = true
        markerElsRef.current = {}
        listings.forEach((listing) => {
          if (listing.lat == null || listing.lng == null) return
          const el = document.createElement('div')
          el.style.cursor = 'pointer'
          el.innerHTML = `<div style="background:#7ecfc0;color:#fff;font-size:12px;font-weight:700;padding:5px 10px;border-radius:20px;white-space:nowrap;cursor:pointer;box-shadow:0 2px 8px rgba(126,207,192,0.5);border:2px solid white;font-family:system-ui,sans-serif;z-index:10;transition:transform 0.15s ease, background 0.15s ease;">$${listing.price_per_day}</div>`
          markerElsRef.current[listing.id] = el
          const captured = listing
          el.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()
            markerClickedRef.current = true
            setTimeout(() => { markerClickedRef.current = false }, 100)
            if (mobileTileRef.current) {
              // Mobile: parent renders a docked tile — toggle selection via callback
              const next = mobileSelectedRef.current === captured.id ? null : captured
              mobileSelectedRef.current = next?.id ?? null
              onPinClickRef.current?.(next)
              return
            }
            setSelectedListing((prev) => {
              if (prev?.id === captured.id) {
                setPopupPos(null)
                return null
              }
              // Project lng/lat to screen pixel position
              if (map && captured.lat != null && captured.lng != null) {
                const point = map.project([captured.lng, captured.lat])
                const mapRect = mapContainer.current?.getBoundingClientRect()
                if (mapRect) {
                  setPopupPos({
                    x: mapRect.left + point.x,
                    y: mapRect.top + point.y,
                  })
                }
              }
              return captured
            })
          })
          new MapGL.Marker({ element: el }).setLngLat([listing.lng, listing.lat]).addTo(map)
        })
      }
      // Dismiss popup/tile when clicking empty map area (but NOT when clicking a marker)
      map.on('click', () => {
        if (markerClickedRef.current) return
        if (mobileTileRef.current) {
          mobileSelectedRef.current = null
          onPinClickRef.current?.(null)
          return
        }
        setSelectedListing(null)
        setPopupPos(null)
      })
      // Keep popup anchored to pin on map move/zoom
      const updatePopupPosition = () => {
        setSelectedListing((current) => {
          if (current && current.lat != null && current.lng != null) {
            const point = map.project([current.lng, current.lat])
            const mapRect = mapContainer.current?.getBoundingClientRect()
            if (mapRect) {
              setPopupPos({
                x: mapRect.left + point.x,
                y: mapRect.top + point.y,
              })
            }
          }
          return current
        })
      }
      // Viewport-aware results — the map reads as a live query, not a picture
      const reportViewport = () => {
        try {
          const b = map.getBounds()
          const ids = listings
            .filter(l => l.lat != null && l.lng != null && b.contains([l.lng, l.lat]))
            .map(l => l.id)
          onViewportIdsRef.current?.(ids)
        } catch { /* map not ready yet */ }
      }
      map.on('move', updatePopupPosition)
      map.on('zoom', updatePopupPosition)
      map.on('moveend', reportViewport)
      map.on('load', () => { addMarkers(); reportViewport() })
      map.on('style.load', addMarkers)
      setTimeout(addMarkers, 2000)
    })
    return () => { map?.remove() }
  }, [listings])

  // Gold highlight for the selected pin (mobile tile mode)
  useEffect(() => {
    mobileSelectedRef.current = selectedId
    Object.entries(markerElsRef.current).forEach(([id, el]) => {
      const pill = el.firstElementChild as HTMLElement | null
      if (!pill) return
      const sel = id === selectedId
      pill.style.background = sel ? '#debb73' : '#7ecfc0'
      pill.style.boxShadow = sel ? '0 3px 12px rgba(222,187,115,0.6)' : '0 2px 8px rgba(126,207,192,0.5)'
      pill.style.transform = sel ? 'scale(1.15)' : 'scale(1)'
    })
  }, [selectedId])

  // Map stays mounted between grid/map toggles (kept warm) — fix canvas size on show
  useEffect(() => {
    if (visible && mapRef.current) {
      const t = setTimeout(() => mapRef.current?.resize(), 60)
      return () => clearTimeout(t)
    }
  }, [visible])

  // Fly to user location (Airbnb-style "near me" entry)
  useEffect(() => {
    if (flyTo && mapRef.current) {
      mapRef.current.flyTo({ center: flyTo, zoom: 11.5, essential: true })
    }
  }, [flyTo])

  return (
    <div className="relative isolate w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      {!mobileTile && selectedListing && popupPos && typeof document !== 'undefined' && createPortal(
        <div className="w-72 rounded-2xl shadow-xl overflow-hidden" style={{
          position: 'fixed',
          left: popupPos.x,
          top: popupPos.y,
          transform: 'translate(-50%, -110%)',
          backgroundColor: '#fff',
          border: '1px solid #e0e0d8',
          zIndex: 9999,
        }}>
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
  const [viewportIds, setViewportIds] = useState<string[] | null>(null)
  const [mapSelected, setMapSelected] = useState<Listing | null>(null)
  const [sheetSnap, setSheetSnap] = useState<'collapsed' | 'half' | 'full'>('collapsed')
  const [sheetDragH, setSheetDragH] = useState<number | null>(null)
  const [mapAreaH, setMapAreaH] = useState(0)
  const [mapFlyTo, setMapFlyTo] = useState<[number, number] | null>(null)
  const [isMobileVp, setIsMobileVp] = useState(false)
  const sheetDragStart = useRef<{ y: number; h: number } | null>(null)
  const mapAreaRef = useRef<HTMLDivElement>(null)
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
        const dbCategory = Object.entries(CATEGORY_LABELS).find(([, v]) => v === selectedCategory)?.[0]
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

  // Viewport tracking — mobile gets the docked tile, desktop keeps the anchored popup
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const update = () => setIsMobileVp(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // Measure the map area — sheet snap points (collapsed / half / full) derive from it
  useEffect(() => {
    const measure = () => setMapAreaH(mapAreaRef.current?.getBoundingClientRect().height ?? 0)
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [viewMode])

  // Deep link: /marketplace?view=map (homepage Map button lands straight in map mode)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('view') === 'map') setViewMode('map')
  }, [])

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

  // Map-aware results — only listings inside the current map viewport
  const mapVisible = useMemo(
    () => (viewportIds ? filtered.filter(l => viewportIds.includes(l.id)) : filtered),
    [filtered, viewportIds]
  )

  // Suppress unused var warning — usingRealData can be used for UI hints later
  void usingRealData

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--cream, #f0f0ec)' }}>
      <div className="max-w-[1200px] mx-auto px-6">

        {/* ── Page Header ── */}
        <div className="pt-24">
          <h1
            className="text-[32px] font-extrabold mb-1.5"
            style={{ color: 'var(--charcoal, #2b2b2b)', letterSpacing: '-0.8px' }}
          >
            Browse ad placements
          </h1>
          <p className="text-[15px]" style={{ color: 'var(--text-secondary, #888888)' }}>
            {isLoading ? 'Loading...' : `${filtered.length} listing${filtered.length !== 1 ? 's' : ''} across the US`}
          </p>
        </div>

        {/* ── Toolbar: Search + Sort + View Toggle ── */}
        <div className="flex gap-3 items-stretch flex-wrap mt-6">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: 'var(--text-secondary, #888888)' }}
            />
            <input
              type="text"
              placeholder="Search by location, type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full py-3 pl-11 pr-10 text-sm focus:outline-none"
              style={{
                borderRadius: 'var(--radius-sm, 10px)',
                border: '1px solid var(--border, #e0e0d8)',
                backgroundColor: 'var(--white, #ffffff)',
                color: 'var(--charcoal, #2b2b2b)',
                boxShadow: 'var(--shadow-sm)',
                fontFamily: 'inherit',
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-secondary, #888888)' }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-secondary, #888888)' }} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="py-3 pl-4 pr-10 text-sm cursor-pointer focus:outline-none"
              style={{
                borderRadius: 'var(--radius-sm, 10px)',
                border: '1px solid var(--border, #e0e0d8)',
                backgroundColor: 'var(--white, #ffffff)',
                color: 'var(--charcoal, #2b2b2b)',
                boxShadow: 'var(--shadow-sm)',
                fontFamily: 'inherit',
                WebkitAppearance: 'none',
                appearance: 'none' as const,
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
              }}
            >
              <option value="rating">Top rated</option>
              <option value="price_asc">Price: Low to high</option>
              <option value="price_desc">Price: High to low</option>
            </select>
          </div>

          {/* View toggle (segmented control) */}
          <div
            className="flex overflow-hidden"
            style={{
              borderRadius: 'var(--radius-sm, 10px)',
              border: '1px solid var(--border, #e0e0d8)',
              backgroundColor: 'var(--white, #ffffff)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <button
              onClick={() => setViewMode('grid')}
              className="flex items-center gap-1.5 px-[18px] py-3 text-[13px] font-semibold transition-colors border-none cursor-pointer"
              style={{
                backgroundColor: viewMode === 'grid' ? 'var(--gold, #debb73)' : 'transparent',
                color: viewMode === 'grid' ? 'var(--charcoal, #2b2b2b)' : 'var(--text-secondary, #888888)',
                fontFamily: 'inherit',
              }}
            >
              <LayoutGrid className="w-4 h-4" />
              Grid
            </button>
            <button
              onClick={() => {
                // Map always opens. With no search/filter, center on the densest
                // market (the city with the most listings — Las Vegas for now).
                if (!search.trim() && selectedCategory === 'all') {
                  const byCity: Record<string, { lats: number[]; lngs: number[] }> = {}
                  for (const l of filtered) {
                    if (l.lat == null || l.lng == null) continue
                    const key = `${l.city}, ${l.state}`
                    if (!byCity[key]) byCity[key] = { lats: [], lngs: [] }
                    byCity[key].lats.push(l.lat)
                    byCity[key].lngs.push(l.lng)
                  }
                  const densest = Object.values(byCity).sort((a, b) => b.lats.length - a.lats.length)[0]
                  if (densest) {
                    const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length
                    setMapFlyTo([avg(densest.lngs), avg(densest.lats)])
                  }
                }
                setViewMode('map')
              }}
              className="flex items-center gap-1.5 px-[18px] py-3 text-[13px] font-semibold transition-colors border-none cursor-pointer"
              style={{
                backgroundColor: viewMode === 'map' ? 'var(--gold, #debb73)' : 'transparent',
                color: viewMode === 'map' ? 'var(--charcoal, #2b2b2b)' : 'var(--text-secondary, #888888)',
                fontFamily: 'inherit',
              }}
            >
              <Map className="w-4 h-4" />
              Map
            </button>
          </div>
        </div>

        {/* ── Category Pills Strip ── */}
        <div className="mt-5">
          <div
            className="flex gap-2.5 overflow-x-auto pb-4 pt-1"
            style={{
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            <style jsx>{`
              div::-webkit-scrollbar { display: none; }
            `}</style>
            {CATEGORIES.map(cat => {
              const Icon = CATEGORY_ICONS[cat.value] || Layers
              const isActive = selectedCategory === cat.value
              return (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className="flex items-center gap-[7px] px-5 py-2.5 text-[13px] whitespace-nowrap flex-shrink-0 transition-all duration-200 cursor-pointer border-none"
                  style={{
                    borderRadius: 'var(--radius-pill, 100px)',
                    fontFamily: 'inherit',
                    fontWeight: isActive ? 600 : 500,
                    backgroundColor: isActive ? 'var(--gold, #debb73)' : 'var(--white, #ffffff)',
                    color: isActive ? 'var(--charcoal, #2b2b2b)' : 'var(--text-secondary, #888888)',
                    border: isActive ? '1px solid var(--gold, #debb73)' : '1px solid var(--border, #e0e0d8)',
                    boxShadow: isActive ? '0 2px 8px rgba(222,187,115,0.3)' : 'none',
                  }}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {cat.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Result Count Bar ── */}
        <div className="text-[13px] pb-1.5" style={{ color: 'var(--text-secondary, #888888)' }}>
          {isLoading ? 'Searching...' : (
            <>
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              {selectedCategory !== 'all' && (
                <> in <strong>{CATEGORIES.find(c => c.value === selectedCategory)?.label}</strong></>
              )}
              {search && ` for "${search}"`}
            </>
          )}
        </div>

        {/* ── Content ── */}
        <div className="pt-2 pb-20">
          {viewMode === 'grid' ? (
            filtered.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-[22px]">
                {filtered.map(listing => <ListingCard key={listing.id} listing={listing} />)}
              </div>
            ) : (
              <div className="text-center py-24">
                <div className="text-4xl mb-4">🗺️</div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: '#555' }}>
                  No placements found. Try a different search or check back soon.
                </h3>
                <button
                  onClick={() => { setSearch(''); setSelectedCategory('all') }}
                  className="mt-6 text-sm font-medium px-5 py-2.5 rounded-xl hover:opacity-90 cursor-pointer border-none"
                  style={{ backgroundColor: 'var(--gold, #debb73)', color: 'var(--charcoal, #2b2b2b)' }}
                >
                  Clear filters
                </button>
              </div>
            )
          ) : null}
        </div>
      </div>

      {/* ── FULL-BLEED MAP MODE — kept mounted so the map stays warm between toggles ── */}
      <div
        className="fixed left-0 right-0 bottom-0 top-16 z-40"
        style={{ display: viewMode === 'map' ? 'flex' : 'none', backgroundColor: 'var(--cream, #f0f0ec)' }}
      >
        {/* Map area (floating controls live inside) */}
        <div ref={mapAreaRef} className="relative flex-1 h-full min-w-0">
        <MapView
          listings={filtered}
          visible={viewMode === 'map'}
          mobileTile={isMobileVp}
          selectedId={mapSelected?.id ?? null}
          flyTo={mapFlyTo}
          onPinClick={setMapSelected}
          onViewportIds={setViewportIds}
        />

        {/* Mobile: lift Mapbox logo/ⓘ above the peek bar (sheet covers them when raised) */}
        <style jsx global>{`
          @media (max-width: 1023px) {
            .mapboxgl-ctrl-bottom-left,
            .mapboxgl-ctrl-bottom-right {
              bottom: 92px !important;
            }
          }
        `}</style>

        {/* Floating search + category filter (② button — no pill bar in map mode) */}
        <div className="absolute top-4 left-4 right-[72px] lg:right-auto lg:w-[420px]">
          <div className="flex items-center gap-2.5 rounded-full px-4 py-3 shadow-lg" style={{ backgroundColor: '#fff', border: '1px solid var(--border, #e0e0d8)' }}>
            <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--charcoal, #2b2b2b)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search city or placement"
              className="flex-1 min-w-0 text-sm focus:outline-none bg-transparent"
              style={{ color: 'var(--charcoal, #2b2b2b)', fontFamily: 'inherit' }}
            />
            <div className="relative flex-shrink-0 flex items-center justify-center w-6 h-6">
              <SlidersHorizontal className="w-4 h-4" style={{ color: 'var(--charcoal, #2b2b2b)' }} />
              {selectedCategory !== 'all' && (
                <span className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center" style={{ backgroundColor: 'var(--mint, #7ecfc0)', color: '#fff', border: '1.5px solid #fff' }}>1</span>
              )}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer"
                aria-label="Filter by category"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Show list — desktop */}
        <button
          onClick={() => setViewMode('grid')}
          className="hidden lg:flex absolute top-4 right-4 items-center gap-2 rounded-full px-5 py-3 text-[13px] font-bold shadow-lg cursor-pointer"
          style={{ backgroundColor: '#fff', color: 'var(--charcoal, #2b2b2b)', border: '1px solid var(--border, #e0e0d8)', fontFamily: 'inherit' }}
        >
          <LayoutGrid className="w-4 h-4" />
          Show list
        </button>

        {/* Results chip — desktop */}
        <div className="hidden lg:block absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full px-5 py-2.5 text-[13px] font-bold shadow-lg" style={{ backgroundColor: '#fff', color: 'var(--charcoal, #2b2b2b)', border: '1px solid var(--border, #e0e0d8)' }}>
          {mapVisible.length} result{mapVisible.length !== 1 ? 's' : ''}
          {search && <span style={{ color: '#999', fontWeight: 500 }}> · {search}</span>}
        </div>

        {/* Mobile: exit map */}
        <button
          onClick={() => { setViewMode('grid'); setSheetSnap('collapsed') }}
          className="lg:hidden absolute top-4 right-4 w-11 h-11 rounded-full flex items-center justify-center shadow-lg cursor-pointer"
          style={{ backgroundColor: '#fff', border: '1px solid var(--border, #e0e0d8)' }}
        >
          <X className="w-4 h-4" style={{ color: 'var(--charcoal, #2b2b2b)' }} />
        </button>

        {/* Mobile: docked listing tile (tap a pin) — hidden while the sheet is up */}
        {mapSelected && sheetSnap === 'collapsed' && (
          <div className="lg:hidden absolute left-3 right-3 bottom-[96px] rounded-2xl overflow-hidden shadow-2xl" style={{ backgroundColor: '#fff', border: '1px solid var(--border, #e0e0d8)' }}>
            <div className="relative h-36">
              {mapSelected.images && mapSelected.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mapSelected.images[0]} alt={mapSelected.title} className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${mapSelected.image_placeholder}`} />
              )}
              <span className="absolute top-2.5 left-2.5 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide" style={{ backgroundColor: 'rgba(43,43,43,0.82)', color: '#fff' }}>
                {mapSelected.category}
              </span>
              <button onClick={() => setMapSelected(null)} className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer" style={{ backgroundColor: 'rgba(255,255,255,0.92)', border: 'none' }}>
                <X className="w-3.5 h-3.5" style={{ color: 'var(--charcoal, #2b2b2b)' }} />
              </button>
            </div>
            <div className="p-3.5">
              <h3 className="font-bold text-sm leading-snug line-clamp-1" style={{ color: 'var(--charcoal, #2b2b2b)' }}>{mapSelected.title}</h3>
              <div className="flex items-center gap-1.5 text-xs mt-0.5 mb-2.5" style={{ color: '#888' }}>
                <MapPin className="w-3 h-3" />
                {mapSelected.city}, {mapSelected.state}
                <span className="flex items-center gap-1 ml-1 font-semibold" style={{ color: 'var(--charcoal, #2b2b2b)' }}>
                  <Star className="w-3 h-3" style={{ color: 'var(--gold, #debb73)', fill: 'var(--gold, #debb73)' }} />
                  {mapSelected.rating > 0 ? mapSelected.rating : 'New'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm" style={{ color: 'var(--gold, #debb73)' }}>${mapSelected.price_per_day}<span className="text-[11px] font-semibold" style={{ color: '#999' }}>/day</span></span>
                <Link href={`/marketplace/${mapSelected.id}`} className="text-white text-xs font-bold px-3.5 py-2 rounded-xl hover:opacity-90" style={{ backgroundColor: 'var(--gold, #debb73)' }}>
                  View listing →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Mobile: draggable results sheet — snaps to peek / half / full */}
        {(() => {
          const heights = {
            // Slim peek bar — no card preview (tried it, Michael reverted it Aug 24)
            collapsed: 88,
            half: mapAreaH > 0 ? Math.round(mapAreaH * 0.5) : 320,
            full: mapAreaH > 0 ? mapAreaH - 36 : 560,
          }
          const sheetH = Math.max(72, sheetDragH ?? heights[sheetSnap])
          const endDrag = () => {
            const h = sheetDragH
            sheetDragStart.current = null
            if (h == null) return
            const entries: ['collapsed' | 'half' | 'full', number][] = [
              ['collapsed', heights.collapsed], ['half', heights.half], ['full', heights.full],
            ]
            entries.sort((a, b) => Math.abs(a[1] - h) - Math.abs(b[1] - h))
            setSheetSnap(entries[0][0])
            setSheetDragH(null)
          }
          return (
            <div
              className="lg:hidden absolute inset-x-0 bottom-0 rounded-t-2xl flex flex-col overflow-hidden"
              style={{
                height: sheetH,
                backgroundColor: '#fff',
                boxShadow: '0 -6px 24px rgba(43,43,43,0.16)',
                transition: sheetDragH == null ? 'height 0.22s ease' : 'none',
              }}
            >
              <div
                onClick={() => setSheetSnap(prev => (prev === 'collapsed' ? 'half' : 'collapsed'))}
                onTouchStart={(e) => { sheetDragStart.current = { y: e.touches[0].clientY, h: sheetH } }}
                onTouchMove={(e) => {
                  const s = sheetDragStart.current
                  if (!s) return
                  const dy = s.y - e.touches[0].clientY
                  setSheetDragH(Math.max(64, Math.min(heights.full, s.h + dy)))
                }}
                onTouchEnd={endDrag}
                className="pt-2.5 pb-3 text-center cursor-pointer select-none flex-shrink-0"
                style={{ touchAction: 'none' }}
              >
                <span className="block w-9 h-1 rounded-full mx-auto mb-2" style={{ backgroundColor: '#d8d8d0' }} />
                <span className="block text-sm font-bold" style={{ color: 'var(--charcoal, #2b2b2b)' }}>
                  {mapVisible.length} result{mapVisible.length !== 1 ? 's' : ''}
                </span>
                <span className="block text-[11px] mt-0.5" style={{ color: '#999' }}>
                  {sheetSnap === 'collapsed' ? 'Swipe up to browse the list' : 'Drag to resize — swipe down for the map'}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-3">
                {mapVisible.map(listing => <ListingCard key={listing.id} listing={listing} compact />)}
                {mapVisible.length === 0 && (
                  <p className="text-center text-sm pt-10" style={{ color: '#888' }}>No placements in this map area — zoom out or pan around.</p>
                )}
              </div>
            </div>
          )
        })()}
        </div>

        {/* Desktop: results panel — map-aware, updates as you pan */}
        <div className="hidden lg:flex w-[380px] h-full flex-col flex-shrink-0" style={{ backgroundColor: '#fafaf7', borderLeft: '1px solid var(--border, #e0e0d8)' }}>
          <div className="px-5 pt-5 pb-3">
            <h2 className="text-lg font-extrabold" style={{ color: 'var(--charcoal, #2b2b2b)', letterSpacing: '-0.3px' }}>
              Ad space{search ? ` · ${search}` : ''}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: '#888' }}>
              {mapVisible.length} result{mapVisible.length !== 1 ? 's' : ''} in view — updates as you move the map
            </p>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-3">
            {mapVisible.map(listing => <ListingCard key={listing.id} listing={listing} compact />)}
            {mapVisible.length === 0 && (
              <p className="text-center text-sm pt-10" style={{ color: '#888' }}>No placements in this map area — zoom out or pan around.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
