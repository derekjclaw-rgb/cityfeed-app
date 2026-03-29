'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutGrid, PlusCircle, MessageSquare, ClipboardList,
  TrendingUp, DollarSign, AlertCircle, Loader2, User, Heart, CreditCard, MapPin, Image as ImageIcon, CheckCircle, X
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────

type DashMode = 'advertiser' | 'host'

interface Profile {
  id: string
  full_name: string
  email: string
  role: string
  avatar_url?: string
  stripe_account_id?: string
  stripe_connected?: boolean
}

interface Stats {
  listings: number
  activeBookings: number
  earnings: number
  pendingPOP: number
  unreadMessages: number
  totalSpent: number
  pendingReviews: number
}

interface Activity {
  id: string
  type: 'booking' | 'message'
  title: string
  subtitle: string
  time: string
  href: string
  start_date?: string
  end_date?: string
}

interface Campaign {
  id: string
  listing_title: string
  listing_id: string
  listing_image?: string
  status: string
  start_date: string
  end_date: string
  total_price: number
}

interface HostListing {
  id: string
  title: string
  city: string
  state: string
  status: string
  images?: string[]
  price_per_day: number
  category: string
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, prefix = '', color = '#7ecfc0' }: {
  label: string
  value: number | string
  icon: React.ElementType
  prefix?: string
  color?: string
}) {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div className="flex items-start justify-between mb-3">
        <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${color}18` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-bold mb-1" style={{ color: '#2b2b2b' }}>{prefix}{value}</p>
      <p className="text-xs font-medium" style={{ color: '#888' }}>{label}</p>
    </div>
  )
}

// ─── Mode Toggle Pill ─────────────────────────────────────────────────────────

function ModeToggle({ mode, onChange }: { mode: DashMode; onChange: (m: DashMode) => void }) {
  return (
    <div
      className="flex items-center rounded-xl p-1 gap-1"
      style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(222,187,115,0.25)' }}
    >
      <button
        onClick={() => onChange('advertiser')}
        className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
        style={mode === 'advertiser'
          ? { backgroundColor: '#debb73', color: '#2b2b2b', boxShadow: '0 1px 4px rgba(222,187,115,0.4)' }
          : { color: '#888', backgroundColor: 'transparent' }
        }
      >
        Advertiser
      </button>
      <button
        onClick={() => onChange('host')}
        className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
        style={mode === 'host'
          ? { backgroundColor: '#debb73', color: '#2b2b2b', boxShadow: '0 1px 4px rgba(222,187,115,0.4)' }
          : { color: '#888', backgroundColor: 'transparent' }
        }
      >
        Host
      </button>
    </div>
  )
}

// ─── Status maps ──────────────────────────────────────────────────────────────

/** Returns true if campaign is currently live (between start/end dates with approved POP) */
function isCampaignLive(status: string, startDate: string, endDate: string): boolean {
  if (!['active', 'pop_pending', 'pop_review', 'completed'].includes(status)) return false
  const now = new Date()
  const start = startDate ? new Date(startDate) : null
  const end = endDate ? new Date(endDate) : null
  return !!(start && end && now >= start && now <= end)
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending Review',
  confirmed: 'Confirmed',
  active: 'Active — Live',
  pop_pending: 'POP Submitted',
  pop_review: 'POP Review',
  completed: 'Completed ✓',
  cancelled: 'Cancelled',
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#fef9ec', text: '#b45309' },
  confirmed: { bg: '#eff6ff', text: '#1d4ed8' },
  active: { bg: '#f0fdf4', text: '#16a34a' },
  pop_pending: { bg: '#f0f8f5', text: '#7ecfc0' },
  pop_review: { bg: '#f0f8f5', text: '#7ecfc0' },
  completed: { bg: '#f0fdf4', text: '#16a34a' },
  cancelled: { bg: '#fef2f2', text: '#dc2626' },
  live: { bg: '#dcfce7', text: '#15803d' },
}

const LISTING_STATUS_STYLES: Record<string, React.CSSProperties> = {
  pending: { backgroundColor: '#f0f8f5', color: '#2b6b5e' },
  active: { backgroundColor: 'rgba(126,207,192,0.1)', color: '#7ecfc0' },
  inactive: { backgroundColor: '#f8f8f5', color: '#888' },
  rejected: { backgroundColor: '#fef2f2', color: '#dc2626' },
}

const LISTING_STATUS_LABELS: Record<string, string> = {
  pending: 'Under review',
  active: 'Live',
  inactive: 'Paused',
  rejected: 'Rejected',
}

interface ActionBanner {
  message: string
  href: string
  cta: string
}

// ─── Main Content ─────────────────────────────────────────────────────────────

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [mode, setMode] = useState<DashMode>('advertiser')
  const [modeReady, setModeReady] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [activity, setActivity] = useState<Activity[]>([])
  const [actionBanner, setActionBanner] = useState<ActionBanner | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [hostListings, setHostListings] = useState<HostListing[]>([])
  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const [stripeSuccess, setStripeSuccess] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // ── Stripe success banner ────────────────────────────────────────────────────
  useEffect(() => {
    if (searchParams.get('stripe_success') === 'true') {
      setStripeSuccess(true)
      const url = new URL(window.location.href)
      url.searchParams.delete('stripe_success')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams])

  // ── Step 1: Auth + Profile + determine default mode ─────────────────────────
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, avatar_url, stripe_account_id, stripe_connected')
        .eq('id', user.id)
        .single()

      setProfile(profileData)
      setUserId(user.id)

      // Determine initial mode
      const saved = localStorage.getItem('cf_dash_mode') as DashMode | null
      if (saved === 'host' || saved === 'advertiser') {
        setMode(saved)
      } else {
        // Smart default: if user has any listings → host mode
        const { count } = await supabase
          .from('listings')
          .select('id', { count: 'exact', head: true })
          .eq('host_id', user.id)
        setMode((count ?? 0) > 0 ? 'host' : 'advertiser')
      }

      setModeReady(true)
      setLoading(false)
    })
  }, [router])

  // ── Step 2: Fetch data whenever mode or userId changes ───────────────────────
  const fetchDashboardData = useCallback(async (currentMode: DashMode, uid: string) => {
    setDataLoading(true)
    setStats(null)
    setCampaigns([])
    setHostListings([])
    setActivity([])
    setActionBanner(null)

    const supabase = createClient()
    const isHost = currentMode === 'host'

    try {
      if (isHost) {
        const [listingsRes, bookingsRes, messagesRes, popRes] = await Promise.all([
          supabase.from('listings').select('id, title, city, state, status, images, price_per_day, category', { count: 'exact' }).eq('host_id', uid).eq('status', 'active'),
          supabase.from('bookings').select('id, total_price, payout_amount, status').eq('host_id', uid).in('status', ['active', 'confirmed', 'pending', 'completed']),
          supabase.from('messages').select('id', { count: 'exact' }).neq('sender_id', uid),
          supabase.from('bookings').select('id', { count: 'exact' }).eq('host_id', uid).eq('status', 'pop_pending'),
        ])

        const { data: allListings } = await supabase
          .from('listings')
          .select('id, title, city, state, status, images, price_per_day, category')
          .eq('host_id', uid)
          .order('created_at', { ascending: false })
          .limit(5)
        setHostListings((allListings ?? []) as HostListing[])

        const earnings = bookingsRes.data?.reduce((sum, b) => {
          // Only count completed bookings as real earnings
          if (b.status === 'completed') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return sum + ((b as any).payout_amount ?? (b.total_price || 0) * 0.93)
          }
          return sum
        }, 0) ?? 0

        setStats({
          listings: listingsRes.count ?? 0,
          activeBookings: bookingsRes.data?.filter(b => b.status === 'active' || b.status === 'confirmed').length ?? 0,
          earnings: Math.round(earnings),
          pendingPOP: popRes.count ?? 0,
          unreadMessages: messagesRes.count ?? 0,
          totalSpent: 0,
          pendingReviews: 0,
        })

        // Action banner (host)
        try {
          const { data: pendingBooking } = await supabase
            .from('bookings').select('id, listings(title)').eq('host_id', uid).eq('status', 'pending')
            .order('created_at', { ascending: false }).limit(1).single()
          if (pendingBooking) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const title = (pendingBooking as any).listings?.title ?? 'a listing'
            setActionBanner({ message: `New booking request for "${title}"`, href: `/dashboard/bookings`, cta: 'Review Now' })
          } else {
            const { data: collateralBooking } = await supabase
              .from('bookings').select('id, listings(title)').eq('host_id', uid).eq('status', 'confirmed')
              .order('updated_at', { ascending: false }).limit(1).single()
            if (collateralBooking) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const title = (collateralBooking as any).listings?.title ?? 'a booking'
              setActionBanner({ message: `Creative may be ready for "${title}" — check the booking`, href: `/dashboard/bookings/${collateralBooking.id}`, cta: 'View Booking' })
            }
          }
        } catch { /* non-critical */ }

      } else {
        // Advertiser
        const [bookingsRes, messagesRes, reviewsRes] = await Promise.all([
          supabase.from('bookings').select(`
            id, total_price, status, start_date, end_date, listing_id,
            listings(title, images)
          `).eq('advertiser_id', uid).order('created_at', { ascending: false }),
          supabase.from('messages').select('id', { count: 'exact' }).neq('sender_id', uid),
          supabase.from('bookings').select('id', { count: 'exact' }).eq('advertiser_id', uid).eq('status', 'pop_review'),
        ])

        const totalSpent = bookingsRes.data?.reduce((sum, b) => {
          if (b.status === 'confirmed' || b.status === 'active' || b.status === 'completed') return sum + (b.total_price || 0)
          return sum
        }, 0) ?? 0

        setStats({
          listings: 0,
          activeBookings: bookingsRes.data?.filter(b => b.status === 'active' || b.status === 'confirmed').length ?? 0,
          earnings: 0,
          pendingPOP: 0,
          unreadMessages: messagesRes.count ?? 0,
          totalSpent: Math.round(totalSpent),
          pendingReviews: reviewsRes.count ?? 0,
        })

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setCampaigns((bookingsRes.data ?? []).map((b: any) => ({
          id: b.id,
          listing_title: b.listings?.title ?? 'Listing',
          listing_id: b.listing_id,
          listing_image: b.listings?.images?.[0] ?? undefined,
          status: b.status,
          start_date: b.start_date,
          end_date: b.end_date,
          total_price: b.total_price,
        })))

        // Action banner (advertiser)
        try {
          const { data: confirmedBookings } = await supabase
            .from('bookings').select('id, listings(title)').eq('advertiser_id', uid).eq('status', 'confirmed')
            .order('created_at', { ascending: false }).limit(3)

          if (confirmedBookings && confirmedBookings.length > 0) {
            let hasCollateral = false
            for (const bk of confirmedBookings) {
              const { data: storageFiles } = await supabase.storage.from('booking-collateral').list(`bookings/${bk.id}`)
              if (storageFiles && storageFiles.length > 0) { hasCollateral = true; break }
            }
            if (hasCollateral) {
              setActionBanner({ message: `Collateral is with the host — stand by for POP`, href: `/dashboard/messages`, cta: 'View Messages' })
            } else {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const title = (confirmedBookings[0] as any).listings?.title ?? 'your listing'
              setActionBanner({ message: `Upload your creative for "${title}"`, href: `/dashboard/bookings/${confirmedBookings[0].id}`, cta: 'Upload Creative' })
            }
          } else {
            const { data: popBooking } = await supabase
              .from('bookings').select('id, listings(title)').eq('advertiser_id', uid).in('status', ['pop_pending', 'pop_review'])
              .limit(1).single()
            if (popBooking) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const title = (popBooking as any).listings?.title ?? 'your listing'
              setActionBanner({ message: `Review proof of posting for "${title}"`, href: `/dashboard/bookings/${popBooking.id}`, cta: 'Review Now' })
            }
          }
        } catch { /* non-critical */ }
      }

      // Recent activity (shared) — sorted by status priority for host
      const { data: recentBookings } = await supabase
        .from('bookings')
        .select('id, status, created_at, start_date, end_date, listings(title)')
        .eq(isHost ? 'host_id' : 'advertiser_id', uid)
        .order('created_at', { ascending: false })
        .limit(10)

      const sortedBookings = (recentBookings ?? []).sort((a, b) => {
        if (isHost) {
          const order: Record<string, number> = { pending: 0, confirmed: 1, active: 2, pop_pending: 2, pop_review: 2, completed: 3, cancelled: 4 }
          return (order[a.status] ?? 5) - (order[b.status] ?? 5)
        }
        return 0
      }).slice(0, 3)

      setActivity(sortedBookings.map(b => ({
        id: b.id,
        type: 'booking' as const,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        title: (b as any).listings?.title ?? 'Booking',
        subtitle: `Status: ${b.status}`,
        time: new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        href: `/dashboard/bookings`,
        start_date: b.start_date,
        end_date: b.end_date,
      })))

    } catch {
      // stats fetch failed silently
    }

    setDataLoading(false)
  }, [])

  useEffect(() => {
    if (modeReady && userId) {
      fetchDashboardData(mode, userId)
    }
  }, [mode, userId, modeReady, fetchDashboardData])

  // ── Mode toggle handler ───────────────────────────────────────────────────────
  const handleModeChange = useCallback(async (newMode: DashMode) => {
    setMode(newMode)
    localStorage.setItem('cf_dash_mode', newMode)
    // Dispatch event so Navbar can update its indicator
    window.dispatchEvent(new CustomEvent('cf_mode_change', { detail: newMode }))

    // If switching to host for first time, upgrade role to 'both' in DB
    if (newMode === 'host' && profile && profile.role === 'advertiser') {
      const supabase = createClient()
      await supabase.from('profiles').update({ role: 'both' }).eq('id', profile.id)
      setProfile(prev => prev ? { ...prev, role: 'both' } : prev)
    }
  }, [profile])

  // ── Loading states ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f0f0ec' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#7ecfc0' }} />
      </div>
    )
  }

  const isHost = mode === 'host'
  const firstName = profile?.full_name?.split(' ')[0] || ''
  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'

  const hostLinks = [
    { href: '/dashboard/create-listing', label: 'Create Listing', desc: 'List a new ad placement', icon: PlusCircle },
    { href: '/dashboard/listings', label: 'My Listings', desc: 'Manage your active listings', icon: LayoutGrid },
    { href: '/dashboard/messages', label: 'Messages', desc: 'Chat with advertisers', icon: MessageSquare },
    { href: '/dashboard/bookings', label: 'Bookings', desc: 'View booking requests', icon: ClipboardList },
    { href: '/dashboard/stripe-onboarding', label: 'Payout Setup', desc: 'Connect your bank account', icon: CreditCard },
    { href: '/dashboard/profile', label: 'My Profile', desc: 'Edit your public profile', icon: User },
  ]

  const advertiserLinks = [
    { href: '/marketplace', label: 'Browse Placements', desc: 'Find ad spaces to book', icon: TrendingUp },
    { href: '/dashboard/bookings', label: 'My Campaigns', desc: 'Track your active campaigns', icon: ClipboardList },
    { href: '/dashboard/saved', label: 'Saved Listings', desc: 'Your favorited placements', icon: Heart },
    { href: '/dashboard/messages', label: 'Messages', desc: 'Chat with hosts', icon: MessageSquare },
    { href: '/dashboard/profile', label: 'My Profile', desc: 'Edit your public profile', icon: User },
    { href: '/dashboard/create-listing', label: 'List Your Space', desc: 'Got ad space? Start earning', icon: PlusCircle },
  ]

  const links = isHost ? hostLinks : advertiserLinks

  return (
    <div className="min-h-screen pt-20 px-4 sm:px-6 pb-12" style={{ backgroundColor: '#f0f0ec' }}>
      <div className="max-w-4xl mx-auto">

        {/* Stripe success toast */}
        {stripeSuccess && (
          <div className="rounded-xl px-5 py-4 mb-6 flex items-center justify-between gap-4"
            style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#16a34a' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: '#16a34a' }}>Bank account connected!</p>
                <p className="text-xs mt-0.5" style={{ color: '#15803d' }}>You&apos;re all set to receive payouts when campaigns complete.</p>
              </div>
            </div>
            <button onClick={() => setStripeSuccess(false)} className="hover:opacity-70">
              <X className="w-4 h-4" style={{ color: '#16a34a' }} />
            </button>
          </div>
        )}

        {/* ── Header with Mode Toggle ─────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={firstName} className="w-12 h-12 rounded-full object-cover flex-shrink-0" style={{ border: '2px solid #7ecfc0' }} />
            ) : (
              <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold flex-shrink-0" style={{ backgroundColor: 'rgba(126,207,192,0.15)', color: '#7ecfc0', border: '2px solid #7ecfc0' }}>
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-2xl font-bold" style={{ color: '#2b2b2b' }}>
                Welcome back{firstName ? `, ${firstName}` : ''}
              </h1>
              <p className="text-sm" style={{ color: '#888' }}>
                {isHost ? 'Manage your listings and bookings' : 'Find and manage your ad campaigns'}
              </p>
            </div>
          </div>

          {/* Mode toggle pill */}
          <ModeToggle mode={mode} onChange={handleModeChange} />
        </div>

        {/* Action banner */}
        {actionBanner && (
          <Link href={actionBanner.href}>
            <div className="rounded-xl px-5 py-4 mb-6 flex items-center justify-between gap-4 hover:opacity-90 transition-opacity cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #debb73, #c9a55f)', boxShadow: '0 4px 16px rgba(222,187,115,0.4)' }}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse" style={{ backgroundColor: '#2b2b2b' }} />
                <p className="text-sm font-semibold truncate" style={{ color: '#2b2b2b' }}>{actionBanner.message}</p>
              </div>
              <span className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap" style={{ backgroundColor: '#2b2b2b', color: '#debb73' }}>
                {actionBanner.cta} →
              </span>
            </div>
          </Link>
        )}

        {/* Data loading spinner */}
        {dataLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#7ecfc0' }} />
          </div>
        )}

        {!dataLoading && (
          <>
            {/* ── ADVERTISER: My Campaigns ─────────────────────────────── */}
            {!isHost && campaigns.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold" style={{ color: '#2b2b2b' }}>My Campaigns</h2>
                  <Link href="/dashboard/bookings" className="text-xs font-medium hover:underline" style={{ color: '#7ecfc0' }}>View all</Link>
                </div>
                <div className="space-y-3">
                  {[...campaigns]
                    .sort((a, b) => {
                      // Live first, then pending, then completed/others
                      const aLive = isCampaignLive(a.status, a.start_date, a.end_date) ? 0 : 1
                      const bLive = isCampaignLive(b.status, b.start_date, b.end_date) ? 0 : 1
                      if (aLive !== bLive) return aLive - bLive
                      const order: Record<string, number> = { pending: 0, confirmed: 1, active: 2, pop_pending: 2, pop_review: 2, completed: 3, cancelled: 4 }
                      return (order[a.status] ?? 5) - (order[b.status] ?? 5)
                    })
                    .slice(0, 5)
                    .map(campaign => {
                    const isLive = isCampaignLive(campaign.status, campaign.start_date, campaign.end_date)
                    const isComplete = campaign.status === 'completed' && !isLive
                    const sc = isLive ? STATUS_COLORS.live : (STATUS_COLORS[campaign.status] ?? { bg: '#f8f8f5', text: '#888' })
                    const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'
                    return (
                      <Link key={campaign.id} href={`/dashboard/bookings/${campaign.id}`}>
                        <div className="rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-all hover:shadow-md"
                          style={{ backgroundColor: '#fff', border: isLive ? '1px solid #86efac' : '1px solid #e0e0d8', boxShadow: isLive ? '0 1px 8px rgba(34,197,94,0.12)' : '0 1px 4px rgba(0,0,0,0.05)' }}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-sm truncate" style={{ color: '#2b2b2b' }}>{campaign.listing_title}</h3>
                              {isLive ? (
                                <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1"
                                  style={{ backgroundColor: '#dcfce7', color: '#15803d' }}>
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                                  LIVE
                                </span>
                              ) : (
                                <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: sc.bg, color: sc.text }}>
                                  {isComplete ? 'Completed ✓' : (STATUS_LABELS[campaign.status] ?? campaign.status)}
                                </span>
                              )}
                            </div>
                            <p className="text-xs" style={{ color: '#888' }}>
                              {fmt(campaign.start_date)} — {fmt(campaign.end_date)}
                              {campaign.total_price ? ` · $${campaign.total_price.toFixed(2)}` : ''}
                            </p>
                          </div>
                          {campaign.listing_image ? (
                            <img src={campaign.listing_image} alt={campaign.listing_title} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" style={{ border: '1px solid #e0e0d8' }} />
                          ) : (
                            <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f8f8f5', border: '1px solid #e0e0d8' }}>
                              <ImageIcon className="w-5 h-5" style={{ color: '#ccc' }} />
                            </div>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── HOST: First-time onboarding ───────────────────────────── */}
            {isHost && stats && stats.listings === 0 && (
              <div className="rounded-2xl p-6 mb-6" style={{
                background: 'linear-gradient(135deg, rgba(126,207,192,0.1), rgba(222,187,115,0.1))',
                border: '1px solid rgba(126,207,192,0.3)'
              }}>
                <div className="flex items-start gap-4">
                  <div className="text-3xl flex-shrink-0">🏙️</div>
                  <div className="flex-1">
                    <h2 className="text-lg font-bold mb-1" style={{ color: '#2b2b2b' }}>Welcome to City Feed!</h2>
                    <p className="text-sm mb-4" style={{ color: '#555' }}>
                      Let&apos;s get your first listing live. It takes about 5 minutes to list your ad space.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Link href="/dashboard/create-listing"
                        className="font-semibold px-5 py-2.5 rounded-xl text-sm hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: '#debb73', color: '#2b2b2b' }}>
                        Create Your First Listing →
                      </Link>
                      <Link href="/dashboard/stripe-onboarding"
                        className="font-semibold px-5 py-2.5 rounded-xl text-sm hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', color: '#555' }}>
                        Set Up Payouts
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── HOST: Stripe Connect banner ───────────────────────────── */}
            {isHost && stats && stats.listings > 0 && profile && !profile.stripe_connected && (
              <div className="rounded-2xl p-4 mb-6 flex items-center gap-4" style={{ backgroundColor: '#f0f8f5', border: '1px solid #d0ede9' }}>
                <div className="p-2.5 rounded-xl flex-shrink-0" style={{ backgroundColor: 'rgba(126,207,192,0.15)' }}>
                  <CreditCard className="w-5 h-5" style={{ color: '#7ecfc0' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: '#2b2b2b' }}>Connect your bank to receive payouts</p>
                  <p className="text-xs mt-0.5" style={{ color: '#888' }}>Set up Stripe to get paid when campaigns complete.</p>
                </div>
                <Link href="/dashboard/stripe-onboarding"
                  className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#debb73', color: '#2b2b2b' }}>
                  Set Up ⚠️
                </Link>
              </div>
            )}

            {/* ── HOST: My Listings ─────────────────────────────────────── */}
            {isHost && hostListings.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold" style={{ color: '#2b2b2b' }}>My Listings</h2>
                  <Link href="/dashboard/listings" className="text-xs font-medium hover:underline" style={{ color: '#7ecfc0' }}>Manage all</Link>
                </div>
                <div className="space-y-3">
                  {hostListings.map(lst => {
                    const lstStyle = LISTING_STATUS_STYLES[lst.status] ?? LISTING_STATUS_STYLES.pending
                    return (
                      <Link key={lst.id} href="/dashboard/listings">
                        <div className="rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-all"
                          style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                          {lst.images && lst.images.length > 0 ? (
                            <img src={lst.images[0]} alt={lst.title} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" style={{ border: '1px solid #e0e0d8' }} />
                          ) : (
                            <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f8f8f5', border: '1px solid #e0e0d8' }}>
                              <MapPin className="w-5 h-5" style={{ color: '#ccc' }} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-sm truncate" style={{ color: '#2b2b2b' }}>{lst.title}</h3>
                              <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full" style={lstStyle}>
                                {LISTING_STATUS_LABELS[lst.status] ?? lst.status}
                              </span>
                            </div>
                            <p className="text-xs" style={{ color: '#888' }}>{lst.city}, {lst.state} · ${lst.price_per_day}/day</p>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Stats Grid ────────────────────────────────────────────── */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {isHost ? (
                  <>
                    <StatCard label="Active Listings" value={stats.listings} icon={LayoutGrid} />
                    <StatCard label="Active Bookings" value={stats.activeBookings} icon={ClipboardList} />
                    <StatCard label="Earnings" value={stats.earnings.toLocaleString()} icon={DollarSign} prefix="$" color="#16a34a" />
                    {stats.pendingPOP > 0 && (
                      <StatCard label="POP Needed" value={stats.pendingPOP} icon={AlertCircle} color="#dc2626" />
                    )}
                  </>
                ) : (
                  <>
                    <StatCard label="Active Campaigns" value={stats.activeBookings} icon={ClipboardList} />
                    <StatCard label="Total Spent" value={stats.totalSpent.toLocaleString()} icon={DollarSign} prefix="$" color="#16a34a" />
                    {stats.pendingReviews > 0 && (
                      <StatCard label="POP to Review" value={stats.pendingReviews} icon={AlertCircle} color="#dc2626" />
                    )}
                    <Link href="/dashboard/messages">
                      <StatCard label="Messages" value={stats.unreadMessages} icon={MessageSquare} />
                    </Link>
                  </>
                )}
              </div>
            )}

            {/* ── HOST: Bookings section ────────────────────────────────── */}
            {isHost && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold" style={{ color: '#2b2b2b' }}>Bookings</h2>
                  <Link href="/dashboard/bookings" className="text-xs font-medium hover:underline" style={{ color: '#7ecfc0' }}>View all</Link>
                </div>
                {activity.length > 0 ? (
                  <div className="space-y-3">
                    {activity.map(item => {
                      const rawStatus = item.subtitle.replace('Status: ', '')
                      const isLive = isCampaignLive(rawStatus, item.start_date ?? '', item.end_date ?? '')
                      const isComplete = rawStatus === 'completed' && !isLive
                      const sc = isLive ? STATUS_COLORS.live : (STATUS_COLORS[rawStatus] ?? { bg: '#f8f8f5', text: '#888' })
                      return (
                        <Link key={item.id} href="/dashboard/bookings">
                          <div className="flex items-center justify-between p-4 rounded-2xl hover:shadow-md transition-all"
                            style={{ backgroundColor: '#fff', border: isLive ? '1px solid #86efac' : '1px solid #e0e0d8', boxShadow: isLive ? '0 1px 8px rgba(34,197,94,0.12)' : '0 1px 4px rgba(0,0,0,0.05)' }}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="text-sm font-medium truncate" style={{ color: '#2b2b2b' }}>{item.title}</p>
                                {isLive ? (
                                  <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1"
                                    style={{ backgroundColor: '#dcfce7', color: '#15803d' }}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                                    LIVE
                                  </span>
                                ) : (
                                  <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: sc.bg, color: sc.text }}>
                                    {isComplete ? 'Complete' : (STATUS_LABELS[rawStatus] ?? rawStatus)}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs mt-0.5" style={{ color: '#888' }}>{item.time}</p>
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8' }}>
                    <p className="text-sm" style={{ color: '#aaa' }}>No bookings yet</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Quick Actions Grid ────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {links.map((link) => (
                <Link key={link.href} href={link.href}
                  className="group bg-white rounded-2xl p-6 hover:shadow-lg transition-all hover:-translate-y-0.5"
                  style={{ border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#f0f0ec' }}>
                      <link.icon className="w-6 h-6" style={{ color: '#7ecfc0' }} />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 group-hover:text-[#7ecfc0] transition-colors" style={{ color: '#2b2b2b' }}>
                        {link.label}
                      </h3>
                      <p className="text-sm" style={{ color: '#888' }}>{link.desc}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* ── ADVERTISER: Recent Activity ───────────────────────────── */}
            {!isHost && activity.length > 0 && (
              <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <h2 className="font-semibold mb-4" style={{ color: '#2b2b2b' }}>Recent Activity</h2>
                <div className="space-y-3">
                  {activity.map(item => (
                    <Link key={item.id} href={item.href}
                      className="flex items-center justify-between p-3 rounded-xl hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: '#f8f8f5' }}>
                      <div>
                        <p className="text-sm font-medium" style={{ color: '#2b2b2b' }}>{item.title}</p>
                        <p className="text-xs" style={{ color: '#888' }}>{item.subtitle}</p>
                      </div>
                      <span className="text-xs" style={{ color: '#aaa' }}>{item.time}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f0f0ec' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#7ecfc0' }} />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
