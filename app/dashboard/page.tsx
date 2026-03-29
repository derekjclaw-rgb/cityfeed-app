'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutGrid, PlusCircle, MessageSquare, ClipboardList,
  TrendingUp, DollarSign, AlertCircle, Loader2, User, Heart, CreditCard
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

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [activity, setActivity] = useState<Activity[]>([])
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

      // Fetch stats
      try {
        if (isHost) {
          const [listingsRes, bookingsRes, messagesRes, popRes] = await Promise.all([
            supabase.from('listings').select('id', { count: 'exact' }).eq('host_id', user.id).eq('status', 'active'),
            supabase.from('bookings').select('id, total_price, status').eq('host_id', user.id).in('status', ['active', 'confirmed', 'pending']),
            supabase.from('messages').select('id', { count: 'exact' }).neq('sender_id', user.id),
            supabase.from('bookings').select('id', { count: 'exact' }).eq('host_id', user.id).eq('status', 'pop_pending'),
          ])

          const earnings = bookingsRes.data?.reduce((sum, b) => {
            if (b.status === 'confirmed' || b.status === 'active') {
              return sum + (b.total_price || 0) * 0.93 // After 7% platform fee
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
            supabase.from('bookings').select('id, total_price, status').eq('advertiser_id', user.id),
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
        }

        // Fetch recent activity
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

  // Show host links for hosts, advertiser links + "List Your Space" for advertisers
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

        {/* Stripe Connect Banner — host without connected account */}
        {isHost && profile && !profile.stripe_connected && (
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

        {/* Recent Activity */}
        {activity.length > 0 && (
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
