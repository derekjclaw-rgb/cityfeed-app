'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutGrid, ClipboardList,
  DollarSign, Loader2, Heart, CreditCard, MapPin, Image as ImageIcon, CheckCircle, X, MessageCircle, Megaphone
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
  savedListings: number
}

interface PendingPayout {
  totalAmount: number
  estimatedDate: string
}

interface PayoutLineItem {
  bookingId: string
  listingTitle: string
  amount: number
  status: 'paid' | 'pending'
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

interface HostBooking {
  id: string
  listing_title: string
  listing_id: string
  listing_image?: string
  status: string
  start_date: string
  end_date: string
  total_price: number
  advertiser_name?: string
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

/** Derive a human-readable confirmation code from a booking UUID */
function confirmationCode(bookingId: string): string {
  return 'CF-' + bookingId.replace(/-/g, '').substring(0, 6).toUpperCase()
}

/** Returns true if campaign is currently live (between start/end dates with approved POP) */
function isCampaignLive(status: string, startDate: string, endDate: string): boolean {
  if (!['confirmed', 'active', 'completed'].includes(status)) return false
  const now = new Date()
  const start = startDate ? new Date(startDate + 'T00:00:00') : null
  const end = endDate ? new Date(endDate + 'T00:00:00') : null // Campaign is LIVE through end of last day
  return !!(start && end && now >= start && now <= end)
}

function isCampaignComplete(status: string, endDate: string): boolean {
  if (status !== 'completed') return false
  // Only complete once the end date has fully passed
  const now = new Date()
  const end = endDate ? new Date(endDate + 'T00:00:00') : null
  return !!(end && now > end)
}

function isCampaignConfirmed(status: string, startDate: string): boolean {
  // Confirmed = campaign hasn't started yet regardless of status (handles early POP uploads)
  if (!['confirmed', 'pending', 'completed', 'active'].includes(status)) return false
  const now = new Date()
  const start = startDate ? new Date(startDate + 'T00:00:00') : null
  return !!(start && now < start)
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending Review',
  confirmed: 'Confirmed',
  active: 'Active — Live',
  pop_pending: 'Proof of Posting Submitted',
  pop_review: 'Proof of Posting Review',
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
  const [hostBookings, setHostBookings] = useState<HostBooking[]>([])
  const [pendingPayout, setPendingPayout] = useState<PendingPayout | null>(null)
  const [payoutLineItems, setPayoutLineItems] = useState<PayoutLineItem[]>([])
  const [payoutsExpanded, setPayoutsExpanded] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
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
    setHostBookings([])
    setActivity([])
    setActionBanner(null)
    setPendingPayout(null)
    setPayoutLineItems([])
    setPayoutsExpanded(false)
    setUnreadCount(0)

    const supabase = createClient()
    const isHost = currentMode === 'host'

    try {
      if (isHost) {
        const [listingsRes, bookingsRes, messagesRes, popRes] = await Promise.all([
          supabase.from('listings').select('id, title, city, state, status, images, price_per_day, category', { count: 'exact' }).eq('host_id', uid).eq('status', 'active'),
          supabase.from('bookings').select(`
            id, total_price, payout_amount, stripe_transfer_id, status, start_date, end_date, listing_id,
            listings(title, images),
            advertiser:profiles!bookings_advertiser_id_fkey(full_name)
          `).eq('host_id', uid).in('status', ['active', 'confirmed', 'pending', 'completed', 'pop_pending', 'pop_review']).order('created_at', { ascending: false }).limit(10),
          supabase.from('messages').select('id', { count: 'exact' }).neq('sender_id', uid).eq('read', false),
          supabase.from('bookings').select('id', { count: 'exact' }).eq('host_id', uid).eq('status', 'pop_pending'),
        ])

        const { data: allListings } = await supabase
          .from('listings')
          .select('id, title, city, state, status, images, price_per_day, category')
          .eq('host_id', uid)
          .order('created_at', { ascending: false })
          .limit(5)
        setHostListings((allListings ?? []) as HostListing[])

        // Set host bookings with listing images for the bookings section
        const nowTs = new Date()

        function fmtAdvertiserName(fullName: string | undefined): string {
          if (!fullName) return 'Advertiser'
          const parts = fullName.trim().split(/\s+/)
          if (parts.length === 1) return parts[0]
          return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setHostBookings((bookingsRes.data ?? []).slice(0, 5).map((b: any) => ({
          id: b.id,
          listing_title: b.listings?.title ?? 'Listing',
          listing_id: b.listing_id,
          listing_image: b.listings?.images?.[0] ?? undefined,
          status: b.status,
          start_date: b.start_date,
          end_date: b.end_date,
          total_price: b.total_price,
          advertiser_name: fmtAdvertiserName(b.advertiser?.full_name),
        })))

        const earnings = bookingsRes.data?.reduce((sum, b) => {
          // Only count completed bookings as real earnings
          if (b.status === 'completed') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return sum + ((b as any).payout_amount ?? (b.total_price || 0) * 0.93)
          }
          return sum
        }, 0) ?? 0

        // Pending payouts: completed bookings (build line items for all completed bookings)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const completedBookings = (bookingsRes.data ?? []).filter((b: any) => b.status === 'completed')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pendingPayoutBookings = completedBookings.filter((b: any) => {
          const start = b.start_date ? new Date(b.start_date) : null
          const end = b.end_date ? new Date(b.end_date.includes('T') ? b.end_date : b.end_date + 'T00:00:00') : null
          return start && end && nowTs >= start && nowTs <= end
        })
        // Build line items for display
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lineItems: PayoutLineItem[] = completedBookings.slice(0, 10).map((b: any) => {
          const price = b.total_price ?? 0
          const fee = Math.round(price / 1.07 * 0.07 * 100) / 100
          const payoutAmt = b.payout_amount ?? Math.round((price - fee) * 0.93 * 100) / 100
          const isLiveNow = (() => {
            const start = b.start_date ? new Date(b.start_date) : null
            const end = b.end_date ? new Date(b.end_date.includes('T') ? b.end_date : b.end_date + 'T00:00:00') : null
            return !!(start && end && nowTs >= start && nowTs <= end)
          })()
          const isPaid = !!b.payout_amount && !!b.stripe_transfer_id
          return {
            bookingId: b.id,
            listingTitle: b.listings?.title ?? 'Listing',
            amount: payoutAmt,
            status: isPaid ? 'paid' : 'pending',
          }
        })
        setPayoutLineItems(lineItems)
        if (pendingPayoutBookings.length > 0 || lineItems.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const totalPending = pendingPayoutBookings.reduce((sum: number, b: any) => {
            const price = b.total_price ?? 0
            const fee = Math.round(price / 1.07 * 0.07 * 100) / 100
            return sum + Math.round((price - fee) * 0.93 * 100) / 100
          }, 0)
          const totalAll = lineItems.reduce((sum, li) => sum + li.amount, 0)
          setPendingPayout({ totalAmount: Math.round((totalPending || totalAll) * 100) / 100, estimatedDate: 'Within 2 business days' })
        }

        const unread = messagesRes.count ?? 0
        setUnreadCount(unread)

        setStats({
          listings: listingsRes.count ?? 0,
          activeBookings: bookingsRes.data?.filter(b => ['active', 'confirmed', 'pop_pending', 'pop_review'].includes(b.status)).length ?? 0,
          earnings: Math.round(earnings),
          pendingPOP: popRes.count ?? 0,
          unreadMessages: unread,
          totalSpent: 0,
          pendingReviews: 0,
          savedListings: 0,
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
            // Check confirmed bookings for actual uploaded files
            const { data: confirmedHostBookings } = await supabase
              .from('bookings').select('id, listings(title)').eq('host_id', uid).eq('status', 'confirmed')
              .order('updated_at', { ascending: false }).limit(3)
            if (confirmedHostBookings && confirmedHostBookings.length > 0) {
              let collateralBookingId: string | null = null
              let collateralTitle: string | null = null
              for (const bk of confirmedHostBookings) {
                const { data: storageFiles } = await supabase.storage
                  .from('booking-collateral').list(`bookings/${bk.id}`, { limit: 1 })
                if (storageFiles && storageFiles.length > 0) {
                  collateralBookingId = bk.id
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  collateralTitle = (bk as any).listings?.title ?? 'a booking'
                  break
                }
              }
              if (collateralBookingId && collateralTitle) {
                setActionBanner({ message: `Creative may be ready for "${collateralTitle}" — check the booking`, href: `/dashboard/bookings/${collateralBookingId}`, cta: 'View Booking' })
              }
            }
          }
        } catch { /* non-critical */ }

      } else {
        // Advertiser
        const [bookingsRes, messagesRes, reviewsRes, savedRes] = await Promise.all([
          supabase.from('bookings').select(`
            id, total_price, status, start_date, end_date, listing_id,
            listings(title, images)
          `).eq('advertiser_id', uid).order('created_at', { ascending: false }),
          supabase.from('messages').select('id', { count: 'exact' }).neq('sender_id', uid).eq('read', false),
          supabase.from('bookings').select('id', { count: 'exact' }).eq('advertiser_id', uid).eq('status', 'pop_review'),
          supabase.from('favorites').select('id', { count: 'exact' }).eq('user_id', uid),
        ])

        const totalSpent = bookingsRes.data?.reduce((sum, b) => {
          if (b.status === 'confirmed' || b.status === 'active' || b.status === 'completed') return sum + (b.total_price || 0)
          return sum
        }, 0) ?? 0

        // Active campaigns = confirmed + pending + LIVE (completed but within date range)
        const now = new Date()
        const activeCampaignsCount = bookingsRes.data?.filter(b => {
          if (b.status === 'confirmed' || b.status === 'pending') return true
          if (b.status === 'completed') {
            const start = b.start_date ? new Date(b.start_date) : null
            const end = b.end_date ? new Date(b.end_date) : null
            return !!(start && end && now >= start && now <= end)
          }
          return false
        }).length ?? 0

        const unreadAdv = messagesRes.count ?? 0
        setUnreadCount(unreadAdv)
        setStats({
          listings: 0,
          activeBookings: activeCampaignsCount,
          earnings: 0,
          pendingPOP: 0,
          unreadMessages: unreadAdv,
          totalSpent: Math.round(totalSpent),
          pendingReviews: reviewsRes.count ?? 0,
          savedListings: savedRes.count ?? 0,
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
            let collateralBookingId: string | null = null
            let noCollateralBookingId: string | null = null
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let noCollateralTitle: string | null = null
            for (const bk of confirmedBookings) {
              const { data: storageFiles } = await supabase.storage.from('booking-collateral').list(`bookings/${bk.id}`)
              if (storageFiles && storageFiles.length > 0) {
                collateralBookingId = bk.id
                break
              } else if (!noCollateralBookingId) {
                noCollateralBookingId = bk.id
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                noCollateralTitle = (bk as any).listings?.title ?? 'your listing'
              }
            }
            if (collateralBookingId) {
              setActionBanner({ message: `Creative files are with the host — stand by for Proof of Posting`, href: `/dashboard/messages/${collateralBookingId}`, cta: 'Message Host' })
            } else if (noCollateralBookingId) {
              setActionBanner({ message: `Upload your creative for "${noCollateralTitle}"`, href: `/dashboard/bookings/${noCollateralBookingId}`, cta: 'Upload Creative' })
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
        subtitle: `Status: ${STATUS_LABELS[b.status] ?? b.status}`,
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
            {/* ── ADVERTISER: Zero State ───────────────────────────────── */}
            {!isHost && campaigns.length === 0 && !dataLoading && (
              <div className="rounded-2xl p-10 mb-8 flex flex-col items-center text-center"
                style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                  style={{ backgroundColor: 'rgba(222,187,115,0.12)', border: '1px solid rgba(222,187,115,0.3)' }}>
                  <Megaphone className="w-8 h-8" style={{ color: '#debb73' }} />
                </div>
                <h2 className="text-lg font-bold mb-2" style={{ color: '#2b2b2b' }}>No campaigns yet</h2>
                <p className="text-sm mb-6 max-w-xs" style={{ color: '#888' }}>
                  Your booked campaigns will appear here. Browse the marketplace to find your first ad placement.
                </p>
                <Link
                  href="/marketplace"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#debb73', color: '#2b2b2b' }}
                >
                  Browse Marketplace →
                </Link>
              </div>
            )}

            {/* ── ADVERTISER: My Campaigns ─────────────────────────────── */}
            {!isHost && campaigns.length > 0 && (() => {
              const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'
              // Three simple buckets: Confirmed (upcoming), Active/LIVE (running now), Complete (past)
              // Three buckets: Active (running now), Confirmed (future), Complete (past)
              // Mutually exclusive buckets — checked in priority order
              const liveCampaigns = campaigns.filter(c => isCampaignLive(c.status, c.start_date, c.end_date))
              const confirmedCampaigns = campaigns.filter(c => !isCampaignLive(c.status, c.start_date, c.end_date) && (isCampaignConfirmed(c.status, c.start_date) || c.status === 'pending'))
              const completedCampaigns = campaigns.filter(c => !isCampaignLive(c.status, c.start_date, c.end_date) && !isCampaignConfirmed(c.status, c.start_date) && c.status !== 'pending' && c.status !== 'cancelled' && isCampaignComplete(c.status, c.end_date))
              const cancelledCampaigns = campaigns.filter(c => c.status === 'cancelled')

              function CampaignCard({ campaign }: { campaign: Campaign }) {
                const isLive = isCampaignLive(campaign.status, campaign.start_date, campaign.end_date)
                const isFuture = isCampaignConfirmed(campaign.status, campaign.start_date)
                const isComplete = campaign.status === 'completed' && !isLive && !isFuture
                const sc = isLive ? STATUS_COLORS.live : (STATUS_COLORS[campaign.status] ?? { bg: '#f8f8f5', text: '#888' })
                return (
                  <div className="rounded-2xl overflow-hidden transition-all hover:shadow-md"
                    style={{ backgroundColor: '#fff', border: isLive ? '1px solid #86efac' : '1px solid #e0e0d8', boxShadow: isLive ? '0 1px 8px rgba(34,197,94,0.12)' : '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <Link href={`/dashboard/bookings/${campaign.id}`}>
                      <div className="p-4 flex items-center gap-4 cursor-pointer">
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
                                {isComplete ? 'Completed ✓' : isFuture ? 'Confirmed' : (STATUS_LABELS[campaign.status] ?? campaign.status)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs" style={{ color: '#888' }}>
                            {fmt(campaign.start_date)} — {fmt(campaign.end_date)}
                            {campaign.total_price ? ` · $${campaign.total_price.toFixed(2)}` : ''}
                          </p>
                          <p className="text-xs font-mono font-semibold mt-0.5" style={{ color: '#7ecfc0' }}>{confirmationCode(campaign.id)}</p>
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
                    {isComplete && campaign.listing_id && (
                      <div className="px-4 pb-3 pt-0">
                        <Link
                          href={`/marketplace/${campaign.listing_id}/book`}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity"
                          style={{ backgroundColor: 'rgba(222,187,115,0.15)', color: '#b8941a', border: '1px solid rgba(222,187,115,0.4)' }}
                          onClick={e => e.stopPropagation()}
                        >
                          🔁 Book Again
                        </Link>
                      </div>
                    )}
                  </div>
                )
              }

              return (
                <div className="mb-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold" style={{ color: '#2b2b2b' }}>My Campaigns</h2>
                    <Link href="/dashboard/bookings" className="text-xs font-medium hover:underline" style={{ color: '#7ecfc0' }}>View all</Link>
                  </div>

                  {/* LIVE group */}
                  {liveCampaigns.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
                        <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: '#15803d' }}>Active</h3>
                      </div>
                      <div className="space-y-3">
                        {liveCampaigns.map(c => <CampaignCard key={c.id} campaign={c} />)}
                      </div>
                    </div>
                  )}

                  {/* Confirmed group (future bookings) */}
                  {confirmedCampaigns.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#1d4ed8' }}>Confirmed</h3>
                      <div className="space-y-3">
                        {confirmedCampaigns.map(c => <CampaignCard key={c.id} campaign={c} />)}
                      </div>
                    </div>
                  )}

                  {/* Completed group */}
                  {completedCampaigns.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#888' }}>Completed</h3>
                      <div className="space-y-3">
                        {completedCampaigns.map(c => <CampaignCard key={c.id} campaign={c} />)}
                      </div>
                    </div>
                  )}

                  {/* Cancelled group — collapsed */}
                  {cancelledCampaigns.length > 0 && completedCampaigns.length === 0 && (
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#888' }}>Cancelled</h3>
                      <div className="space-y-3">
                        {cancelledCampaigns.slice(0, 2).map(c => <CampaignCard key={c.id} campaign={c} />)}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* ── HOST: Zero State (no listings yet) ───────────────────── */}
            {isHost && stats && hostListings.length === 0 && !dataLoading && (
              <div className="rounded-2xl p-10 mb-8 flex flex-col items-center text-center"
                style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                  style={{ backgroundColor: 'rgba(126,207,192,0.12)', border: '1px solid rgba(126,207,192,0.3)' }}>
                  <LayoutGrid className="w-8 h-8" style={{ color: '#7ecfc0' }} />
                </div>
                <h2 className="text-lg font-bold mb-2" style={{ color: '#2b2b2b' }}>No listings yet</h2>
                <p className="text-sm mb-6 max-w-xs" style={{ color: '#888' }}>
                  Your ad placements will show here once listed. Create your first listing to start earning.
                </p>
                <Link
                  href="/dashboard/create-listing"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#debb73', color: '#2b2b2b' }}
                >
                  Create a Listing →
                </Link>
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

            {/* ── HOST: Bookings section ────────────────────────────────── */}
            {isHost && (() => {
              const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'
              const liveBookings = hostBookings.filter(b => isCampaignLive(b.status, b.start_date, b.end_date))
              const confirmedBookings = hostBookings.filter(b => !isCampaignLive(b.status, b.start_date, b.end_date) && (isCampaignConfirmed(b.status, b.start_date) || b.status === 'pending'))
              const completedBookings = hostBookings.filter(b => !isCampaignLive(b.status, b.start_date, b.end_date) && !isCampaignConfirmed(b.status, b.start_date) && b.status !== 'pending' && b.status !== 'cancelled' && isCampaignComplete(b.status, b.end_date))

              function HostBookingCard({ booking }: { booking: HostBooking }) {
                const isLive = isCampaignLive(booking.status, booking.start_date, booking.end_date)
                const isFuture = isCampaignConfirmed(booking.status, booking.start_date)
                const isComplete = booking.status === 'completed' && !isLive && !isFuture
                const sc = isLive ? STATUS_COLORS.live : (STATUS_COLORS[booking.status] ?? { bg: '#f8f8f5', text: '#888' })
                return (
                  <div className="rounded-2xl overflow-hidden transition-all hover:shadow-md"
                    style={{ backgroundColor: '#fff', border: isLive ? '1px solid #86efac' : '1px solid #e0e0d8', boxShadow: isLive ? '0 1px 8px rgba(34,197,94,0.12)' : '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <Link href={`/dashboard/bookings/${booking.id}`}>
                      <div className="p-4 flex items-center gap-4 cursor-pointer">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-sm truncate" style={{ color: '#2b2b2b' }}>{booking.listing_title}</h3>
                            {isLive ? (
                              <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1"
                                style={{ backgroundColor: '#dcfce7', color: '#15803d' }}>
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                                LIVE
                              </span>
                            ) : (
                              <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: sc.bg, color: sc.text }}>
                                {isComplete ? 'Completed ✓' : isFuture ? 'Confirmed' : (STATUS_LABELS[booking.status] ?? booking.status)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs" style={{ color: '#888' }}>
                            {booking.advertiser_name && <><span style={{ color: '#555' }}>{booking.advertiser_name}</span> · </>}
                            {fmt(booking.start_date)} — {fmt(booking.end_date)}
                            {booking.total_price ? ` · $${booking.total_price.toFixed(2)}` : ''}
                          </p>
                          <p className="text-xs font-mono font-semibold mt-0.5" style={{ color: '#7ecfc0' }}>{confirmationCode(booking.id)}</p>
                        </div>
                        {booking.listing_image ? (
                          <img src={booking.listing_image} alt={booking.listing_title} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" style={{ border: '1px solid #e0e0d8' }} />
                        ) : (
                          <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f8f8f5', border: '1px solid #e0e0d8' }}>
                            <ImageIcon className="w-5 h-5" style={{ color: '#ccc' }} />
                          </div>
                        )}
                      </div>
                    </Link>
                  </div>
                )
              }

              return (
                <div className="mb-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold" style={{ color: '#2b2b2b' }}>Bookings</h2>
                    <Link href="/dashboard/bookings" className="text-xs font-medium hover:underline" style={{ color: '#7ecfc0' }}>View all</Link>
                  </div>

                  {hostBookings.length === 0 ? (
                    <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8' }}>
                      <p className="text-sm" style={{ color: '#aaa' }}>No bookings yet</p>
                    </div>
                  ) : (
                    <>
                      {liveBookings.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
                            <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: '#15803d' }}>Active</h3>
                          </div>
                          <div className="space-y-3">
                            {liveBookings.map(b => <HostBookingCard key={b.id} booking={b} />)}
                          </div>
                        </div>
                      )}
                      {confirmedBookings.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#1d4ed8' }}>Confirmed</h3>
                          <div className="space-y-3">
                            {confirmedBookings.map(b => <HostBookingCard key={b.id} booking={b} />)}
                          </div>
                        </div>
                      )}
                      {completedBookings.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#888' }}>Complete</h3>
                          <div className="space-y-3">
                            {completedBookings.slice(0, 3).map(b => <HostBookingCard key={b.id} booking={b} />)}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })()}

            {/* ── HOST: Pending Payouts Tile (prominent, above stats) ───── */}
            {isHost && pendingPayout && pendingPayout.totalAmount > 0 && (
              <div className="rounded-2xl mb-6 overflow-hidden"
                style={{ backgroundColor: '#fffbeb', border: '2px solid #fde68a', boxShadow: '0 4px 16px rgba(234,179,8,0.18)' }}>
                <button
                  onClick={() => setPayoutsExpanded(v => !v)}
                  className="w-full p-5 flex items-center gap-4 text-left hover:bg-yellow-50 transition-colors"
                >
                  <div className="p-3 rounded-xl flex-shrink-0" style={{ backgroundColor: 'rgba(234,179,8,0.18)' }}>
                    <DollarSign className="w-6 h-6" style={{ color: '#d97706' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold" style={{ color: '#92400e' }}>
                      💰 Payouts: ${pendingPayout.totalAmount.toFixed(2)}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#b45309' }}>
                      {pendingPayout.estimatedDate} · Tap to see details
                    </p>
                  </div>
                  <span className="text-lg" style={{ color: '#d97706', transition: 'transform 0.2s', transform: payoutsExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
                </button>
                {payoutsExpanded && payoutLineItems.length > 0 && (
                  <div className="px-5 pb-5 pt-0 space-y-2">
                    <div className="h-px mb-3" style={{ backgroundColor: '#fde68a' }} />
                    {payoutLineItems.map(item => (
                      <div key={item.bookingId} className="flex items-center justify-between py-2 px-3 rounded-xl"
                        style={{ backgroundColor: 'rgba(255,255,255,0.6)', border: '1px solid rgba(253,230,138,0.6)' }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: '#2b2b2b' }}>{item.listingTitle}</p>
                          <p className="text-xs" style={{ color: '#888' }}>${item.amount.toFixed(2)}</p>
                        </div>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full ml-2 flex-shrink-0"
                          style={
                            item.status === 'paid'
                              ? { backgroundColor: '#dcfce7', color: '#16a34a' }
                              : { backgroundColor: '#fef9ec', color: '#b45309' }
                          }>
                          {item.status === 'paid' ? 'Paid ✓' : 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Stats Row ─────────────────────────────────────────────── */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {isHost ? (
                  <>
                    <StatCard label="Earnings (completed)" value={stats.earnings.toLocaleString()} icon={DollarSign} prefix="$" color="#16a34a" />
                    <Link href="/dashboard/messages" className="relative">
                      <StatCard label="Messages" value={stats.unreadMessages || 0} icon={MessageCircle} color={stats.unreadMessages > 0 ? '#E63946' : undefined} />
                      {stats.unreadMessages > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: '#E63946' }} />}
                    </Link>
                    <StatCard label="Active Bookings" value={stats.activeBookings} icon={ClipboardList} />
                    <StatCard label="Listings" value={stats.listings} icon={LayoutGrid} />
                  </>
                ) : (
                  <>
                    <StatCard label="Active Campaigns" value={stats.activeBookings} icon={ClipboardList} />
                    <Link href="/dashboard/messages" className="relative">
                      <StatCard label="Messages" value={stats.unreadMessages || 0} icon={MessageCircle} color={stats.unreadMessages > 0 ? '#E63946' : undefined} />
                      {stats.unreadMessages > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: '#E63946' }} />}
                    </Link>
                    <StatCard label="Total Spent" value={stats.totalSpent.toLocaleString()} icon={DollarSign} prefix="$" color="#16a34a" />
                    <StatCard label="Saved Listings" value={stats.savedListings} icon={Heart} />
                  </>
                )}
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
