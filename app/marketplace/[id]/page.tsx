'use client'

/**
 * Listing Detail Page — hero, stats, booking widget
 * Updated: new color palette, new categories
 */
import { useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  MapPin, Star, Eye, Car, Ruler, Clock, ArrowLeft,
  Calendar, ChevronRight, Shield, CheckCircle
} from 'lucide-react'
import { MOCK_LISTINGS } from '../page'

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

const MOCK_DETAILS: Record<string, {
  description: string
  dimensions: string
  production_time: string
  min_days: number
  max_days: number
  content_restrictions: string
}> = {
  '1': { description: 'Premium digital billboard on the iconic Las Vegas Strip with 4K LED display. Visible from both directions of Las Vegas Blvd. Perfect for entertainment, hospitality, and consumer brands targeting high-income tourists and locals.', dimensions: '14ft × 48ft', production_time: '3-5 business days', min_days: 7, max_days: 90, content_restrictions: 'No adult content, tobacco, or competing casino brands.' },
  '2': { description: 'Corner coffee shop in the heart of the Arts District with massive foot traffic from the creative community, gallery visitors, and weekend markets. Full window wrap opportunity with excellent street-level visibility.', dimensions: '8ft × 12ft', production_time: '2-3 business days', min_days: 14, max_days: 60, content_restrictions: 'Must align with artistic/creative aesthetic.' },
  '3': { description: 'Fleet of 5 food trucks that operate across Austin tech parks, farmers markets, and major events. Dual-side vehicle wraps covering 300+ sq ft of moving billboard space across key neighborhoods.', dimensions: '30ft × 8ft per vehicle', production_time: '5-7 business days', min_days: 30, max_days: 180, content_restrictions: 'No alcohol, competitor food brands.' },
  '4': { description: 'High-traffic indoor digital screen in Union Square\'s busiest shopping corridor. Loops 15-second spots every 5 minutes. Reaches weekend shoppers, tourists, and office workers.', dimensions: '4ft × 6ft (4K)', production_time: '1-2 business days', min_days: 7, max_days: 30, content_restrictions: 'Family-friendly content only. No political ads.' },
  '5': { description: 'Large-format static billboard above a 2,000-space parking lot directly adjacent to I-90. Massive highway visibility from both directions. Verified traffic data available.', dimensions: '20ft × 60ft', production_time: '5-7 business days', min_days: 30, max_days: 365, content_restrictions: 'No adult content or gambling ads.' },
  '6': { description: 'Prime SoHo retail storefront with a full-width banner position above the entrance on one of NYC\'s most photographed retail blocks. High pedestrian volume from fashion shoppers and tourists.', dimensions: '12ft × 4ft', production_time: '2-3 business days', min_days: 14, max_days: 90, content_restrictions: 'Must align with luxury/fashion aesthetic.' },
  '7': { description: 'Bus stop shelter advertising panel on Metro Line 12, one of Seattle\'s busiest transit corridors. Illuminated panel with 18-hour daily visibility from pedestrians and riders.', dimensions: '4ft × 5ft', production_time: '3-5 business days', min_days: 14, max_days: 90, content_restrictions: 'No tobacco, alcohol, or political content.' },
  '8': { description: 'Rooftop LED ticker-style screen visible from multiple city blocks in Midtown East, just two blocks from Times Square. Premium inventory for maximum brand exposure in the world\'s most watched advertising corridor.', dimensions: '60ft × 10ft', production_time: '5-7 business days', min_days: 7, max_days: 30, content_restrictions: 'No adult content. All artwork subject to approval.' },
  '9': { description: 'Blank white wall in a community arts space in East Village — ideal for large-scale murals, experiential activations, or painted brand campaigns. Adjacent to a popular coffee shop with high social media capture potential.', dimensions: '20ft × 15ft', production_time: '7-10 business days', min_days: 14, max_days: 60, content_restrictions: 'Community review required. No political content.' },
}

function BookingWidget({ pricePerDay, listingId }: { pricePerDay: number; listingId: string }) {
  const router = useRouter()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const { days, subtotal, fee, total } = useMemo(() => {
    if (!startDate || !endDate) return { days: 0, subtotal: 0, fee: 0, total: 0 }
    const start = new Date(startDate)
    const end = new Date(endDate)
    const days = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
    const subtotal = days * pricePerDay
    const fee = Math.round(subtotal * 0.07)
    const total = subtotal + fee
    return { days, subtotal, fee, total }
  }, [startDate, endDate, pricePerDay])

  function handleBook() {
    router.push(`/signup?listing=${listingId}`)
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="rounded-2xl p-6 sticky top-24" style={{ backgroundColor: '#fff', border: '1px solid #d4d4c9', boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}>
      <div className="flex items-baseline gap-1 mb-6">
        <span className="text-3xl font-bold" style={{ color: '#2b2b2b' }}>${pricePerDay}</span>
        <span className="text-sm" style={{ color: '#888' }}>/day</span>
      </div>

      <div className="space-y-3 mb-5">
        <div>
          <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#888' }}>Start Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#888' }} />
            <input
              type="date"
              min={today}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none"
              style={{ border: '1px solid #d4d4c9', color: '#2b2b2b' }}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: '#888' }}>End Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#888' }} />
            <input
              type="date"
              min={startDate || today}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none"
              style={{ border: '1px solid #d4d4c9', color: '#2b2b2b' }}
            />
          </div>
        </div>
      </div>

      {days > 0 && (
        <div className="rounded-xl p-4 mb-5 space-y-2" style={{ backgroundColor: '#f4f4f0', border: '1px solid #e0e0d8' }}>
          <div className="flex justify-between text-sm" style={{ color: '#555' }}>
            <span>${pricePerDay} × {days} day{days !== 1 ? 's' : ''}</span>
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
        className="w-full font-semibold py-3.5 rounded-xl hover:opacity-90 transition-colors flex items-center justify-center gap-2"
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

export default function ListingDetailPage() {
  const params = useParams()
  const id = params.id as string

  const listing = MOCK_LISTINGS.find(l => l.id === id)
  const host = MOCK_HOSTS[id]
  const details = MOCK_DETAILS[id]

  if (!listing || !host || !details) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: '#e6e6dd' }}>
        <div className="text-center">
          <div className="text-4xl mb-4">🗺️</div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: '#555' }}>Listing not found</h2>
          <Link href="/marketplace" className="text-sm font-medium hover:opacity-80 transition-opacity" style={{ color: '#e6964d' }}>
            ← Back to marketplace
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-16" style={{ backgroundColor: '#e6e6dd' }}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-6" style={{ color: '#888' }}>
          <Link href="/marketplace" className="flex items-center gap-1 hover:opacity-80 transition-opacity" style={{ color: '#888' }}>
            <ArrowLeft className="w-3.5 h-3.5" />
            Marketplace
          </Link>
          <span>/</span>
          <span className="line-clamp-1" style={{ color: '#2b2b2b' }}>{listing.title}</span>
        </div>

        <div className="grid lg:grid-cols-3 gap-10">
          {/* Left: main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Hero image */}
            <div className={`h-72 md:h-96 rounded-2xl bg-gradient-to-br ${listing.image_placeholder} relative overflow-hidden`} style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.08)' }}>
              <div className="absolute top-4 left-4">
                <span className="bg-white/95 text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm" style={{ color: '#555' }}>
                  {listing.category}
                </span>
              </div>
            </div>

            {/* Title + meta */}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: '#2b2b2b' }}>{listing.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: '#888' }}>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" style={{ color: '#e6964d' }} />
                  {listing.city}, {listing.state}
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-[#e6964d]" style={{ color: '#e6964d' }} />
                  <strong style={{ color: '#2b2b2b' }}>{listing.rating}</strong>
                  <span>({listing.review_count} reviews)</span>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mt-4">
                {listing.tags.map(tag => (
                  <span key={tag} className="text-xs font-medium px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(230,150,77,0.12)', color: '#e6964d', border: '1px solid rgba(230,150,77,0.25)' }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: Eye, label: 'Daily Impressions', value: listing.daily_impressions.toLocaleString() },
                { icon: Car, label: 'Daily Traffic', value: `${Math.round(listing.daily_impressions * 0.6).toLocaleString()}` },
                { icon: Ruler, label: 'Dimensions', value: details.dimensions },
                { icon: Clock, label: 'Production', value: details.production_time },
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
              <p className="text-sm leading-relaxed" style={{ color: '#555' }}>{details.description}</p>
            </div>

            {/* Details */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: '1px solid #d4d4c9', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <h2 className="text-lg font-semibold mb-4" style={{ color: '#2b2b2b' }}>Listing details</h2>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                {[
                  { label: 'Min. booking', value: `${details.min_days} days` },
                  { label: 'Max. booking', value: `${details.max_days} days` },
                  { label: 'Category', value: listing.category },
                  { label: 'Location', value: `${listing.city}, ${listing.state}` },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between py-2" style={{ borderBottom: '1px solid #f0f0e8' }}>
                    <span style={{ color: '#888' }}>{item.label}</span>
                    <span className="font-medium" style={{ color: '#2b2b2b' }}>{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-xl text-xs" style={{ backgroundColor: '#fef9f0', border: '1px solid #fde8c4', color: '#c4763a' }}>
                <strong>Content restrictions:</strong> {details.content_restrictions}
              </div>
            </div>

            {/* Host card */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: '1px solid #d4d4c9', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <h2 className="text-lg font-semibold mb-4" style={{ color: '#2b2b2b' }}>About the host</h2>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm" style={{ backgroundColor: 'rgba(230,150,77,0.15)', color: '#e6964d' }}>
                  {host.avatar}
                </div>
                <div>
                  <div className="font-semibold" style={{ color: '#2b2b2b' }}>{host.name}</div>
                  <div className="text-sm" style={{ color: '#888' }}>Member since {host.joined}</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="w-3.5 h-3.5 fill-[#e6964d]" style={{ color: '#e6964d' }} />
                    <strong style={{ color: '#2b2b2b' }}>{host.rating}</strong>
                  </div>
                  <div className="text-xs" style={{ color: '#888' }}>{host.listings} listing{host.listings !== 1 ? 's' : ''}</div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs" style={{ color: '#888' }}>
                <CheckCircle className="w-3.5 h-3.5" style={{ color: '#e6964d' }} />
                Identity verified &nbsp;·&nbsp;
                <CheckCircle className="w-3.5 h-3.5" style={{ color: '#e6964d' }} />
                Fast responder
              </div>
            </div>
          </div>

          {/* Right: booking widget */}
          <div className="lg:col-span-1">
            <BookingWidget pricePerDay={listing.price_per_day} listingId={listing.id} />
          </div>
        </div>
      </div>
    </div>
  )
}
