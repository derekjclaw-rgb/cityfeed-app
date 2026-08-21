'use client'

/**
 * Messages Layout — Split-pane messaging (WhatsApp/Slack style)
 * Left: thread list (340px) | Right: active conversation or empty state
 * Mobile: shows one panel at a time
 */
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { MessageCircle, Loader2 } from 'lucide-react'
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

function formatName(fullName: string): string {
  if (!fullName) return 'Unknown'
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`
}

function smartDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return d.toLocaleDateString('en-US', { weekday: 'short' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const activeId = pathname !== '/dashboard/messages' ? pathname.split('/dashboard/messages/')[1] || null : null

  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dashMode, setDashMode] = useState<string | null>(null)

  // Listen for dashboard mode toggle changes
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('cf_dash_mode') : null
    setDashMode(saved)
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as string
      if (detail === 'host' || detail === 'advertiser') setDashMode(detail)
    }
    window.addEventListener('cf_mode_change', handler)
    return () => window.removeEventListener('cf_mode_change', handler)
  }, [])

  // Fetch threads filtered by current dashboard role
  useEffect(() => {
    if (dashMode === null) return // wait for mode to load
    const supabase = createClient()
    setLoading(true)
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login?redirect=/dashboard/messages'); return }
      const userId = data.user.id

      const roleFilter = dashMode === 'host' ? 'host_id' : 'advertiser_id'
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          id, status, host_id, advertiser_id,
          listings(title),
          host:profiles!bookings_host_id_fkey(full_name),
          advertiser:profiles!bookings_advertiser_id_fkey(full_name),
          messages(content, created_at, sender_id, read, sent_as_role, recipient_id)
        `)
        .eq(roleFilter, userId)
        .order('created_at', { ascending: false })

      if (bookings) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: Thread[] = bookings.map((b: any) => {
          const msgs = [...(b.messages ?? [])].sort(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (a: any, c: any) => new Date(a.created_at).getTime() - new Date(c.created_at).getTime()
          )
          const lastMsg = msgs[msgs.length - 1]
          const unread = msgs.filter((m: { sender_id: string; recipient_id?: string; read: boolean }) => m.sender_id !== userId && (m.recipient_id === userId || !m.recipient_id) && !m.read).length
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
  }, [dashMode, router])

  const filtered = search
    ? threads.filter(t =>
        t.other_party.toLowerCase().includes(search.toLowerCase()) ||
        t.listing_title.toLowerCase().includes(search.toLowerCase())
      )
    : threads

  return (
    <div className="flex h-[calc(100dvh-56px)] md:h-screen">
      {/* ── Thread list panel ─────────────────────────────────────────── */}
      <div
        className={`w-full md:w-[340px] flex-shrink-0 flex flex-col ${activeId ? 'hidden md:flex' : 'flex'}`}
        style={{ borderRight: '1px solid #e0e0d8', backgroundColor: '#fff' }}
      >
        {/* Header + search */}
        <div className="px-5 pt-6 pb-3">
          <h1 className="text-xl font-bold mb-3" style={{ color: '#2b2b2b' }}>Messages</h1>
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg px-3 py-2 pl-9 text-sm focus:outline-none"
              style={{ backgroundColor: '#f0f0ec', color: '#2b2b2b' }}
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#aaa' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Threads */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#7ecfc0' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <MessageCircle className="w-8 h-8 mx-auto mb-2" style={{ color: '#ddd' }} />
              <p className="text-sm" style={{ color: '#888' }}>
                {search ? 'No matching conversations' : 'No messages yet'}
              </p>
            </div>
          ) : (
            filtered.map(thread => {
              const isActive = activeId === thread.booking_id
              const isUnread = thread.unread > 0
              return (
                <Link key={thread.booking_id} href={`/dashboard/messages/${thread.booking_id}`}>
                  <div
                    className="flex items-center gap-3 px-5 py-3.5 cursor-pointer transition-colors"
                    style={{
                      backgroundColor: isActive ? 'rgba(126,207,192,0.12)' : isUnread ? 'rgba(126,207,192,0.06)' : 'transparent',
                      borderLeft: isActive ? '3px solid #7ecfc0' : isUnread ? '3px solid #7ecfc0' : '3px solid transparent',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = isUnread ? 'rgba(126,207,192,0.14)' : '#f8f8f5' }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = isActive ? 'rgba(126,207,192,0.12)' : isUnread ? 'rgba(126,207,192,0.06)' : 'transparent' }}
                  >
                    {/* Avatar */}
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold"
                      style={{ backgroundColor: isActive ? '#7ecfc0' : isUnread ? '#5bb8a8' : '#e0e0d8', color: isActive || isUnread ? '#fff' : '#888' }}
                    >
                      {thread.other_party.charAt(0).toUpperCase()}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[14px] truncate" style={{ color: isUnread ? '#2b2b2b' : '#555', fontWeight: isUnread ? 700 : 500 }}>
                          {thread.other_party}
                        </span>
                        <span className="text-[11px] flex-shrink-0 ml-2" style={{ color: isUnread ? '#5bb8a8' : '#aaa' }}>
                          {smartDate(thread.last_message_at)}
                        </span>
                      </div>
                      <p className="text-[12px] truncate" style={{ color: '#888' }}>{thread.listing_title}</p>
                      <p className="text-[13px] truncate" style={{ color: isUnread ? '#2b2b2b' : '#aaa', fontWeight: isUnread ? 600 : 400 }}>{thread.last_message}</p>
                    </div>
                    {isUnread && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ backgroundColor: '#E63946', color: '#fff' }}>
                        {thread.unread}
                      </div>
                    )}
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </div>

      {/* ── Chat panel ────────────────────────────────────────────────── */}
      <div className={`flex-1 min-w-0 ${!activeId ? 'hidden md:flex' : 'flex'} flex-col`} style={{ backgroundColor: '#f0f0ec' }}>
        {children}
      </div>
    </div>
  )
}
