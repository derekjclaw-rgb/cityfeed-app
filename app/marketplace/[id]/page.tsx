'use client'

/**
 * Listing Detail Page — Phase 3: real Supabase data with mock fallback
 */
import { useState, useMemo, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  MapPin, Star, Eye, Lightbulb, Ruler, Clock, ArrowLeft,
  ChevronRight, ChevronLeft, Shield, CheckCircle, Loader2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { MOCK_LISTINGS } from '../page'
import DateRangePicker, { type DisabledRange } from '@/components/DateRangePicker'
import FavoriteButton from '@/components/FavoriteButton'

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
]

interface CreativeSpecs {
  formats?: string[]
  dimensions?: string
  max_file_size?: string
  video_duration?: string
  audio_allowed?: boolean
  loop_count?: number
  host_prints?: boolean
  print_cost?: number
}

interface ListingData {
  id: string
  title: string
  description: string
  category: string
  city: string
  state: string
  address?: string
  zip?: string
  price_per_day: number
  min_days: number
  max_days: number
  dimensions?: string
  daily_impressions: number
  daily_traffic: number
  illuminated?: boolean | null
  production_time?: string
  content_restrictions?: string
  images: string[]
  image_placeholder: string
  tags: string[]
  rating: number
  review_count: number
  host_id?: string
  creative_specs?: CreativeSpecs
  buy_now_enabled?: boolean
  lat?: number
  lng?: number
}

interface HostData {
  id: string
  full_name: string
  avatar?: string
  created_at?: string
}

const MOCK_HOSTS: Record<string, { name: string; avatar: string; rating: number; listings: number; joined: string }> = {
  '1': { name: 'Marcus T.', avatar: 'MT', rating: 4.9, listings: 3, joined: 'Jan 2024' },
  '2': { name: 'Priya K.', avatar: 'PK', rating: 4.7, listings: 1, joined: 'Mar 2024' },
  '3': { name: 'Jake R.', avatar: 'JR', rating: 4.8, listings: 5, joined: 'Nov 2023' },
  '4': { name: 'Sarah L.', avatar: 'SL', rating: 4.6, listings: 2, joined: 'Feb 2024' },
  '5': { name: 'Tom W.', avatar: 'TW', rating: 4.9, listings: 4, joined: 'Oct 2023' },
  '6': { name: 'Aisha M.', avatar: 'AM', rating: 4.5, listings: 1, joined: 'Apr 2024' },
  '7': { name: 'Derek N.', avatar: 'DN', rating: 4.7, listings: 2, joined: 'Dec 2023' },
  '8': { name: 'Olivia C.', avatar: 'OC', rating: 5.0, listings: 1, joined: 'Jan 2025' },
  '9': { name: 'Carlos V.', avatar: 'CV', rating: 4.4, listings: 3, joined: 'May 2024' },
}

const MOCK_DETAILS: Record<string, { description: string; dimensions: string; production_time: string; min_days: number; max_days: number; content_restrictions: string }> = {
  '1': { description: 'Premium digital billboard on the iconic Las Vegas Strip with 4K LED display. Visible from both directions of Las Vegas Blvd.', dimensions: '14ft × 48ft', production_time: '3-5 business days', min_days: 7, max_days: 90, content_restrictions: 'No adult content, tobacco, or competing casino brands.' },
  '2': { description: 'Corner coffee shop in the heart of the Arts District with massive foot traffic.', dimensions: '8ft × 12ft', production_time: '2-3 business days', min_days: 14, max_days: 60, content_restrictions: 'Must align with artistic/creative aesthetic.' },
  '3': { description: 'Fleet of 5 food trucks that operate across Austin tech parks, farmers markets, and major events.', dimensions: '30ft × 8ft per vehicle', production_time: '5-7 business days', min_days: 30, max_days: 180, content_restrictions: 'No alcohol, competitor food brands.' },
  '4': { description: 'High-traffic indoor digital screen in Union Square\'s busiest shopping corridor.', dimensions: '4ft × 6ft (4K)', production_time: '1-2 business days', min_days: 7, max_days: 30, content_restrictions: 'Family-friendly content only.' },
  '5': { description: 'Large-format static billboard above a 2,000-space parking lot directly adjacent to I-90.', dimensions: '20ft × 60ft', production_time: '5-7 business days', min_days: 30, max_days: 365, content_restrictions: 'No adult content or gambling ads.' },
  '6': { description: 'Prime SoHo retail storefront with a full-width banner position.', dimensions: '12ft × 4ft', production_time: '2-3 business days', min_days: 14, max_days: 90, content_restrictions: 'Must align with luxury/fashion aesthetic.' },
  '7': { description: 'Bus stop shelter advertising panel on Metro Line 12, one of Seattle\'s busiest transit corridors.', dimensions: '4ft × 5ft', production_time: '3-5 business days', min_days: 14, max_days: 90, content_restrictions: 'No tobacco, alcohol, or political content.' },
  '8': { description: 'Rooftop LED ticker-style screen visible from multiple city blocks in Midtown East.', dimensions: '60ft × 10ft', production_time: '5-7 business days', min_days: 7, max_days: 30, content_restrictions: 'No adult content. All artwork subject to approval.' },
  '9': { description: 'Blank white wall in a community arts space in East Village.', dimensions: '20ft × 15ft', production_time: '7-10 business days', min_days: 14, max_days: 60, content_restrictions: 'Community review required. No political content.' },
}

// ─── Photo Carousel ───────────────────────────────────────────────────────────

interface PhotoCarouselProps {
  images: string[]
  title: string
  listingId: string
}

function PhotoCarousel({ images, title, listingId }: PhotoCarouselProps) {
  const [current, setCurrent] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)
  const isReal = !/^\d+$/.test(listingId)

  function prev() { setCurrent(i => (i - 1 + images.length) % images.length) }
  function next() { setCurrent(i => (i + 1) % images.length) }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.targetTouches[0].clientX
    touchEndX.current = null
  }
  function handleTouchMove(e: React.TouchEvent) {
    touchEndX.current = e.targetTouches[0].clientX
  }
  function handleTouchEnd() {
    if (touchStartX.current === null || touchEndX.current === null) return
    const diff = touchStartX.current - touchEndX.current
    if (Math.abs(diff) > 40) {
      if (diff > 0) next()
      else prev()
    }
    touchStartX.current = null
    touchEndX.current = null
  }

  return (
    <div className="space-y-3">
      <div
        className="h-72 md:h-96 rounded-2xl overflow-hidden relative select-none"
        style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.08)' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={images[current]}
          alt={`${title} photo ${current + 1}`}
          className="w-full h-full object-cover transition-opacity duration-200"
        />

        {/* Prev / Next arrows — only if multiple images */}
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'rgba(255,255,255,0.9)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
              aria-label="Previous photo"
            >
              <ChevronLeft className="w-5 h-5" style={{ color: '#2b2b2b' }} />
            </button>
            <button
              onClick={next}
              className="absolute right-14 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'rgba(255,255,255,0.9)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
              aria-label="Next photo"
            >
              <ChevronRight className="w-5 h-5" style={{ color: '#2b2b2b' }} />
            </button>
            {/* Dot indicators */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className="rounded-full transition-all"
                  style={{
                    width: i === current ? '20px' : '8px',
                    height: '8px',
                    backgroundColor: i === current ? '#fff' : 'rgba(255,255,255,0.55)',
                  }}
                  aria-label={`Go to photo ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}

        {/* Favorite button */}
        {isReal && (
          <div className="absolute top-4 right-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(4px)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
              <FavoriteButton listingId={listingId} size={20} />
            </div>
          </div>
        )}

        {/* Counter badge */}
        {images.length > 1 && (
          <div className="absolute top-4 left-4">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.45)', color: '#fff', backdropFilter: 'blur(4px)' }}>
              {current + 1} / {images.length}
            </span>
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden transition-all"
              style={{ border: i === current ? '2px solid #7ecfc0' : '2px solid transparent', opacity: i === current ? 1 : 0.65 }}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Booking Widget ────────────────────────────────────────────────────────────
interface BookingWidgetProps {
  listing: ListingData
  startDate?: string
  endDate?: string
  onDatesChange?: (start: string, end: string) => void
}

function BookingWidget({ listing, startDate: externalStart, endDate: externalEnd, onDatesChange }: BookingWidgetProps) {
  const router = useRouter()
  const [internalStart, setInternalStart] = useState('')
  const [internalEnd, setInternalEnd] = useState('')
  const [bookedRanges, setBookedRanges] = useState<DisabledRange[]>([])

  const startDate = externalStart !== undefined ? externalStart : internalStart
  const endDate = externalEnd !== undefined ? externalEnd : internalEnd

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase
        .from('bookings')
        .select('start_date, end_date')
        .eq('listing_id', listing.id)
        .in('status', ['pending', 'confirmed', 'active', 'pop_pending', 'pop_review']),
      supabase
        .from('listings')
        .select('availability')
        .eq('id', listing.id)
        .single(),
    ]).then(([bookingsRes, listingRes]) => {
      const ranges: DisabledRange[] = []
      if (bookingsRes.data) {
        bookingsRes.data.forEach(b => ranges.push({ start: b.start_date, end: b.end_date }))
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const avail = (listingRes.data as any)?.availability as { blocked?: Array<{ start: string; end: string }> } | null
      if (avail?.blocked) {
        avail.blocked.forEach(b => ranges.push({ start: b.start, end: b.end }))
      }
      if (ranges.length > 0) setBookedRanges(ranges)
    })
  }, [listing.id])

  const { days, subtotal, fee, total } = useMemo(() => {
    if (!startDate || !endDate) return { days: 0, subtotal: 0, fee: 0, total: 0 }
    const start = new Date(startDate)
    const end = new Date(endDate)
    const days = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
    const subtotal = days * listing.price_per_day
    const fee = Math.round(subtotal * 0.07 * 100) / 100
    return { days, subtotal, fee, total: subtotal + fee }
  }, [startDate, endDate, listing.price_per_day])

  function handleBook() {
    if (!startDate || !endDate || days < 1) return
    router.push(`/marketplace/${listing.id}/book?start=${startDate}&end=${endDate}&days=${days}&total=${total}`)
  }

  return (
    <div className="rounded-2xl p-6 lg:sticky lg:top-24" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}>
      <div className="flex items-baseline gap-1 mb-6">
        <span className="text-3xl font-bold" style={{ color: '#2b2b2b' }}>${listing.price_per_day}</span>
        <span className="text-sm" style={{ color: '#888' }}>/day</span>
      </div>
      <div className="mb-5">
        <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#888' }}>Select Dates</label>
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onChange={(start, end) => {
            if (onDatesChange) {
              onDatesChange(start, end)
            } else {
              setInternalStart(start)
              setInternalEnd(end)
            }
          }}
          placeholder="Pick start & end date"
          disabledRanges={bookedRanges}
        />
      </div>
      {days > 0 && (
        <div className="rounded-xl p-4 mb-5 space-y-2" style={{ backgroundColor: '#f8f8f5', border: '1px solid #e0e0d8' }}>
          <div className="flex justify-between text-sm" style={{ color: '#555' }}>
            <span>${listing.price_per_day} × {days} day{days !== 1 ? 's' : ''}</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm" style={{ color: '#888' }}>
            <span>City Feed fee (7%)</span>
            <span>${fee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-semibold pt-2" style={{ borderTop: '1px solid #e0e0d8', color: '#2b2b2b' }}>
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      )}
      <button
        onClick={handleBook}
        disabled={!startDate || !endDate || days < 1}
        className="w-full font-semibold py-3.5 rounded-xl hover:opacity-90 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ backgroundColor: '#debb73', color: '#2b2b2b', boxShadow: '0 4px 16px rgba(222,187,115,0.35)' }}
      >
        {listing.buy_now_enabled ? 'Book Now' : 'Request to Book'}
        <ChevronRight className="w-4 h-4" />
      </button>
      <div className="flex items-center justify-center gap-1.5 mt-4 text-xs" style={{ color: '#888' }}>
        <Shield className="w-3.5 h-3.5" />
        {listing.buy_now_enabled ? 'You\'ll be charged immediately' : 'You won\'t be charged until confirmed'}
      </div>
    </div>
  )
}

// ─── Mobile Booking Bottom Sheet ──────────────────────────────────────────────

interface MobileBookingSheetProps {
  listing: ListingData
  onClose: () => void
}

function MobileBookingSheet({ listing, onClose }: MobileBookingSheetProps) {
  const router = useRouter()
  const [internalStart, setInternalStart] = useState('')
  const [internalEnd, setInternalEnd] = useState('')
  const [bookedRanges, setBookedRanges] = useState<DisabledRange[]>([])

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('bookings').select('start_date, end_date').eq('listing_id', listing.id).in('status', ['pending', 'confirmed', 'active']),
      supabase.from('listings').select('availability').eq('id', listing.id).single(),
    ]).then(([bookingsRes, listingRes]) => {
      const ranges: DisabledRange[] = []
      if (bookingsRes.data) bookingsRes.data.forEach(b => ranges.push({ start: b.start_date, end: b.end_date }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const avail = (listingRes.data as any)?.availability as { blocked?: Array<{ start: string; end: string }> } | null
      if (avail?.blocked) avail.blocked.forEach(b => ranges.push({ start: b.start, end: b.end }))
      if (ranges.length > 0) setBookedRanges(ranges)
    })
  }, [listing.id])

  const { days, subtotal, fee, total } = useMemo(() => {
    if (!internalStart || !internalEnd) return { days: 0, subtotal: 0, fee: 0, total: 0 }
    const start = new Date(internalStart)
    const end = new Date(internalEnd)
    const days = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
    const subtotal = days * listing.price_per_day
    const fee = Math.round(subtotal * 0.07 * 100) / 100
    return { days, subtotal, fee, total: subtotal + fee }
  }, [internalStart, internalEnd, listing.price_per_day])

  function handleBook() {
    if (!internalStart || !internalEnd || days < 1) return
    router.push(`/marketplace/${listing.id}/book?start=${internalStart}&end=${internalEnd}&days=${days}&total=${total}`)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40"
        onClick={onClose}
        style={{ backdropFilter: 'blur(2px)' }}
      />
      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden"
        style={{ backgroundColor: '#fff', boxShadow: '0 -4px 32px rgba(0,0,0,0.18)', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: '#e0e0d8' }} />
        </div>
        {/* Close button */}
        <div className="flex items-center justify-between px-6 pb-2">
          <div>
            <span className="text-2xl font-bold" style={{ color: '#2b2b2b' }}>${listing.price_per_day}</span>
            <span className="text-sm ml-1" style={{ color: '#888' }}>/day</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full"
            style={{ backgroundColor: '#f0f0ec' }}
            aria-label="Close"
          >
            <span style={{ color: '#888', fontSize: '18px', lineHeight: 1 }}>×</span>
          </button>
        </div>

        <div className="px-6 pb-8 space-y-4">
          {/* Date picker */}
          <div>
            <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#888' }}>Select Dates</label>
            <DateRangePicker
              startDate={internalStart}
              endDate={internalEnd}
              onChange={(s, e) => { setInternalStart(s); setInternalEnd(e) }}
              placeholder="Pick start & end date"
              disabledRanges={bookedRanges}
            />
          </div>

          {/* Price breakdown */}
          {days > 0 && (
            <div className="rounded-xl p-4 space-y-2" style={{ backgroundColor: '#f8f8f5', border: '1px solid #e0e0d8' }}>
              <div className="flex justify-between text-sm" style={{ color: '#555' }}>
                <span>${listing.price_per_day} × {days} day{days !== 1 ? 's' : ''}</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm" style={{ color: '#888' }}>
                <span>City Feed fee (7%)</span>
                <span>${fee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold pt-2" style={{ borderTop: '1px solid #e0e0d8', color: '#2b2b2b' }}>
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handleBook}
            disabled={!internalStart || !internalEnd || days < 1}
            className="w-full font-semibold py-4 rounded-xl text-base flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#debb73', color: '#2b2b2b', boxShadow: '0 4px 16px rgba(222,187,115,0.35)' }}
          >
            {listing.buy_now_enabled ? 'Book Now' : 'Request to Book'}
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="flex items-center justify-center gap-1.5 text-xs" style={{ color: '#888' }}>
            <Shield className="w-3.5 h-3.5" />
            {listing.buy_now_enabled ? "You'll be charged immediately" : "You won't be charged until confirmed"}
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function ListingDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [listing, setListing] = useState<ListingData | null>(null)
  const [host, setHost] = useState<HostData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedStart, setSelectedStart] = useState('')
  const [selectedEnd, setSelectedEnd] = useState('')
  const [mobileModalOpen, setMobileModalOpen] = useState(false)

  useEffect(() => {
    async function load() {
      // Try real data first
      const supabase = createClient()
      const { data: row, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .single()

      if (!error && row) {
        const l: ListingData = {
          id: row.id,
          title: row.title,
          description: row.description ?? '',
          category: CATEGORY_MAP[row.category] ?? row.category,
          city: row.city ?? '',
          state: row.state ?? '',
          address: row.address,
          zip: row.zip,
          price_per_day: row.price_per_day ?? 0,
          min_days: row.min_days ?? 1,
          max_days: row.max_days ?? 365,
          dimensions: row.dimensions,
          daily_impressions: row.daily_impressions ?? 0,
          daily_traffic: row.daily_traffic ?? 0,
          // NOTE: DB migration needed — alter table public.listings add column if not exists illuminated boolean default null;
          illuminated: row.illuminated ?? null,
          production_time: row.production_time,
          content_restrictions: row.content_restrictions,
          images: row.images ?? [],
          image_placeholder: GRADIENT_POOL[0],
          tags: [],
          rating: 0,
          review_count: 0,
          host_id: row.host_id,
          buy_now_enabled: row.buy_now_enabled ?? false,
          lat: row.lat ?? null,
          lng: row.lng ?? null,
          creative_specs: (row.creative_formats || row.creative_dimensions || row.creative_max_file_size) ? {
            formats: row.creative_formats,
            dimensions: row.creative_dimensions,
            max_file_size: row.creative_max_file_size,
            video_duration: row.creative_video_duration,
            audio_allowed: row.creative_audio_allowed,
            loop_count: row.creative_loop_count,
            host_prints: row.creative_host_prints,
            print_cost: row.creative_print_cost,
          } : undefined,
        }
        setListing(l)

        // Fetch host profile
        if (row.host_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, created_at')
            .eq('id', row.host_id)
            .single()
          if (profile) setHost(profile)
        }
      } else {
        // Fall back to mock data
        const mock = MOCK_LISTINGS.find(l => l.id === id)
        const details = MOCK_DETAILS[id]
        if (mock && details) {
          setListing({
            id: mock.id,
            title: mock.title,
            description: details.description,
            category: mock.category,
            city: mock.city,
            state: mock.state,
            price_per_day: mock.price_per_day,
            min_days: details.min_days,
            max_days: details.max_days,
            dimensions: details.dimensions,
            daily_impressions: mock.daily_impressions,
            daily_traffic: Math.round(mock.daily_impressions * 1.8),
            production_time: details.production_time,
            content_restrictions: details.content_restrictions,
            images: [],
            image_placeholder: mock.image_placeholder,
            tags: mock.tags,
            rating: mock.rating,
            review_count: mock.review_count,
          })
        }
      }
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: '#f0f0ec' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#7ecfc0' }} />
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: '#f0f0ec' }}>
        <div className="text-center">
          <div className="text-4xl mb-4">🗺️</div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: '#555' }}>Listing not found</h2>
          <Link href="/marketplace" className="text-sm font-medium hover:opacity-80" style={{ color: '#7ecfc0' }}>← Back to marketplace</Link>
        </div>
      </div>
    )
  }

  const mockHost = MOCK_HOSTS[id]
  const hostName = host?.full_name ?? mockHost?.name ?? 'Host'
  const hostInitials = hostName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const hostJoined = host?.created_at
    ? new Date(host.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : mockHost?.joined ?? ''

  return (
    <div className="min-h-screen pt-16" style={{ backgroundColor: '#f0f0ec' }}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 text-sm mb-6" style={{ color: '#888' }}>
          <Link href="/marketplace" className="flex items-center gap-1 hover:opacity-80" style={{ color: '#888' }}>
            <ArrowLeft className="w-3.5 h-3.5" />
            Marketplace
          </Link>
          <span>/</span>
          <span className="line-clamp-1" style={{ color: '#2b2b2b' }}>{listing.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
          <div className="lg:col-span-2 space-y-8 order-1">
            {/* Photo gallery / carousel */}
            {listing.images.length > 0 ? (
              <PhotoCarousel
                images={listing.images}
                title={listing.title}
                listingId={listing.id}
              />
            ) : (
              <div className={`h-72 md:h-96 rounded-2xl bg-gradient-to-br ${listing.image_placeholder} relative overflow-hidden`} style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.08)' }}>
                <div className="absolute top-4 left-4">
                  <span className="bg-white/95 text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm" style={{ color: '#555' }}>
                    {listing.category}
                  </span>
                </div>
                {!/^\d+$/.test(listing.id) && (
                  <div className="absolute top-4 right-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(4px)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                      <FavoriteButton listingId={listing.id} size={20} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Title + meta */}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: '#2b2b2b' }}>{listing.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: '#888' }}>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" style={{ color: '#7ecfc0' }} />
                  {listing.city}, {listing.state}
                </div>
                {listing.rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-[#debb73]" style={{ color: '#debb73' }} />
                    <strong style={{ color: '#2b2b2b' }}>{listing.rating}</strong>
                    <span>({listing.review_count} reviews)</span>
                  </div>
                )}
              </div>
              {listing.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {listing.tags.map(tag => (
                    <span key={tag} className="text-xs font-medium px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(126,207,192,0.12)', color: '#7ecfc0', border: '1px solid rgba(126,207,192,0.25)' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: Eye, label: 'Est. Daily Impressions', value: listing.daily_impressions > 0 ? listing.daily_impressions.toLocaleString() : 'N/A' },
                { icon: Lightbulb, label: 'Illuminated', value: listing.illuminated === true ? 'Yes' : listing.illuminated === false ? 'No' : 'N/A' },
                { icon: Ruler, label: 'Dimensions', value: listing.dimensions ?? 'N/A' },
                { icon: Clock, label: 'Production', value: listing.production_time ?? 'N/A' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl p-4" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                  <stat.icon className="w-4 h-4 mb-2" style={{ color: '#7ecfc0' }} />
                  <div className="text-xs mb-1" style={{ color: '#888' }}>{stat.label}</div>
                  <div className="text-sm font-semibold" style={{ color: '#2b2b2b' }}>{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Description */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <h2 className="text-lg font-semibold mb-3" style={{ color: '#2b2b2b' }}>About this placement</h2>
              <p className="text-sm leading-relaxed" style={{ color: '#555' }}>{listing.description}</p>
            </div>

            {/* Details */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <h2 className="text-lg font-semibold mb-4" style={{ color: '#2b2b2b' }}>Listing details</h2>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                {[
                  { label: 'Min. booking', value: `${listing.min_days} days` },
                  { label: 'Max. booking', value: `${listing.max_days} days` },
                  { label: 'Category', value: listing.category },
                  { label: 'Location', value: `${listing.city}, ${listing.state}` },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between py-2" style={{ borderBottom: '1px solid #f0f0ec' }}>
                    <span style={{ color: '#888' }}>{item.label}</span>
                    <span className="font-medium" style={{ color: '#2b2b2b' }}>{item.value}</span>
                  </div>
                ))}
              </div>
              {listing.content_restrictions && (
                <div className="mt-4 p-3 rounded-xl text-xs" style={{ backgroundColor: '#f0f8f5', border: '1px solid #e8f5f3', color: '#2b6b5e' }}>
                  <strong>Content restrictions:</strong> {listing.content_restrictions}
                </div>
              )}
            </div>

            {/* Location Map */}
            {listing.lat && listing.lng && (
              <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div className="p-6 pb-3">
                  <h2 className="text-lg font-semibold mb-1" style={{ color: '#2b2b2b' }}>Location</h2>
                  <div className="flex items-center gap-1.5 text-sm" style={{ color: '#888' }}>
                    <MapPin className="w-3.5 h-3.5" />
                    {listing.address ? `${listing.address}, ` : ''}{listing.city}, {listing.state}
                  </div>
                </div>
                <div className="h-56 w-full">
                  <img
                    alt={`Map showing ${listing.city}, ${listing.state}`}
                    className="w-full h-full object-cover"
                    src={`https://api.mapbox.com/styles/v1/mapbox/light-v11/static/pin-s+7ecfc0(${listing.lng},${listing.lat})/${listing.lng},${listing.lat},13,0/600x300@2x?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`}
                    loading="lazy"
                  />
                </div>
              </div>
            )}

            {/* Creative Specs */}
            {listing.creative_specs && (
              <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <h2 className="text-lg font-semibold mb-4" style={{ color: '#2b2b2b' }}>Creative specs</h2>
                <div className="space-y-3 text-sm">
                  {listing.creative_specs.formats && listing.creative_specs.formats.length > 0 && (
                    <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #f0f0ec' }}>
                      <span style={{ color: '#888' }}>Accepted formats</span>
                      <span className="font-medium" style={{ color: '#2b2b2b' }}>{listing.creative_specs.formats.join(', ')}</span>
                    </div>
                  )}
                  {listing.creative_specs.dimensions && (
                    <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #f0f0ec' }}>
                      <span style={{ color: '#888' }}>Preferred dimensions</span>
                      <span className="font-medium" style={{ color: '#2b2b2b' }}>{listing.creative_specs.dimensions}</span>
                    </div>
                  )}
                  {listing.creative_specs.max_file_size && (
                    <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #f0f0ec' }}>
                      <span style={{ color: '#888' }}>Max file size</span>
                      <span className="font-medium" style={{ color: '#2b2b2b' }}>{listing.creative_specs.max_file_size}</span>
                    </div>
                  )}
                  {listing.creative_specs.video_duration && (
                    <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #f0f0ec' }}>
                      <span style={{ color: '#888' }}>Video duration</span>
                      <span className="font-medium" style={{ color: '#2b2b2b' }}>{listing.creative_specs.video_duration}</span>
                    </div>
                  )}
                  {listing.creative_specs.audio_allowed !== undefined && (
                    <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #f0f0ec' }}>
                      <span style={{ color: '#888' }}>Audio</span>
                      <span className="font-medium" style={{ color: '#2b2b2b' }}>{listing.creative_specs.audio_allowed ? 'Allowed' : 'Not allowed'}</span>
                    </div>
                  )}
                  {listing.creative_specs.loop_count !== undefined && listing.creative_specs.loop_count !== null && (
                    <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #f0f0ec' }}>
                      <span style={{ color: '#888' }}>Loop count</span>
                      <span className="font-medium" style={{ color: '#2b2b2b' }}>{listing.creative_specs.loop_count === 0 ? 'Infinite' : listing.creative_specs.loop_count}</span>
                    </div>
                  )}
                  {listing.creative_specs.host_prints && (
                    <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #f0f0ec' }}>
                      <span style={{ color: '#888' }}>Printing</span>
                      <span className="font-medium" style={{ color: '#2b2b2b' }}>
                        Host provides printing
                        {listing.creative_specs.print_cost ? ` (+$${listing.creative_specs.print_cost})` : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Host card */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <h2 className="text-lg font-semibold mb-4" style={{ color: '#2b2b2b' }}>About the host</h2>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm" style={{ backgroundColor: 'rgba(126,207,192,0.15)', color: '#7ecfc0' }}>
                  {hostInitials}
                </div>
                <div>
                  <div className="font-semibold" style={{ color: '#2b2b2b' }}>{hostName}</div>
                  {hostJoined && <div className="text-sm" style={{ color: '#888' }}>Member since {hostJoined}</div>}
                </div>
                {mockHost && (
                  <div className="ml-auto text-right">
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="w-3.5 h-3.5 fill-[#debb73]" style={{ color: '#debb73' }} />
                      <strong style={{ color: '#2b2b2b' }}>{mockHost.rating}</strong>
                    </div>
                    <div className="text-xs" style={{ color: '#888' }}>{mockHost.listings} listing{mockHost.listings !== 1 ? 's' : ''}</div>
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs" style={{ color: '#888' }}>
                <CheckCircle className="w-3.5 h-3.5" style={{ color: '#7ecfc0' }} />
                Identity verified &nbsp;·&nbsp;
                <CheckCircle className="w-3.5 h-3.5" style={{ color: '#7ecfc0' }} />
                Fast responder
              </div>
            </div>
          </div>

          {/* Booking widget — hidden on mobile, sticky sidebar on desktop */}
          <div className="hidden lg:block lg:col-span-1 order-2">
            <BookingWidget
              listing={listing}
              startDate={selectedStart}
              endDate={selectedEnd}
              onDatesChange={(s, e) => { setSelectedStart(s); setSelectedEnd(e) }}
            />
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA ribbon */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden z-40 px-4 py-3" style={{ backgroundColor: '#fff', borderTop: '1px solid #e0e0d8', boxShadow: '0 -2px 12px rgba(0,0,0,0.08)' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-bold" style={{ color: '#debb73' }}>${listing.price_per_day}<span className="text-xs font-normal" style={{ color: '#888' }}>/day</span></div>
            <div className="text-xs" style={{ color: '#888' }}>Min. {listing.min_days} days</div>
          </div>
          <button
            onClick={() => setMobileModalOpen(true)}
            className="font-semibold px-6 py-3 rounded-xl text-sm"
            style={{ backgroundColor: '#debb73', color: '#2b2b2b', boxShadow: '0 2px 8px rgba(222,187,115,0.3)' }}
          >
            {listing.buy_now_enabled ? 'Book Now' : 'Request to Book'}
          </button>
        </div>
      </div>

      {/* Mobile booking bottom sheet */}
      {mobileModalOpen && (
        <MobileBookingSheet
          listing={listing}
          onClose={() => setMobileModalOpen(false)}
        />
      )}

      {/* Bottom padding on mobile for sticky CTA */}
      <div className="h-20 lg:hidden" />
    </div>
  )
}
