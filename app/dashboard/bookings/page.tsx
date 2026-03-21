'use client'

/**
 * Bookings list — shows all bookings for current user (host or advertiser)
 */
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ClipboardList, Loader2, MessageSquare, Star, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Booking {
  id: string
  status: string
  start_date: string
  end_date: string
  total_amount: number
  created_at: string
  listing_title: string
  other_party_name: string
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  pending:     { bg: '#fef9ec', text: '#b45309', label: 'Pending' },
  confirmed:   { bg: '#f0fdf4', text: '#16a34a', label: 'Confirmed' },
  active:      { bg: '#f0fdf4', text: '#16a34a', label: 'Active' },
  completed:   { bg: '#f8f8f5', text: '#888',    label: 'Completed' },
  cancelled:   { bg: '#fef2f2', text: '#dc2626', label: 'Cancelled' },
  pop_pending: { bg: '#fef3e8', text: '#e6964d', label: 'POP Pending' },
  pop_review:  { bg: '#fef3e8', text: '#e6964d', label: 'POP Review' },
  disputed:    { bg: '#fef2f2', text: '#dc2626', label: 'Disputed' },
}

export default function BookingsPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [isHost, setIsHost] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const host = profile?.role === 'host' || profile?.role === 'admin'
      setIsHost(host)

      const { data } = await supabase
        .from('bookings')
        .select(`
          id, status, start_date, end_date, total_amount, created_at,
          listings(title),
          advertiser:profiles!bookings_advertiser_id_fkey(full_name),
          host:profiles!bookings_host_id_fkey(full_name)
        `)
        .eq(host ? 'host_id' : 'advertiser_id', user.id)
        .order('created_at', { ascending: false })

      const mapped: Booking[] = (data ?? []).map((b: Record<string, unknown>) => ({
        id: b.id as string,
        status: b.status as string,
        start_date: b.start_date as string,
        end_date: b.end_date as string,
        total_amount: b.total_amount as number,
        created_at: b.created_at as string,
        listing_title: (b.listings as { title?: string } | null)?.title ?? 'Listing',
        other_party_name: host
          ? ((b.advertiser as { full_name?: string } | null)?.full_name ?? 'Advertiser')
          : ((b.host as { full_name?: string } | null)?.full_name ?? 'Host'),
      }))

      setBookings(mapped)
      setLoading(false)
    }

    load()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: '#e6e6dd' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#e6964d' }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20 px-4 sm:px-6 pb-12" style={{ backgroundColor: '#e6e6dd' }}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="hover:opacity-70" style={{ color: '#888' }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#2b2b2b' }}>
              {isHost ? 'Bookings' : 'My Bookings'}
            </h1>
            <p className="text-sm" style={{ color: '#888' }}>
              {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {bookings.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: '#fff', border: '1px solid #d4d4c9', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <ClipboardList className="w-12 h-12 mx-auto mb-4" style={{ color: '#d4d4c9' }} />
            <h2 className="text-lg font-semibold mb-2" style={{ color: '#2b2b2b' }}>
              {isHost ? 'No bookings yet' : 'No campaigns yet'}
            </h2>
            <p className="text-sm mb-6" style={{ color: '#888' }}>
              {isHost ? 'When advertisers book your listings, they\'ll appear here.' : 'Browse the marketplace to find your first ad placement.'}
            </p>
            <Link
              href={isHost ? '/dashboard/create-listing' : '/marketplace'}
              className="inline-block px-5 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#e6964d', color: '#fff' }}
            >
              {isHost ? 'Create a Listing' : 'Browse Marketplace'}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map(booking => {
              const statusStyle = STATUS_COLORS[booking.status] ?? { bg: '#f8f8f5', text: '#888', label: booking.status }
              const canReview = booking.status === 'completed'
              return (
                <div
                  key={booking.id}
                  className="rounded-2xl p-5"
                  style={{ backgroundColor: '#fff', border: '1px solid #d4d4c9', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate" style={{ color: '#2b2b2b' }}>{booking.listing_title}</h3>
                      <p className="text-xs mt-0.5" style={{ color: '#888' }}>with {booking.other_party_name}</p>
                    </div>
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                      style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
                    >
                      {statusStyle.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs mb-4" style={{ color: '#888' }}>
                    <span>
                      {new Date(booking.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {' — '}
                      {new Date(booking.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="font-semibold" style={{ color: '#2b2b2b' }}>
                      ${booking.total_amount?.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/messages/${booking.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
                      style={{ border: '1px solid #d4d4c9', color: '#555' }}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Message
                    </Link>
                    {canReview && (
                      <Link
                        href={`/dashboard/bookings/${booking.id}/review`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
                        style={{ border: '1px solid #e6964d', color: '#e6964d' }}
                      >
                        <Star className="w-3.5 h-3.5" />
                        Leave Review
                      </Link>
                    )}
                    <Link
                      href={`/marketplace/${booking.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
                      style={{ color: '#aaa' }}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View Listing
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
