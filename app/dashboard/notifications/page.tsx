'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Bell, Loader2, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Notification {
  id: string
  type: string
  title: string
  body?: string
  href?: string
  read: boolean
  created_at: string
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const TYPE_ICONS: Record<string, string> = {
  new_booking: '📋',
  booking_confirmed: '✅',
  booking_approved: '✅',
  booking_cancelled: '❌',
  new_message: '💬',
  collateral_uploaded: '📎',
  pop_submitted: '📸',
  pop_approved: '🎉',
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUserId(data.user.id)

      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', data.user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (notifs) setNotifications(notifs)

      // Mark all as read
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', data.user.id)
        .eq('read', false)

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

  const unread = notifications.filter(n => !n.read)
  const read = notifications.filter(n => n.read)

  return (
    <div className="min-h-screen pt-20 px-4 sm:px-6 pb-12" style={{ backgroundColor: '#f0f0ec' }}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard" className="hover:opacity-70" style={{ color: '#888' }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#2b2b2b' }}>Notifications</h1>
            <p className="text-sm" style={{ color: '#888' }}>{notifications.length} total</p>
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8' }}>
            <Bell className="w-12 h-12 mx-auto mb-4" style={{ color: '#e0e0d8' }} />
            <h2 className="text-lg font-semibold mb-2" style={{ color: '#2b2b2b' }}>All caught up!</h2>
            <p className="text-sm" style={{ color: '#888' }}>No notifications yet. They'll appear here when something happens.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(notif => (
              <div
                key={notif.id}
                className="rounded-2xl p-4"
                style={{
                  backgroundColor: '#fff',
                  border: '1px solid #e0e0d8',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  opacity: notif.read ? 0.8 : 1,
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-lg" style={{ backgroundColor: '#f8f8f5' }}>
                    {TYPE_ICONS[notif.type] ?? '🔔'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold" style={{ color: '#2b2b2b' }}>{notif.title}</p>
                      <span className="text-xs flex-shrink-0" style={{ color: '#bbb' }}>{timeAgo(notif.created_at)}</span>
                    </div>
                    {notif.body && (
                      <p className="text-xs mt-0.5" style={{ color: '#888' }}>{notif.body}</p>
                    )}
                    {notif.href && (
                      <Link
                        href={notif.href}
                        className="inline-block text-xs mt-2 font-medium hover:opacity-70"
                        style={{ color: '#7ecfc0' }}
                      >
                        View →
                      </Link>
                    )}
                  </div>
                  {notif.read && (
                    <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#e0e0d8' }} />
                  )}
                  {!notif.read && (
                    <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: '#7ecfc0' }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
