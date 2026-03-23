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

export default function MessagesPage() {
  const router = useRouter()
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login?redirect=/dashboard/messages'); return }
      setUserId(data.user.id)

      // Fetch bookings with messages
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          id, status,
          listings(title),
          messages(content, created_at, sender_id)
        `)
        .or(`advertiser_id.eq.${data.user.id},listings.host_id.eq.${data.user.id}`)
        .order('created_at', { ascending: false })

      if (bookings) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: Thread[] = bookings.map((b: any) => {
          const msgs = b.messages ?? []
          const lastMsg = msgs[msgs.length - 1]
          return {
            booking_id: b.id,
            listing_title: b.listings?.title ?? 'Listing',
            other_party: 'Host / Advertiser',
            last_message: lastMsg?.content ?? 'No messages yet',
            last_message_at: lastMsg?.created_at ?? b.created_at,
            unread: 0,
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
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#2b2b2b' }}>Messages</h1>
        <p className="text-sm mb-8" style={{ color: '#888' }}>One conversation per booking</p>

        {threads.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8' }}>
            <MessageCircle className="w-10 h-10 mx-auto mb-4" style={{ color: '#e0e0d8' }} />
            <h3 className="font-semibold mb-2" style={{ color: '#555' }}>No messages yet</h3>
            <p className="text-sm mb-6" style={{ color: '#888' }}>Messages appear here once you have active bookings</p>
            <Link
              href="/marketplace"
              className="font-semibold px-5 py-2.5 rounded-xl text-sm hover:opacity-90"
              style={{ backgroundColor: '#ef4135', color: '#fff' }}
            >
              Browse listings
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {threads.map(thread => (
              <Link key={thread.booking_id} href={`/dashboard/messages/${thread.booking_id}`}>
                <div
                  className="rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-all hover:shadow-md"
                  style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
                >
                  <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm" style={{ backgroundColor: 'rgba(126,207,192,0.15)', color: '#7ecfc0' }}>
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className="font-semibold text-sm truncate" style={{ color: '#2b2b2b' }}>{thread.listing_title}</h3>
                      <span className="text-xs flex-shrink-0 ml-2" style={{ color: '#aaa' }}>
                        {new Date(thread.last_message_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs truncate" style={{ color: '#888' }}>{thread.last_message}</p>
                  </div>
                  {thread.unread > 0 && (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: '#ef4135' }}>
                      {thread.unread}
                    </div>
                  )}
                  <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: '#ccc' }} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
