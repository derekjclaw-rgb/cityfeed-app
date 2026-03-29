'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutGrid, PlusCircle, MessageSquare, ClipboardList,
  TrendingUp, DollarSign, AlertCircle, Loader2, User, Heart, CreditCard, MapPin, Image as ImageIcon
} from 'lucide-react'

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

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [activity, setActivity] = useState<Activity[]>([])
  const [actionBanner, setActionBanner] = useState<ActionBanner | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [hostListings, setHostListings] = useState<HostListing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, avatar_url, stripe_account_id, stripe_connected')
        .eq('id', user.id)
        .single()

      setProfile(profileData)
      const isHost = profileData?.role === 'host' || profileData?.role === 'admin'

      try {
        if (isHost) {
          const [listingsRes, bookingsRes, messagesRes, popRes] = await Promise.all([
            supabase.from('listings').select('id, title, city, state, status, images, price_per_day, category', { count: 'exact' }).eq('host_id', user.id).eq('status', 'active'),
            supabase.from('bookings').select('id, total_price, status').eq('host_id', user.id).in('status', ['active', 'confirmed', 'pending']),
            supabase.from('messages').select('id', { count: 'exact' }).neq('sender_id', user.id),
            supabase.from('bookings').select('id', { count: 'exact' }).eq('host_id', user.id).eq('status', 'pop_pending'),
          ])

          // Also fetch ALL host listings (active + inactive) for the sidebar
          const { data: allListings } = await supabase
            .from('listings')
            .select('id, title, city, state, status, images, price_per_day, category')
            .eq('host_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5)
          setHostListings((allListings ?? []) as HostListing[])

          const earnings = bookingsRes.data?.reduce((sum, b) => {
            if (b.status === 'confirmed' || b.status === 'active') {
              return sum + (b.total_price || 0) * 0.93
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
        } else {
          // Advertiser
          const [bookingsRes, messagesRes, reviewsRes] = await Promise.all([
            supabase.from('bookings').select(`
              id, total_price, status, start_date, end_date, listing_id,
              listings(title, images)
            `).eq('advertiser_id', user.id).order('created_at', { ascending: false }),
            supabase.from('messages').select('id', { count: 'exact' }).neq('sender_id', user.id),
            supabase.from('bookings').select('id', { count: 'exact' }).eq('advertiser_id', user.id).eq('status', 'pop_review'),
          ])

          const totalSpent = bookingsRes.data?.reduce((sum, b) => {
            if (b.status === 'confirmed' || b.status === 'active' || b.status === 'completed') {
              return sum + (b.total_price || 0)
            }
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

          // Map to campaign tiles
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mapped: Campaign[] = (bookingsRes.data ?? []).map((b: any) => ({
            id: b.id,
            listing_title: b.listings?.title ?? 'Listing',
            listing_id: b.listing_id,
            listing_image: b.listings?.images?.[0] ?? undefined,
            status: b.status,
            start_date: b.start_date,
            end_date: b.end_date,
            total_price: b.total_price,
          }))
          setCampaigns(mapped)
        }

        // Recent activity
        const { data: recentBookings } = await supabase
          .from('bookings')
          .select('id, status, created_at, listings(title)')
          .eq(isHost ? 'host_id' : 'advertiser_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3)

        const acts: Activity[] = (recentBookings ?? []).map(b => ({
          id: b.id,
          type: 'booking' as const,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          title: (b as any).listings?.title ?? 'Booking',
          subtitle: `Status: ${b.status}`,
          time: new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          href: `/dashboard/bookings`,
        }))
        setActivity(acts)

        // Action banner
        try {
          if (isHost) {
            const { data: pendingBooking } = await supabase
              .from('bookings')
              .select('id, listings(title)')
              .eq('host_id', user.id)
              .eq('status', 'pending')
              .order('created_at', { ascending: false })
              .limit(1)
              .single()
            if (pendingBooking) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const title = (pendingBooking as any).listings?.title ?? 'a listing'
              setActionBanner({ message: `New booking request for "${title}"`, href: `/dashboard/bookings`, cta: 'Review Now' })
            } else {
              const { data: collateralBooking } = await supabase
                .from('bookings')
                .select('id, listings(title)')
                .eq('host_id', user.id)
                .eq('status', 'confirmed')
                .order('updated_at', { ascending: false })
                .limit(1)
                .single()
              if (collateralBooking) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const title = (collateralBooking as any).listings?.title ?? 'a booking'
                setActionBanner({ message: `Creative may be ready for "${title}" — check the booking`, href: `/dashboard/bookings/${collateralBooking.id}`, cta: 'View Booking' })
              }
            }
          } else {
            // Advertiser: check if any confirmed booking has collateral uploaded already
            // If they have a confirmed booking with no collateral yet → upload prompt
            // If they've uploaded → "stand by for POP"
            const { data: confirmedBookings } = await supabase
              .from('bookings')
              .select('id, listings(title)')
              .eq('advertiser_id', user.id)
              .eq('status', 'confirmed')
              .order('created_at', { ascending: false })
              .limit(3)

            if (confirmedBookings && confirmedBookings.length > 0) {
              // Check Supabase storage for collateral
              const supabaseClient = createClient()
              let hasCollateral = false
              let collateralBookingId = ''
              let collateralBookingTitle = ''

              for (const bk of confirmedBookings) {
                const { data: storageFiles } = await supabaseClient.storage
                  .from('booking-collateral')
                  .list(`bookings/${bk.id}`)
                if (storageFiles && storageFiles.length > 0) {
                  hasCollateral = true
                  collateralBookingId = bk.id
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  collateralBookingTitle = (bk as any).listings?.title ?? 'your listing'
                  break
                }
              }

              if (hasCollateral) {
                setActionBanner({
                  message: `Collateral is with the host — stand by for POP`,
                  href: `/dashboard/messages`,
                  cta: 'View Messages',
                })
              } else {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const title = (confirmedBookings[0] as any).listings?.title ?? 'your listing'
                setActionBanner({ message: `Upload your creative for "${title}"`, href: `/dashboard/bookings/${confirmedBookings[0].id}`, cta: 'Upload Creative' })
              }

              // Suppress unused variable warning
              void collateralBookingId
              void collateralBookingTitle
            } else {
              const { data: popBooking } = await supabase
                .from('bookings')
                .select('id, listings(title)')
                .eq('advertiser_id', user.id)
                .in('status', ['pop_pending', 'pop_review'])
                .limit(1)
                .single()
              if (popBooking) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const title = (popBooking as any).listings?.title ?? 'your listing'
                setActionBanner({ message: `Review proof of posting for "${title}"`, href: `/dashboard/bookings/${popBooking.id}`, cta: 'Review Now' })
              }
            }
          }
        } catch { /* action banner is non-critical */ }
      } catch {
        // Stats fetch failed silently
      }

      setLoading(false)
    })
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f0f0ec' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#7ecfc0' }} />
      </div>
    )
  }

  const isHost = profile?.role === 'host' || profile?.role === 'admin'
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
  ]

  const links = isHost ? hostLinks : [
    ...advertiserLinks,
    { href: '/dashboard/create-listing', label: 'List Your Space', desc: 'Got ad space? Start earning', icon: PlusCircle },
  ]

  return (
    <div className="min-h-screen pt-20 px-4 sm:px-6 pb-12" style={{ backgroundColor: '#f0f0ec' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={firstName} className="w-12 h-12 rounded-full object-cover" style={{ border: '2px solid #7ecfc0' }} />
          ) : (
            <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold" style={{ backgroundColor: 'rgba(126,207,192,0.15)', color: '#7ecfc0', border: '2px solid #7ecfc0' }}>
              {initials}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#2b2b2b' }}>
              Welcome back{firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="text-sm" style={{ color: '#888' }}>
              {isHost ? 'Manage your listings and bookings' : 'Find and manage your ad campaigns'}
            </p>
          </div>
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

        {/* ─── ADVERTISER: My Campaigns FIRST ─────────────────────── */}
        {!isHost && campaigns.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: '#2b2b2b' }}>My Campaigns</h2>
              <Link href="/dashboard/bookings" className="text-xs font-medium hover:underline" style={{ color: '#7ecfc0' }}>View all</Link>
            </div>
            <div className="space-y-3">
              {campaigns.slice(0, 5).map(campaign => {
                const sc = STATUS_COLORS[campaign.status] ?? { bg: '#f8f8f5', text: '#888' }
                const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'
                return (
                  <Link key={campaign.id} href={`/dashboard/bookings/${campaign.id}`}>
                    <div
                      className="rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-all hover:shadow-md"
                      style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm truncate" style={{ color: '#2b2b2b' }}>{campaign.listing_title}</h3>
                          <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: sc.bg, color: sc.text }}>
                            {STATUS_LABELS[campaign.status] ?? campaign.status}
                          </span>
                        </div>
                        <p className="text-xs" style={{ color: '#888' }}>
                          {fmt(campaign.start_date)} — {fmt(campaign.end_date)}
                          {campaign.total_price ? ` · $${campaign.total_price.toLocaleString()}` : ''}
                        </p>
                      </div>
                      {/* Listing thumbnail on the far right */}
                      {campaign.listing_image ? (
                        <img
                          src={campaign.listing_image}
                          alt={campaign.listing_title}
                          className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                          style={{ border: '1px solid #e0e0d8' }}
                        />
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

        {/* First-time host onboarding */}
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
                    style={{ backgroundColor: '#debb73', color: '#2b2b2b' }}
                  >
                    Create Your First Listing →
                  </Link>
                  <Link href="/dashboard/stripe-onboarding"
                    className="font-semibold px-5 py-2.5 rounded-xl text-sm hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', color: '#555' }}
                  >
                    Set Up Payouts
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stripe Connect Banner */}
        {isHost && stats && stats.listings > 0 && profile && !profile.stripe_connected && (
          <div className="rounded-2xl p-4 mb-6 flex items-center gap-4" style={{ backgroundColor: '#f0f8f5', border: '1px solid #d0ede9' }}>
            <div className="p-2.5 rounded-xl flex-shrink-0" style={{ backgroundColor: 'rgba(126,207,192,0.15)' }}>
              <CreditCard className="w-5 h-5" style={{ color: '#7ecfc0' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: '#2b2b2b' }}>Connect your bank to receive payouts</p>
              <p className="text-xs mt-0.5" style={{ color: '#888' }}>Set up Stripe to get paid when campaigns complete.</p>
            </div>
            <Link
              href="/dashboard/stripe-onboarding"
              className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#debb73', color: '#2b2b2b' }}
            >
              Set Up ⚠️
            </Link>
          </div>
        )}

        {/* ─── HOST: My Listings FIRST ─────────────────────────────── */}
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
                  <Link key={lst.id} href={`/dashboard/listings`}>
                    <div
                      className="rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-all"
                      style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
                    >
                      {/* Thumbnail */}
                      {lst.images && lst.images.length > 0 ? (
                        <img
                          src={lst.images[0]}
                          alt={lst.title}
                          className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                          style={{ border: '1px solid #e0e0d8' }}
                        />
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
                        <p className="text-xs" style={{ color: '#888' }}>
                          {lst.city}, {lst.state} · ${lst.price_per_day}/day
                        </p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Stats Grid */}
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
                <StatCard label="Messages" value={stats.unreadMessages} icon={MessageSquare} />
              </>
            )}
          </div>
        )}

        {/* HOST: Bookings section comes AFTER listings */}
        {isHost && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: '#2b2b2b' }}>Bookings</h2>
              <Link href="/dashboard/bookings" className="text-xs font-medium hover:underline" style={{ color: '#7ecfc0' }}>View all</Link>
            </div>
            {activity.length > 0 ? (
              <div className="space-y-3">
                {activity.map(item => (
                  <Link key={item.id} href={`/dashboard/bookings`}>
                    <div
                      className="flex items-center justify-between p-4 rounded-2xl hover:shadow-md transition-all"
                      style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
                    >
                      <div>
                        <p className="text-sm font-medium" style={{ color: '#2b2b2b' }}>{item.title}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#888' }}>{item.subtitle}</p>
                      </div>
                      <span className="text-xs" style={{ color: '#aaa' }}>{item.time}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8' }}>
                <p className="text-sm" style={{ color: '#aaa' }}>No bookings yet</p>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group bg-white rounded-2xl p-6 hover:shadow-lg transition-all hover:-translate-y-0.5"
              style={{ border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
            >
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

        {/* Recent Activity — advertiser only (host has it in Bookings section) */}
        {!isHost && activity.length > 0 && (
          <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <h2 className="font-semibold mb-4" style={{ color: '#2b2b2b' }}>Recent Activity</h2>
            <div className="space-y-3">
              {activity.map(item => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-center justify-between p-3 rounded-xl hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: '#f8f8f5' }}
                >
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
      </div>
    </div>
  )
}
