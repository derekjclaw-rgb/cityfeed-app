'use client'

/**
 * Listing Detail Page — Phase 3: real Supabase data with mock fallback
 */
import { useState, useMemo, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  MapPin, Star, Eye, Car, Ruler, Clock, ArrowLeft,
  Calendar, ChevronRight, Shield, CheckCircle, Loader2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { MOCK_LISTINGS } from '../page'

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
]

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
  production_time?: string
  content_restrictions?: string
  images: string[]
  image_placeholder: string
  tags: string[]
  rating: number
  review_count: number
  host_id?: string
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

// ─── Booking Widget ────────────────────────────────────────────────────────────
function BookingWidget({ listing }: { listing: ListingData }) {
  const router = useRouter()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const { days, subtotal, fee, total } = useMemo(() => {
    if (!startDate || !endDate) return { days: 0, subtotal: 0, fee: 0, total: 0 }
    const start = new Date(startDate)
    const end = new Date(endDate)
    const days = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
    const subtotal = days * listing.price_per_day
    const fee = Math.round(subtotal * 0.07)
    return { days, subtotal, fee, total: subtotal + fee }
  }, [startDate, endDate, listing.price_per_day])

  function handleBook() {
    if (!startDate || !endDate || days < 1) return
    router.push(`/marketplace/${listing.id}/book?start=${startDate}&end=${endDate}&days=${days}&total=${total}`)
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="rounded-2xl p-6 lg:sticky lg:top-24" style={{ backgroundColor: '#fff', border: '1px solid #d4d4c9', boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}>
      <div className="flex items-baseline gap-1 mb-6">
        <span className="text-3xl font-bold" style={{ color: '#2b2b2b' }}>${listing.price_per_day}</span>
        <span className="text-sm" style={{ color: '#888' }}>/day</span>
      </div>
      <div className="space-y-3 mb-5">
        <div>
          <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#888' }}>Start Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#888' }} />
            <input type="date" min={today} value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none" style={{ border: '1px solid #d4d4c9', color: '#2b2b2b' }} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#888' }}>End Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#888' }} />
            <input type="date" min={startDate || today} value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none" style={{ border: '1px solid #d4d4c9', color: '#2b2b2b' }} />
          </div>
        </div>
      </div>
      {days > 0 && (
        <div className="rounded-xl p-4 mb-5 space-y-2" style={{ backgroundColor: '#f4f4f0', border: '1px solid #e0e0d8' }}>
          <div className="flex justify-between text-sm" style={{ color: '#555' }}>
            <span>${listing.price_per_day} × {days} day{days !== 1 ? 's' : ''}</span>
            <span>${subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm" style={{ color: '#888' }}>
            <span>City Feed fee (7%)</span>
            <span>${fee.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-semibold pt-2" style={{ borderTop: '1px solid #d4d4c9', color: '#2b2b2b' }}>
            <span>Total</span>
            <span>${total.toLocaleString()}</span>
          </div>
        </div>
      )}
      <button
        onClick={handleBook}
        disabled={!startDate || !endDate || days < 1}
        className="w-full font-semibold py-3.5 rounded-xl hover:opacity-90 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ backgroundColor: '#e6964d', color: '#fff', boxShadow: '0 4px 16px rgba(230,150,77,0.35)' }}
      >
        Request to Book
        <ChevronRight className="w-4 h-4" />
      </button>
      <div className="flex items-center justify-center gap-1.5 mt-4 text-xs" style={{ color: '#888' }}>
        <Shield className="w-3.5 h-3.5" />
        You won&apos;t be charged until confirmed
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function ListingDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [listing, setListing] = useState<ListingData | null>(null)
  const [host, setHost] = useState<HostData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activePhoto, setActivePhoto] = useState(0)

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
          production_time: row.production_time,
          content_restrictions: row.content_restrictions,
          images: row.images ?? [],
          image_placeholder: GRADIENT_POOL[0],
          tags: [],
          rating: 0,
          review_count: 0,
          host_id: row.host_id,
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
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: '#e6e6dd' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#e6964d' }} />
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: '#e6e6dd' }}>
        <div className="text-center">
          <div className="text-4xl mb-4">🗺️</div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: '#555' }}>Listing not found</h2>
          <Link href="/marketplace" className="text-sm font-medium hover:opacity-80" style={{ color: '#e6964d' }}>← Back to marketplace</Link>
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
    <div className="min-h-screen pt-16" style={{ backgroundColor: '#e6e6dd' }}>
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
            {/* Photo gallery */}
            {listing.images.length > 0 ? (
              <div className="space-y-3">
                <div className="h-72 md:h-96 rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.08)' }}>
                  <img src={listing.images[activePhoto]} alt={listing.title} className="w-full h-full object-cover" />
                </div>
                {listing.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto">
                    {listing.images.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setActivePhoto(i)}
                        className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden transition-all"
                        style={{ border: i === activePhoto ? '2px solid #e6964d' : '2px solid transparent' }}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className={`h-72 md:h-96 rounded-2xl bg-gradient-to-br ${listing.image_placeholder} relative overflow-hidden`} style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.08)' }}>
                <div className="absolute top-4 left-4">
                  <span className="bg-white/95 text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm" style={{ color: '#555' }}>
                    {listing.category}
                  </span>
                </div>
              </div>
            )}

            {/* Title + meta */}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: '#2b2b2b' }}>{listing.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: '#888' }}>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" style={{ color: '#e6964d' }} />
                  {listing.city}, {listing.state}
                </div>
                {listing.rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-[#e6964d]" style={{ color: '#e6964d' }} />
                    <strong style={{ color: '#2b2b2b' }}>{listing.rating}</strong>
                    <span>({listing.review_count} reviews)</span>
                  </div>
                )}
              </div>
              {listing.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {listing.tags.map(tag => (
                    <span key={tag} className="text-xs font-medium px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(230,150,77,0.12)', color: '#e6964d', border: '1px solid rgba(230,150,77,0.25)' }}>
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
                { icon: Car, label: 'Est. Daily Traffic', value: listing.daily_traffic > 0 ? listing.daily_traffic.toLocaleString() : (listing.daily_impressions > 0 ? Math.round(listing.daily_impressions * 1.8).toLocaleString() : 'N/A') },
                { icon: Ruler, label: 'Dimensions', value: listing.dimensions ?? 'N/A' },
                { icon: Clock, label: 'Production', value: listing.production_time ?? 'N/A' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl p-4" style={{ backgroundColor: '#fff', border: '1px solid #d4d4c9', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                  <stat.icon className="w-4 h-4 mb-2" style={{ color: '#e6964d' }} />
                  <div className="text-xs mb-1" style={{ color: '#888' }}>{stat.label}</div>
                  <div className="text-sm font-semibold" style={{ color: '#2b2b2b' }}>{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Description */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: '1px solid #d4d4c9', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <h2 className="text-lg font-semibold mb-3" style={{ color: '#2b2b2b' }}>About this placement</h2>
              <p className="text-sm leading-relaxed" style={{ color: '#555' }}>{listing.description}</p>
            </div>

            {/* Details */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: '1px solid #d4d4c9', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <h2 className="text-lg font-semibold mb-4" style={{ color: '#2b2b2b' }}>Listing details</h2>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                {[
                  { label: 'Min. booking', value: `${listing.min_days} days` },
                  { label: 'Max. booking', value: `${listing.max_days} days` },
                  { label: 'Category', value: listing.category },
                  { label: 'Location', value: `${listing.city}, ${listing.state}` },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between py-2" style={{ borderBottom: '1px solid #f0f0e8' }}>
                    <span style={{ color: '#888' }}>{item.label}</span>
                    <span className="font-medium" style={{ color: '#2b2b2b' }}>{item.value}</span>
                  </div>
                ))}
              </div>
              {listing.content_restrictions && (
                <div className="mt-4 p-3 rounded-xl text-xs" style={{ backgroundColor: '#fef9f0', border: '1px solid #fde8c4', color: '#c4763a' }}>
                  <strong>Content restrictions:</strong> {listing.content_restrictions}
                </div>
              )}
            </div>

            {/* Host card */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: '1px solid #d4d4c9', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <h2 className="text-lg font-semibold mb-4" style={{ color: '#2b2b2b' }}>About the host</h2>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm" style={{ backgroundColor: 'rgba(230,150,77,0.15)', color: '#e6964d' }}>
                  {hostInitials}
                </div>
                <div>
                  <div className="font-semibold" style={{ color: '#2b2b2b' }}>{hostName}</div>
                  {hostJoined && <div className="text-sm" style={{ color: '#888' }}>Member since {hostJoined}</div>}
                </div>
                {mockHost && (
                  <div className="ml-auto text-right">
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="w-3.5 h-3.5 fill-[#e6964d]" style={{ color: '#e6964d' }} />
                      <strong style={{ color: '#2b2b2b' }}>{mockHost.rating}</strong>
                    </div>
                    <div className="text-xs" style={{ color: '#888' }}>{mockHost.listings} listing{mockHost.listings !== 1 ? 's' : ''}</div>
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs" style={{ color: '#888' }}>
                <CheckCircle className="w-3.5 h-3.5" style={{ color: '#e6964d' }} />
                Identity verified &nbsp;·&nbsp;
                <CheckCircle className="w-3.5 h-3.5" style={{ color: '#e6964d' }} />
                Fast responder
              </div>
            </div>
          </div>

          {/* Booking widget — hidden on mobile, sticky sidebar on desktop */}
          <div className="hidden lg:block lg:col-span-1 order-2">
            <BookingWidget listing={listing} />
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA ribbon */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden z-50 px-4 py-3" style={{ backgroundColor: '#fff', borderTop: '1px solid #d4d4c9', boxShadow: '0 -2px 12px rgba(0,0,0,0.08)' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-bold" style={{ color: '#e6964d' }}>${listing.price_per_day}<span className="text-xs font-normal" style={{ color: '#888' }}>/day</span></div>
            <div className="text-xs" style={{ color: '#888' }}>Min. {listing.min_days} days</div>
          </div>
          <a
            href={`/marketplace/${listing.id}/book`}
            className="font-semibold px-6 py-3 rounded-xl text-sm"
            style={{ backgroundColor: '#e6964d', color: '#fff', boxShadow: '0 2px 8px rgba(230,150,77,0.3)' }}
          >
            Book Now
          </a>
        </div>
      </div>

      {/* Bottom padding on mobile for sticky CTA */}
      <div className="h-20 lg:hidden" />
    </div>
  )
}
