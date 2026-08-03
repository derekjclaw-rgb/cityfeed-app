'use client'

/**
 * Messages — list of threads (one per booking)
 */
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MessageCircle, Loader2, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Thread {
  booking_id: string
  listing_title: string
  other_party: string
  last_message: string
  last_message_at: string
  unread: number
  status: string
}

/** Format a full name as "First L." for privacy */
function formatName(fullName: string): string {
  if (!fullName) return 'Unknown'
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`
}

export default function MessagesPage() {
  const router = useRouter()
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login?redirect=/dashboard/messages'); return }
      const userId = data.user.id

      // Fix: use host_id (on bookings table directly, not listings.host_id)
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          id, status, host_id, advertiser_id,
          listings(title),
          host:profiles!bookings_host_id_fkey(full_name),
          advertiser:profiles!bookings_advertiser_id_fkey(full_name),
          messages(content, created_at, sender_id, read)
        `)
        .or(`advertiser_id.eq.${userId},host_id.eq.${userId}`)
        .order('created_at', { ascending: false })

      if (bookings) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: Thread[] = bookings.map((b: any) => {
          const msgs = [...(b.messages ?? [])].sort(
            (a: { created_at: string }, c: { created_at: string }) =>
              new Date(a.created_at).getTime() - new Date(c.created_at).getTime()
          )
          const lastMsg = msgs[msgs.length - 1]
          const unread = msgs.filter((m: { sender_id: string; read: boolean }) => m.sender_id !== userId && !m.read).length

          const otherParty = userId === b.host_id
            ? formatName(b.advertiser?.full_name ?? 'Advertiser')
            : formatName(b.host?.full_name ?? 'Host')

          return {
            booking_id: b.id,
            listing_title: b.listings?.title ?? 'Listing',
            other_party: otherParty,
            last_message: lastMsg?.content ?? 'No messages yet',
            last_message_at: lastMsg?.created_at ?? b.created_at,
            unread,
            status: b.status,
          }
        })
        setThreads(mapped)
      }
      setLoading(false)
    })
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: '#f0f0ec' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#7ecfc0' }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-16 pb-20" style={{ backgroundColor: '#f0f0ec' }}>
      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#2b2b2b' }}>Messages</h1>
        <p className="text-sm mb-5" style={{ color: '#888' }}>One conversation per booking</p>

        {/* Search */}
        <div className="relative mb-5">
          <input
            type="text"
            placeholder="Search conversations..."
            className="w-full rounded-xl px-4 py-2.5 pl-10 text-sm focus:outline-none"
            style={{ backgroundColor: 'rgba(0,0,0,0.04)', border: 'none', color: '#2b2b2b' }}
          />
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#aaa' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {threads.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8' }}>
            <MessageCircle className="w-10 h-10 mx-auto mb-4" style={{ color: '#e0e0d8' }} />
            <h3 className="font-semibold mb-2" style={{ color: '#555' }}>No messages yet</h3>
            <p className="text-sm mb-6" style={{ color: '#888' }}>Messages appear here once you have active bookings</p>
            <Link
              href="/marketplace"
              className="font-semibold px-5 py-2.5 rounded-xl text-sm hover:opacity-90"
              style={{ backgroundColor: '#debb73', color: '#2b2b2b' }}
            >
              Browse listings
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            {threads.map(thread => {
              const isUnread = thread.unread > 0
              const msgDate = new Date(thread.last_message_at)
              const now = new Date()
              const diffDays = Math.floor((now.getTime() - msgDate.getTime()) / 86400000)
              let dateStr = ''
              if (isNaN(msgDate.getTime())) {
                dateStr = ''
              } else if (diffDays === 0) {
                dateStr = msgDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
              } else if (diffDays === 1) {
                dateStr = 'Yesterday'
              } else if (diffDays < 7) {
                dateStr = msgDate.toLocaleDateString('en-US', { weekday: 'long' })
              } else {
                dateStr = msgDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              }
              return (
                <Link key={thread.booking_id} href={`/dashboard/messages/${thread.booking_id}`}>
                  <div
                    className="flex items-start gap-3 px-4 py-3.5 rounded-xl cursor-pointer transition-colors hover:bg-white"
                    style={{ backgroundColor: isUnread ? 'rgba(255,255,255,0.9)' : 'transparent' }}
                  >
                    {/* Unread dot */}
                    <div className="flex flex-col items-center pt-1.5 w-3 flex-shrink-0">
                      {isUnread && (
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
                      )}
                    </div>
                    {/* Avatar */}
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-base font-semibold"
                      style={{ background: 'linear-gradient(135deg, #e0e0d8, #ccc)', color: '#fff' }}
                    >
                      {thread.other_party.charAt(0).toUpperCase()}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-baseline justify-between gap-2 mb-0.5">
                        <h3
                          className="text-[15px] truncate"
                          style={{ color: '#2b2b2b', fontWeight: isUnread ? 700 : 500 }}
                        >
                          {thread.other_party}
                        </h3>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-[12px]" style={{ color: isUnread ? '#2b2b2b' : '#aaa', fontWeight: isUnread ? 600 : 400 }}>
                            {dateStr}
                          </span>
                          <svg className="w-3.5 h-3.5" style={{ color: '#ccc' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                      <p className="text-[13px] truncate mb-0.5" style={{ color: '#888', fontWeight: isUnread ? 500 : 400 }}>
                        {thread.listing_title}
                      </p>
                      <p
                        className="text-[13px] line-clamp-2 leading-[1.35]"
                        style={{ color: isUnread ? '#555' : '#aaa', fontWeight: isUnread ? 500 : 400 }}
                      >
                        {thread.last_message}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
