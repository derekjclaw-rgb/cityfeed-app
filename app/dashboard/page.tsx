'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getBookingFinancials } from '@/lib/fees'
import {
  Calendar, Camera, FilePlus, MessageSquare, Activity, Bookmark, CheckCircle2,
  ChevronRight, DollarSign, FileText, RotateCcw, Loader2,
  CheckCircle, X, Image as ImageIcon, Search,
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────

type DashMode = 'advertiser' | 'host'

interface Profile {
  id: string
  full_name: string
  email: string
  role: string
  avatar_url?: string
}

interface Booking {
  id: string
  listing_title: string
  listing_id: string
  listing_image?: string
  status: string
  start_date: string
  end_date: string
  total_price: number
  confirmation_code: string
  advertiser_name?: string
}

interface Notification {
  id: string
  type: string
  title: string
  body?: string
  href?: string
  created_at: string
}

interface CampaignCard {
  id: string
  listing_title: string
  listing_image?: string
  status: string
  start_date: string
  end_date: string
  step: number
  stepLabel: string
  progressPercent: number
  isLive: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function confirmationCode(bookingId: string): string {
  return 'CF-' + bookingId.replace(/-/g, '').substring(0, 6).toUpperCase()
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDate(d: string): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatFullDate(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function isCampaignLive(status: string, _startDate: string, endDate: string): boolean {
  if (status !== 'completed') return false
  const now = new Date()
  const end = endDate ? new Date(endDate + 'T23:59:59') : null
  // Live = POP submitted (status completed) and campaign hasn't ended yet
  // Covers early POP (before start date) — host went live early
  return !!(end && now <= end)
}

function isCampaignComplete(status: string, endDate: string): boolean {
  if (status !== 'completed') return false
  const now = new Date()
  const end = endDate ? new Date(endDate + 'T00:00:00') : null
  return !!(end && now > end)
}

function isCampaignConfirmed(status: string, startDate: string): boolean {
  if (!['confirmed', 'pending', 'active'].includes(status)) return false
  const now = new Date()
  const start = startDate ? new Date(startDate + 'T00:00:00') : null
  return !!(start && now < start)
}

function getStatusPill(status: string): { label: string; bg: string; color: string; dotColor: string } {
  switch (status) {
    case 'live': return { label: 'Live', bg: 'var(--green-light, #e8f5ec)', color: 'var(--green, #16a34a)', dotColor: 'var(--green, #16a34a)' }
    case 'confirmed': return { label: 'Confirmed', bg: 'var(--mint-light, #e8f6f3)', color: 'var(--mint-dark, #5bb8a8)', dotColor: 'var(--mint-dark, #5bb8a8)' }
    case 'pending': return { label: 'Pending', bg: 'var(--gold-light, #f5edda)', color: 'var(--gold-dark, #c9a54e)', dotColor: 'var(--gold-dark, #c9a54e)' }
    case 'completed': return { label: 'Completed', bg: 'var(--light-gray, #f8f8f5)', color: 'var(--text-tertiary, #9a9a90)', dotColor: 'var(--text-tertiary, #9a9a90)' }
    default: return { label: status, bg: 'var(--light-gray, #f8f8f5)', color: 'var(--text-tertiary, #9a9a90)', dotColor: 'var(--text-tertiary, #9a9a90)' }
  }
}

function campaignStep(status: string, startDate: string, endDate: string, hasCreative?: boolean): { step: number; label: string; percent: number; displayStatus: string } {
  if (isCampaignLive(status, startDate, endDate)) return { step: 5, label: 'Live', percent: 83, displayStatus: 'live' }
  if (isCampaignComplete(status, endDate)) return { step: 6, label: 'Complete', percent: 100, displayStatus: 'completed' }
  if (status === 'confirmed' && hasCreative) return { step: 4, label: 'Awaiting Posting', percent: 67, displayStatus: 'confirmed' }
  if (isCampaignConfirmed(status, startDate)) {
    if (status === 'pending') return { step: 2, label: 'Awaiting Approval', percent: 33, displayStatus: 'pending' }
    return { step: 3, label: 'Creative Upload', percent: 50, displayStatus: 'confirmed' }
  }
  if (status === 'pending') return { step: 2, label: 'Awaiting Approval', percent: 33, displayStatus: 'pending' }
  if (status === 'confirmed') return { step: 3, label: 'Creative Upload', percent: 50, displayStatus: 'confirmed' }
  return { step: 1, label: 'Booked', percent: 17, displayStatus: status }
}

function timelineIcon(type: string): { Icon: React.ElementType; dotClass: string } {
  switch (type) {
    case 'collateral_uploaded':
    case 'creative_upload': return { Icon: FileText, dotClass: 'mint' }
    case 'booking_confirmed':
    case 'booking_approved':
    case 'new_booking': return { Icon: CheckCircle2, dotClass: 'gold' }
    case 'payment':
    case 'pop_approved': return { Icon: DollarSign, dotClass: 'green' }
    case 'new_message': return { Icon: MessageSquare, dotClass: 'mint' }
    case 'pop_submitted':
    case 'campaign_completed': return { Icon: RotateCcw, dotClass: 'gold' }
    default: return { Icon: Activity, dotClass: 'mint' }
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Role relevance for activity timeline — keeps advertiser/host activity separated per view
const HOST_ONLY_TYPES = new Set([
  'new_booking', 'payout_initiated', 'pop_reminder_36h', 'pop_reminder_morning',
  'pop_approved', 'pop_submitted_host', 'collateral_uploaded', 'booking_accepted_host',
  'materials_shipped', 'account_onboarding', 'pop_reminder',
])
const ADVERTISER_ONLY_TYPES = new Set([
  'booking_request_submitted', 'booking_confirmed', 'booking_approved_advertiser',
  'booking_declined', 'creative_reminder_36h', 'creative_reminder', 'collateral_reminder',
  'pop_submitted', 'creative_submitted', 'creative_submitted_advertiser', 'materials_received',
])
function isRelevantToMode(type: string, mode: 'advertiser' | 'host'): boolean {
  if (mode === 'advertiser') return !HOST_ONLY_TYPES.has(type)
  return !ADVERTISER_ONLY_TYPES.has(type)
}

function formatActivityBody(text: string): string {
  // "From Mike Kot" → "From Mike K.", also handles by/for/to prefixes
  return text.replace(
    /\b(From|from|By|by|For|for|To|to)\s+([A-Z][a-z]+)\s+([A-Z][a-zA-Z]+)\b/g,
    (_, prefix, first, last) => `${prefix} ${first} ${last.charAt(0)}.`
  )
}

// ─── Dashboard Content ────────────────────────────────────────────────────────

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [mode, setMode] = useState<DashMode>('advertiser')
  const [modeReady, setModeReady] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const [stripeSuccess, setStripeSuccess] = useState(false)

  // Quick action counts
  const [bookingsNeedAttention, setBookingsNeedAttention] = useState(0)
  const [creativesToUpload, setCreativesToUpload] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)

  // Status chips
  const [activeCampaigns, setActiveCampaigns] = useState(0)
  const [savedListings, setSavedListings] = useState(0)
  const [placementsThisMonth, setPlacementsThisMonth] = useState(0)

  // Host-specific status chip counts
  const [hostConfirmedCount, setHostConfirmedCount] = useState(0)
  const [hostActiveCount, setHostActiveCount] = useState(0)
  const [hostTotalPlacements, setHostTotalPlacements] = useState(0)

  // Sections
  const [campaignCards, setCampaignCards] = useState<CampaignCard[]>([])
  const [recentBookings, setRecentBookings] = useState<Booking[]>([])
  const [timeline, setTimeline] = useState<Notification[]>([])
  const [hostAction, setHostAction] = useState<{ message: string; href: string } | null>(null)
  const [popNeeded, setPopNeeded] = useState(0)

  // Finance
  const [totalSpent, setTotalSpent] = useState(0)
  const [avgPerPlacement, setAvgPerPlacement] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const [totalEarned, setTotalEarned] = useState(0)
  const [avgPerListing, setAvgPerListing] = useState(0)
  const [hostBookingCount, setHostBookingCount] = useState(0)

  // ── Stripe success ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (searchParams.get('stripe_success') === 'true') {
      setStripeSuccess(true)
      const url = new URL(window.location.href)
      url.searchParams.delete('stripe_success')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams])

  // ── Auth + Profile ──────────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, avatar_url')
        .eq('id', user.id)
        .single()

      setProfile(profileData)
      setUserId(user.id)

      const saved = localStorage.getItem('cf_dash_mode') as DashMode | null
      if (saved === 'host' || saved === 'advertiser') {
        setMode(saved)
      } else {
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

  // ── Listen for mode changes from sidebar ────────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as DashMode
      if (detail === 'host' || detail === 'advertiser') setMode(detail)
    }
    window.addEventListener('cf_mode_change', handler)
    return () => window.removeEventListener('cf_mode_change', handler)
  }, [])

  // ── Mode toggle handler (also available from this page) ─────────────────────
  const handleModeChange = useCallback(async (newMode: DashMode) => {
    setMode(newMode)
    localStorage.setItem('cf_dash_mode', newMode)
    window.dispatchEvent(new CustomEvent('cf_mode_change', { detail: newMode }))

    if (newMode === 'host' && profile && profile.role === 'advertiser') {
      const supabase = createClient()
      await supabase.from('profiles').update({ role: 'both' }).eq('id', profile.id)
      setProfile(prev => prev ? { ...prev, role: 'both' } : prev)
    }
  }, [profile])

  // ── Fetch all dashboard data ────────────────────────────────────────────────
  const fetchData = useCallback(async (currentMode: DashMode, uid: string) => {
    setDataLoading(true)
    const supabase = createClient()
    const isHost = currentMode === 'host'

    try {
      // ── All bookings ──────────────────────────────────────────────────────
      const { data: allBookings } = await supabase
        .from('bookings')
        .select(`
          id, total_price, subtotal, buyer_fee, seller_fee, print_fee_charged, payout_amount, status, start_date, end_date, listing_id,
          listings(title, images),
          advertiser:profiles!bookings_advertiser_id_fkey(full_name)
        `)
        .eq(isHost ? 'host_id' : 'advertiser_id', uid)
        .order('created_at', { ascending: false })

      const bookings = allBookings ?? []

      // ── Messages count ────────────────────────────────────────────────────
      const { count: msgCount } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .neq('sender_id', uid)
        .eq('read', false)
      setUnreadMessages(msgCount ?? 0)

      // ── Bookings needing attention ────────────────────────────────────────
      const attentionStatuses = isHost ? ['pending', 'pop_pending'] : ['pending', 'pop_review']
      const needAttention = bookings.filter(b => attentionStatuses.includes(b.status)).length
      setBookingsNeedAttention(needAttention)

      // ── Check creative files for all confirmed bookings ─
      const now = new Date()
      const confirmedBookings = bookings.filter(b => {
        if (b.status !== 'confirmed') return false
        // Exclude stale bookings past their end date
        const endDate = b.end_date ? new Date(b.end_date + 'T23:59:59') : null
        return !endDate || now <= endDate
      })
      const hasCreativeMap = new Map<string, boolean>()
      let creativesNeeded = 0
      for (const bk of confirmedBookings) {
        try {
          const { data: files } = await supabase.storage
            .from('booking-collateral')
            .list(`bookings/${bk.id}`, { limit: 1 })
          const hasFiles = !!(files && files.length > 0)
          hasCreativeMap.set(bk.id, hasFiles)
          if (!hasFiles) creativesNeeded++
        } catch {
          hasCreativeMap.set(bk.id, false)
          creativesNeeded++
        }
      }
      setCreativesToUpload(creativesNeeded)

      // ── Saved listings ────────────────────────────────────────────────────
      const { count: savedCount } = await supabase
        .from('favorites')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', uid)
      setSavedListings(savedCount ?? 0)

      // ── Active campaigns count ────────────────────────────────────────────
      const activeCount = bookings.filter(b => {
        if (b.status === 'confirmed' || b.status === 'pending') return true
        // Completed = POP submitted. Live until end date (even if started early)
        if (b.status === 'completed') {
          const end = b.end_date ? new Date(b.end_date + 'T23:59:59') : null
          return !!(end && now <= end)
        }
        return false
      }).length
      setActiveCampaigns(activeCount)

      // ── Placements this month ─────────────────────────────────────────────
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const thisMonthCount = bookings.filter(b => {
        return b.start_date && new Date(b.start_date) >= monthStart && ['confirmed', 'completed', 'active'].includes(b.status)
      }).length
      setPlacementsThisMonth(thisMonthCount)

      // ── Host-specific status chips ────────────────────────────────────────
      if (isHost) {
        // ── Host priority action ──────────────────────────────────────────
        const bookingsWithCreative = confirmedBookings.filter(b => hasCreativeMap.get(b.id))
        setPopNeeded(bookingsWithCreative.length)
        if (bookingsWithCreative.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const firstBk = bookingsWithCreative[0] as any
          setHostAction({
            message: `Creative files received for "${firstBk.listings?.title ?? 'a booking'}" — upload proof of posting`,
            href: `/dashboard/bookings/${firstBk.id}`,
          })
        } else if (needAttention > 0) {
          setHostAction({
            message: `You have ${needAttention} booking${needAttention > 1 ? 's' : ''} to review`,
            href: '/dashboard/bookings',
          })
        } else {
          setHostAction(null)
        }

        const confirmedCt = bookings.filter(b => b.status === 'confirmed').length
        setHostConfirmedCount(confirmedCt)

        const activeCt = bookings.filter(b =>
          b.status === 'active' || isCampaignLive(b.status, b.start_date, b.end_date)
        ).length
        setHostActiveCount(activeCt)

        const totalNonCancelled = bookings.filter(b => b.status !== 'cancelled').length
        setHostTotalPlacements(totalNonCancelled)
      }

      // ── Campaign cards (active ones only, limit 4) ────────────────────────
      const activeBkgs = bookings.filter(b => {
        if (b.status === 'cancelled') return false
        if (isCampaignComplete(b.status, b.end_date)) return false
        return true
      }).slice(0, 4)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setCampaignCards(activeBkgs.map((b: any) => {
        const hasCreative = hasCreativeMap.get(b.id) ?? false
        const cs = campaignStep(b.status, b.start_date, b.end_date, hasCreative)
        return {
          id: b.id,
          listing_title: b.listings?.title ?? 'Listing',
          listing_image: b.listings?.images?.[0] ?? undefined,
          status: cs.displayStatus,
          start_date: b.start_date,
          end_date: b.end_date,
          step: cs.step,
          stepLabel: cs.label,
          progressPercent: cs.percent,
          isLive: isCampaignLive(b.status, b.start_date, b.end_date),
        }
      }))

      // ── Recent bookings (limit 4) ─────────────────────────────────────────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setRecentBookings(bookings.slice(0, 4).map((b: any) => ({
        id: b.id,
        listing_title: b.listings?.title ?? 'Listing',
        listing_id: b.listing_id,
        listing_image: b.listings?.images?.[0] ?? undefined,
        status: b.status,
        start_date: b.start_date,
        end_date: b.end_date,
        total_price: b.total_price,
        confirmation_code: confirmationCode(b.id),
        advertiser_name: (() => {
          const full = (b.advertiser?.full_name ?? '').trim()
          if (!full) return undefined
          const parts = full.split(/\s+/)
          return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0]
        })(),
      })))

      // ── Financial summary ─────────────────────────────────────────────────
      const paidBookings = bookings.filter(b => ['confirmed', 'active', 'completed'].includes(b.status))
      if (isHost) {
        // Host earnings — single source of truth (lib/fees.ts)
        const earned = paidBookings.reduce((sum, b) => sum + getBookingFinancials(b).hostPayout, 0)
        setTotalEarned(Math.round(earned))
        setHostBookingCount(paidBookings.length)
        setAvgPerListing(paidBookings.length > 0 ? Math.round(earned / paidBookings.length) : 0)
      } else {
        const spent = paidBookings.reduce((sum, b) => sum + (b.total_price || 0), 0)
        setTotalSpent(Math.round(spent))
        setCompletedCount(paidBookings.length)
        setAvgPerPlacement(paidBookings.length > 0 ? Math.round(spent / paidBookings.length) : 0)
      }


      // ── Activity timeline (from notifications) ────────────────────────────
      const { data: notifs } = await supabase
        .from('notifications')
        .select('id, type, title, body, href, created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(15)
      setTimeline(notifs ?? [])

    } catch {
      // non-critical
    }

    setDataLoading(false)
  }, [])

  useEffect(() => {
    if (modeReady && userId) fetchData(mode, userId)
  }, [mode, userId, modeReady, fetchData])

  // ── Real-time notifications subscription ────────────────────────────────────
  useEffect(() => {
    if (!userId) return
    const supabase = createClient()
    const channel = supabase
      .channel('dashboard-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const n = payload.new as Notification
          setTimeline(prev => [n, ...prev].slice(0, 5))
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--mint, #7ecfc0)' }} />
      </div>
    )
  }

  const firstName = profile?.full_name?.split(' ')[0] || ''
  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // Booking display status mapping
  function bookingDisplayStatus(b: Booking): string {
    if (isCampaignLive(b.status, b.start_date, b.end_date)) return 'live'
    if (isCampaignComplete(b.status, b.end_date)) return 'completed'
    if (isCampaignConfirmed(b.status, b.start_date)) return 'confirmed'
    if (b.status === 'pending') return 'pending'
    return b.status
  }

  return (
    <>
      {/* Stripe success toast */}
      {stripeSuccess && (
        <div className="rounded-xl px-5 py-4 mb-6 flex items-center justify-between gap-4"
          style={{ backgroundColor: 'var(--green-light, #e8f5ec)', border: '1px solid #bbf7d0' }}>
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--green, #16a34a)' }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--green, #16a34a)' }}>Bank account connected!</p>
              <p className="text-xs mt-0.5" style={{ color: '#15803d' }}>You&apos;re all set to receive payouts when campaigns complete.</p>
            </div>
          </div>
          <button onClick={() => setStripeSuccess(false)} className="hover:opacity-70">
            <X className="w-4 h-4" style={{ color: 'var(--green, #16a34a)' }} />
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════
           WELCOME SECTION
           ═══════════════════════════════════════ */}
      <div className="mb-8">
        <h1 className="text-[28px] font-bold tracking-[-0.5px] mb-1" style={{ color: 'var(--charcoal, #2b2b2b)' }}>
          {getGreeting()}, {firstName}
        </h1>
        <p className="text-[15px] font-normal" style={{ color: 'var(--text-secondary, #888)' }}>
          {formatFullDate()} — Las Vegas, NV
        </p>
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all hover:shadow-md hover:-translate-y-px"
          style={{ backgroundColor: 'var(--charcoal, #2b2b2b)', color: 'var(--cream, #f0f0ec)' }}
        >
          <Search className="w-4 h-4" />
          Browse Marketplace
        </Link>
      </div>

      {dataLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--mint, #7ecfc0)' }} />
        </div>
      )}

      {!dataLoading && (
        <>
          {/* ═══════════════════════════════════════
               HOST PRIORITY ACTION BAR
               ═══════════════════════════════════════ */}
          {mode === 'host' && hostAction && (
            <Link href={hostAction.href}>
              <div
                className="rounded-2xl px-5 py-4 mb-6 flex items-center justify-between gap-4 cursor-pointer transition-all hover:shadow-md hover:-translate-y-px"
                style={{ backgroundColor: 'var(--gold-light, #f5edda)', borderLeft: '4px solid var(--gold, #debb73)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-[38px] h-[38px] rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'var(--gold, #debb73)' }}>
                    <Camera className="w-[18px] h-[18px]" style={{ color: 'var(--charcoal, #2b2b2b)' }} />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--charcoal, #2b2b2b)' }}>
                    {hostAction.message}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--gold-dark, #c9a54e)' }} />
              </div>
            </Link>
          )}

          {/* ═══════════════════════════════════════
               QUICK ACTION CARDS
               ═══════════════════════════════════════ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-[14px] mb-9">
            {/* Bookings need attention */}
            <Link href="/dashboard/bookings" className="group">
              <div
                className="rounded-2xl p-5 flex items-start gap-[14px] transition-all hover:shadow-md hover:-translate-y-px cursor-pointer"
                style={{ backgroundColor: 'var(--white, #fff)', border: '1px solid var(--border, #e0e0d8)' }}
              >
                <div className="w-[42px] h-[42px] rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'var(--gold-light, #f5edda)' }}>
                  <Calendar className="w-5 h-5" style={{ color: 'var(--gold-dark, #c9a54e)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[22px] font-extrabold leading-tight tracking-[-0.5px] mb-[2px]">{bookingsNeedAttention}</div>
                  <div className="text-[13px] font-medium leading-snug" style={{ color: 'var(--text-secondary, #888)' }}>Bookings need attention</div>
                  <div className="text-xs font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--mint-dark, #5bb8a8)' }}>
                    Review now <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            </Link>

            {/* Creative files to upload (advertiser) / Proof of posting needed (host) */}
            <Link href="/dashboard/bookings" className="group">
              <div
                className="rounded-2xl p-5 flex items-start gap-[14px] transition-all hover:shadow-md hover:-translate-y-px cursor-pointer"
                style={{ backgroundColor: 'var(--white, #fff)', border: '1px solid var(--border, #e0e0d8)' }}
              >
                <div className="w-[42px] h-[42px] rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'var(--mint-light, #e8f6f3)' }}>
                  {mode === 'host' ? (
                    <Camera className="w-5 h-5" style={{ color: 'var(--mint-dark, #5bb8a8)' }} />
                  ) : (
                    <FilePlus className="w-5 h-5" style={{ color: 'var(--mint-dark, #5bb8a8)' }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[22px] font-extrabold leading-tight tracking-[-0.5px] mb-[2px]">{mode === 'host' ? popNeeded : creativesToUpload}</div>
                  <div className="text-[13px] font-medium leading-snug" style={{ color: 'var(--text-secondary, #888)' }}>{mode === 'host' ? 'Proof of posting needed' : 'Creative files to upload'}</div>
                  <div className="text-xs font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--mint-dark, #5bb8a8)' }}>
                    {mode === 'host' ? 'Upload POP' : 'Upload now'} <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            </Link>

            {/* Unread messages */}
            <Link href="/dashboard/messages" className="group">
              <div
                className="rounded-2xl p-5 flex items-start gap-[14px] transition-all hover:shadow-md hover:-translate-y-px cursor-pointer"
                style={{ backgroundColor: 'var(--white, #fff)', border: '1px solid var(--border, #e0e0d8)' }}
              >
                <div className="w-[42px] h-[42px] rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: '#fce8ea' }}>
                  <MessageSquare className="w-5 h-5" style={{ color: 'var(--red, #E63946)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[22px] font-extrabold leading-tight tracking-[-0.5px] mb-[2px]">{unreadMessages}</div>
                  <div className="text-[13px] font-medium leading-snug" style={{ color: 'var(--text-secondary, #888)' }}>Unread messages</div>
                  <div className="text-xs font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--mint-dark, #5bb8a8)' }}>
                    Open inbox <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* ═══════════════════════════════════════
               STATUS CHIPS ROW
               ═══════════════════════════════════════ */}
          <div className="flex flex-wrap gap-3 mb-9">
            {mode === 'host' ? (
              <>
                {/* Confirmed */}
                <div className="flex items-center gap-[10px] rounded-full px-5 py-[10px] pr-5 pl-[14px]"
                  style={{ backgroundColor: 'var(--white, #fff)', border: '1px solid var(--border, #e0e0d8)' }}>
                  <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'var(--mint-light, #e8f6f3)' }}>
                    <CheckCircle2 className="w-[14px] h-[14px]" style={{ color: 'var(--mint-dark, #5bb8a8)' }} />
                  </div>
                  <span className="text-base font-extrabold tracking-[-0.3px]">{hostConfirmedCount}</span>
                  <span className="text-[13px] font-normal" style={{ color: 'var(--text-secondary, #888)' }}>Confirmed</span>
                </div>

                {/* Active */}
                <div className="flex items-center gap-[10px] rounded-full px-5 py-[10px] pr-5 pl-[14px]"
                  style={{ backgroundColor: 'var(--white, #fff)', border: '1px solid var(--border, #e0e0d8)' }}>
                  <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'var(--green-light, #e8f5ec)' }}>
                    <Activity className="w-[14px] h-[14px]" style={{ color: 'var(--green, #16a34a)' }} />
                  </div>
                  <span className="text-base font-extrabold tracking-[-0.3px] flex items-center gap-1">
                    <span className="inline-block w-[7px] h-[7px] rounded-full animate-pulse" style={{ backgroundColor: 'var(--green, #16a34a)' }} />
                    {hostActiveCount}
                  </span>
                  <span className="text-[13px] font-normal" style={{ color: 'var(--text-secondary, #888)' }}>Active</span>
                </div>

                {/* Total Placements */}
                <div className="flex items-center gap-[10px] rounded-full px-5 py-[10px] pr-5 pl-[14px]"
                  style={{ backgroundColor: 'var(--white, #fff)', border: '1px solid var(--border, #e0e0d8)' }}>
                  <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#e8effd' }}>
                    <Calendar className="w-[14px] h-[14px]" style={{ color: 'var(--blue, #5b8def)' }} />
                  </div>
                  <span className="text-base font-extrabold tracking-[-0.3px]">{hostTotalPlacements}</span>
                  <span className="text-[13px] font-normal" style={{ color: 'var(--text-secondary, #888)' }}>Total Hosted Bookings</span>
                </div>
              </>
            ) : (
              <>
                {/* Active Campaigns */}
                <div className="flex items-center gap-[10px] rounded-full px-5 py-[10px] pr-5 pl-[14px]"
                  style={{ backgroundColor: 'var(--white, #fff)', border: '1px solid var(--border, #e0e0d8)' }}>
                  <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'var(--green-light, #e8f5ec)' }}>
                    <Activity className="w-[14px] h-[14px]" style={{ color: 'var(--green, #16a34a)' }} />
                  </div>
                  <span className="text-base font-extrabold tracking-[-0.3px] flex items-center gap-1">
                    <span className="inline-block w-[7px] h-[7px] rounded-full animate-pulse" style={{ backgroundColor: 'var(--green, #16a34a)' }} />
                    {activeCampaigns}
                  </span>
                  <span className="text-[13px] font-normal" style={{ color: 'var(--text-secondary, #888)' }}>Active Bookings</span>
                </div>

                {/* Saved Listings */}
                <div className="flex items-center gap-[10px] rounded-full px-5 py-[10px] pr-5 pl-[14px]"
                  style={{ backgroundColor: 'var(--white, #fff)', border: '1px solid var(--border, #e0e0d8)' }}>
                  <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'var(--gold-light, #f5edda)' }}>
                    <Bookmark className="w-[14px] h-[14px]" style={{ color: 'var(--gold-dark, #c9a54e)' }} />
                  </div>
                  <span className="text-base font-extrabold tracking-[-0.3px]">{savedListings}</span>
                  <span className="text-[13px] font-normal" style={{ color: 'var(--text-secondary, #888)' }}>Saved Listings</span>
                </div>

                {/* Placements This Month */}
                <div className="flex items-center gap-[10px] rounded-full px-5 py-[10px] pr-5 pl-[14px]"
                  style={{ backgroundColor: 'var(--white, #fff)', border: '1px solid var(--border, #e0e0d8)' }}>
                  <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#e8effd' }}>
                    <CheckCircle2 className="w-[14px] h-[14px]" style={{ color: 'var(--blue, #5b8def)' }} />
                  </div>
                  <span className="text-base font-extrabold tracking-[-0.3px]">{placementsThisMonth}</span>
                  <span className="text-[13px] font-normal" style={{ color: 'var(--text-secondary, #888)' }}>Total Bookings</span>
                </div>
              </>
            )}
          </div>

          {/* ═══════════════════════════════════════
               ACTIVE CAMPAIGNS
               ═══════════════════════════════════════ */}
          {campaignCards.length > 0 && (
            <>
              <div className="flex items-baseline justify-between mb-[18px] flex-wrap gap-2">
                <h2 className="text-xl font-bold tracking-[-0.3px]">{mode === 'host' ? 'Hosted Bookings' : 'Active Bookings'}</h2>
                <Link href="/dashboard/bookings" className="text-[13px] font-medium" style={{ color: 'var(--mint-dark, #5bb8a8)' }}>View all →</Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-[14px] mb-9">
                {campaignCards.map(c => {
                  const pill = getStatusPill(c.status)
                  const progressColor = c.isLive ? 'var(--green, #16a34a)' : c.status === 'confirmed' ? 'var(--mint, #7ecfc0)' : 'var(--gold, #debb73)'
                  return (
                    <Link key={c.id} href={`/dashboard/bookings/${c.id}`}>
                      <div
                        className="rounded-2xl overflow-hidden transition-all hover:shadow-lg hover:-translate-y-[2px] cursor-pointer"
                        style={{
                          backgroundColor: 'var(--white, #fff)',
                          border: c.isLive ? '1px solid rgba(22,163,74,0.25)' : '1px solid var(--border, #e0e0d8)',
                        }}
                      >
                        {/* Top: thumb + info */}
                        <div className="flex gap-[14px] p-[18px] pb-[14px]">
                          {c.listing_image ? (
                            <div className="w-14 h-14 rounded-[10px] bg-cover bg-center flex-shrink-0" style={{ backgroundImage: `url(${c.listing_image})` }} />
                          ) : (
                            <div className="w-14 h-14 rounded-[10px] flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: 'var(--light-gray, #f8f8f5)', border: '1px solid var(--border, #e0e0d8)' }}>
                              <ImageIcon className="w-5 h-5" style={{ color: '#ccc' }} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-[15px] font-bold tracking-[-0.2px] mb-[3px] truncate">{c.listing_title}</div>
                            <div className="text-xs flex items-center gap-2 flex-wrap" style={{ color: 'var(--text-secondary, #888)' }}>
                              <span className="flex items-center gap-[3px]">
                                <Calendar className="w-3 h-3 opacity-50" />
                                {formatDate(c.start_date)} – {formatDate(c.end_date)}
                              </span>
                              <span
                                className="inline-flex items-center gap-[5px] px-3 py-[4px] rounded-full text-xs font-semibold"
                                style={{ backgroundColor: pill.bg, color: pill.color }}
                              >
                                {pill.label}
                              </span>
                            </div>
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div className="px-5 pb-4">
                          <div className="h-1 rounded-sm overflow-hidden mb-1.5" style={{ backgroundColor: 'var(--border, #e0e0d8)' }}>
                            <div className="h-full rounded-sm transition-all duration-400" style={{ width: `${c.progressPercent}%`, backgroundColor: progressColor }} />
                          </div>
                          <div className="text-[11px] font-medium mt-1" style={{ color: 'var(--text-tertiary, #9a9a90)' }}>
                            {c.step === 5 ? `Ends ${formatDate(c.end_date)}` :
                             c.step === 6 ? 'Campaign complete' :
                             c.step === 4 ? 'Creative received — awaiting posting' :
                             c.step === 3 ? 'Awaiting creative files' :
                             c.step === 2 ? 'Awaiting host approval' :
                             'Booking confirmed'}
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </>
          )}

          {/* ═══════════════════════════════════════
               RECENT BOOKINGS TABLE
               ═══════════════════════════════════════ */}
          {recentBookings.length > 0 && (
            <>
              <div className="flex items-baseline justify-between mb-[18px] flex-wrap gap-2">
                <h2 className="text-xl font-bold tracking-[-0.3px]">Recent Bookings</h2>
                <Link href="/dashboard/bookings" className="text-[13px] font-medium" style={{ color: 'var(--mint-dark, #5bb8a8)' }}>View all →</Link>
              </div>
              <div className="rounded-2xl overflow-hidden mb-9"
                style={{ backgroundColor: 'var(--white, #fff)', border: '1px solid var(--border, #e0e0d8)' }}>
                {/* Header row */}
                <div className="hidden sm:grid grid-cols-[1fr_140px_120px_100px] items-center px-6 py-[10px] gap-3"
                  style={{ backgroundColor: 'var(--light-gray, #f8f8f5)' }}>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.8px]" style={{ color: 'var(--text-tertiary, #9a9a90)' }}>Listing</span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.8px]" style={{ color: 'var(--text-tertiary, #9a9a90)' }}>Dates</span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.8px]" style={{ color: 'var(--text-tertiary, #9a9a90)' }}>Amount</span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.8px] text-right" style={{ color: 'var(--text-tertiary, #9a9a90)' }}>Status</span>
                </div>

                {recentBookings.map((b, i) => {
                  const ds = bookingDisplayStatus(b)
                  const pill = getStatusPill(ds)
                  return (
                    <Link key={b.id} href={`/dashboard/bookings/${b.id}`}>
                      <div
                        className={`grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_140px_120px_100px] items-center px-6 py-4 gap-3 cursor-pointer transition-colors hover:bg-[var(--light-gray)]${i < recentBookings.length - 1 ? ' border-b' : ''}`}
                        style={{ borderColor: 'var(--light-gray, #f8f8f5)' }}
                      >
                        {/* Listing info */}
                        <div className="flex items-center gap-[14px] min-w-0">
                          {b.listing_image ? (
                            <div className="w-11 h-11 rounded-[10px] bg-cover bg-center flex-shrink-0" style={{ backgroundImage: `url(${b.listing_image})` }} />
                          ) : (
                            <div className="w-11 h-11 rounded-[10px] flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: 'var(--light-gray, #f8f8f5)', border: '1px solid var(--border, #e0e0d8)' }}>
                              <ImageIcon className="w-4 h-4" style={{ color: '#ccc' }} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-sm font-semibold truncate">{b.listing_title}</div>
                            <div className="text-[11px] font-mono tracking-[0.3px]" style={{ color: 'var(--text-tertiary, #9a9a90)' }}>
                              {b.confirmation_code}
                              {mode === 'host' && b.advertiser_name ? ` · ${b.advertiser_name}` : ''}
                            </div>
                            {bookingDisplayStatus(b) === 'completed' && (
                              <div className="text-[11px] font-semibold mt-0.5" style={{ color: 'var(--mint-dark, #5bb8a8)' }}>
                                Book again →
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Dates — hidden on mobile */}
                        <div className="hidden sm:block text-[13px] font-normal" style={{ color: 'var(--text-secondary, #888)' }}>
                          {formatDate(b.start_date)} – {formatDate(b.end_date)}
                        </div>
                        {/* Amount — hidden on mobile */}
                        <div className="hidden sm:block text-sm font-semibold text-right">
                          ${b.total_price?.toLocaleString() ?? '—'}
                        </div>
                        {/* Status pill */}
                        <span
                          className="inline-flex items-center gap-[5px] px-3 py-1 rounded-full text-xs font-semibold justify-self-end whitespace-nowrap"
                          style={{ backgroundColor: pill.bg, color: pill.color }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pill.dotColor }} />
                          {pill.label}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </>
          )}

          {/* ═══════════════════════════════════════
               ACTIVITY TIMELINE
               ═══════════════════════════════════════ */}
          {timeline.filter(n => isRelevantToMode(n.type, mode)).length > 0 && (
            <>
              <div className="flex items-baseline justify-between mb-[18px] flex-wrap gap-2">
                <h2 className="text-xl font-bold tracking-[-0.3px]">Activity</h2>
                <Link href="/dashboard/notifications" className="text-[13px] font-medium" style={{ color: 'var(--mint-dark, #5bb8a8)' }}>View all →</Link>
              </div>
              <div className="relative mb-9">
                {/* Vertical line */}
                <div className="absolute top-2 bottom-2 left-[15px] w-[2px] rounded-sm" style={{ backgroundColor: 'var(--border, #e0e0d8)' }} />

                {timeline.filter(n => isRelevantToMode(n.type, mode)).slice(0, 5).map(n => {
                  const { Icon, dotClass } = timelineIcon(n.type)
                  const dotBg = dotClass === 'mint' ? 'var(--mint-light, #e8f6f3)'
                    : dotClass === 'gold' ? 'var(--gold-light, #f5edda)'
                    : 'var(--green-light, #e8f5ec)'
                  const dotColor = dotClass === 'mint' ? 'var(--mint-dark, #5bb8a8)'
                    : dotClass === 'gold' ? 'var(--gold-dark, #c9a54e)'
                    : 'var(--green, #16a34a)'

                  const formattedBody = n.body ? formatActivityBody(n.body) : ''

                  const activityCard = (
                    <div className={`flex-1 rounded-[10px] px-[18px] py-[14px] transition-colors${n.href ? ' hover:bg-[var(--light-gray,#f8f8f5)] cursor-pointer' : ''}`}
                      style={{ backgroundColor: 'var(--white, #fff)', border: '1px solid var(--border, #e0e0d8)' }}>
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm leading-snug" dangerouslySetInnerHTML={{ __html: `<strong>${n.title}</strong>${formattedBody ? ' \u2014 ' + formattedBody : ''}` }} />
                          <div className="text-xs mt-[3px]" style={{ color: 'var(--text-tertiary, #9a9a90)' }}>{timeAgo(n.created_at)}</div>
                        </div>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: 'var(--light-gray, #f8f8f5)' }}>
                          <ImageIcon className="w-4 h-4" style={{ color: '#ccc' }} />
                        </div>
                      </div>
                    </div>
                  )

                  return (
                    <div key={n.id} className="flex items-start gap-4 py-[10px] relative">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 relative z-[1]"
                        style={{ backgroundColor: dotBg }}
                      >
                        <Icon className="w-[15px] h-[15px]" style={{ color: dotColor }} />
                      </div>
                      {n.href ? (
                        <Link href={n.href} className="flex-1">
                          {activityCard}
                        </Link>
                      ) : (
                        activityCard
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* ═══════════════════════════════════════
               FINANCIAL SUMMARY CARD
               ═══════════════════════════════════════ */}
          <div className="flex items-baseline justify-between mb-[18px] flex-wrap gap-2">
            <h2 className="text-xl font-bold tracking-[-0.3px]">{mode === 'host' ? 'Earnings Summary' : 'Spending Summary'}</h2>
            <Link href={mode === 'host' ? '/dashboard/transactions' : '/dashboard/bookings'} className="text-[13px] font-medium" style={{ color: 'var(--mint-dark, #5bb8a8)' }}>Details →</Link>
          </div>
          <div className="rounded-2xl p-6 mb-9"
            style={{ backgroundColor: 'var(--white, #fff)', border: '1px solid var(--border, #e0e0d8)' }}>
            <div className="flex items-center justify-between mb-5">
              <div className="text-[15px] font-bold flex items-center gap-2">
                <DollarSign className="w-4 h-4" style={{ color: 'var(--text-tertiary, #9a9a90)' }} />
                {currentMonth}
              </div>
              <div className="text-xs font-medium" style={{ color: 'var(--text-tertiary, #9a9a90)' }}>Last 30 days</div>
            </div>
            {mode === 'host' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center p-[14px] rounded-[10px]" style={{ backgroundColor: 'var(--light-gray, #f8f8f5)' }}>
                  <div className="text-[11px] font-medium uppercase tracking-[0.6px] mb-1" style={{ color: 'var(--text-tertiary, #9a9a90)' }}>Total Earned</div>
                  <div className="text-[22px] font-extrabold tracking-[-0.5px]" style={{ color: 'var(--mint-dark, #5bb8a8)' }}>${totalEarned.toLocaleString()}</div>
                  <div className="text-[11px] font-medium mt-[2px]" style={{ color: 'var(--text-tertiary, #9a9a90)' }}>
                    from {hostBookingCount} booking{hostBookingCount !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="text-center p-[14px] rounded-[10px]" style={{ backgroundColor: 'var(--light-gray, #f8f8f5)' }}>
                  <div className="text-[11px] font-medium uppercase tracking-[0.6px] mb-1" style={{ color: 'var(--text-tertiary, #9a9a90)' }}>Avg. Per Booking</div>
                  <div className="text-[22px] font-extrabold tracking-[-0.5px]">${avgPerListing.toLocaleString()}</div>
                  <div className="text-[11px] font-medium mt-[2px]" style={{ color: 'var(--text-tertiary, #9a9a90)' }}>
                    {hostBookingCount > 0 ? 'after 7% platform fee' : 'no bookings yet'}
                  </div>
                </div>
                <div className="text-center p-[14px] rounded-[10px]" style={{ backgroundColor: 'var(--light-gray, #f8f8f5)' }}>
                  <div className="text-[11px] font-medium uppercase tracking-[0.6px] mb-1" style={{ color: 'var(--text-tertiary, #9a9a90)' }}>Active Listings</div>
                  <div className="text-[22px] font-extrabold tracking-[-0.5px]">{activeCampaigns}</div>
                  <div className="text-[11px] font-medium mt-[2px]" style={{ color: 'var(--text-tertiary, #9a9a90)' }}>
                    currently live
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="text-center p-[14px] rounded-[10px]" style={{ backgroundColor: 'var(--light-gray, #f8f8f5)' }}>
                  <div className="text-[11px] font-medium uppercase tracking-[0.6px] mb-1" style={{ color: 'var(--text-tertiary, #9a9a90)' }}>Total Spent</div>
                  <div className="text-[22px] font-extrabold tracking-[-0.5px]">${totalSpent.toLocaleString()}</div>
                  <div className="text-[11px] font-medium mt-[2px]" style={{ color: 'var(--text-tertiary, #9a9a90)' }}>
                    across {completedCount} booking{completedCount !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="text-center p-[14px] rounded-[10px]" style={{ backgroundColor: 'var(--light-gray, #f8f8f5)' }}>
                  <div className="text-[11px] font-medium uppercase tracking-[0.6px] mb-1" style={{ color: 'var(--text-tertiary, #9a9a90)' }}>Avg. Per Placement</div>
                  <div className="text-[22px] font-extrabold tracking-[-0.5px]">${avgPerPlacement.toLocaleString()}</div>
                  <div className="text-[11px] font-medium mt-[2px]" style={{ color: 'var(--text-tertiary, #9a9a90)' }}>
                    {completedCount > 0 ? `across ${completedCount} bookings` : 'no bookings yet'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}

// ─── Default Export ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--mint, #7ecfc0)' }} />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
