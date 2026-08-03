'use client'

/**
 * Navbar v2 — Glassmorphic navigation
 * Frosted glass effect, brand dot, pill buttons
 * All auth/notification/dropdown/mobile behavior preserved from v1
 */
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, X, ChevronDown, LayoutDashboard, User, Settings, LogOut, Bell, ArrowLeftRight, MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

type DashMode = 'advertiser' | 'host'

interface UserInfo {
  email?: string
  id: string
  firstName: string
  avatarUrl?: string
}

interface Notification {
  id: string
  type: string
  title: string
  body?: string
  href?: string
  read: boolean
  created_at: string
}

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [user, setUser] = useState<UserInfo | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [dashMode, setDashMode] = useState<DashMode>('advertiser')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { setUser(null); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', data.user.id)
        .single()

      const fullName = profile?.full_name ?? ''
      const firstName = fullName.split(' ')[0].trim() || ''

      setUser({
        email: data.user.email ?? undefined,
        id: data.user.id,
        firstName,
        avatarUrl: profile?.avatar_url ?? undefined,
      })

      await loadNotifications(data.user.id)

      const { count: msgCount } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', data.user.id)
        .eq('read', false)
      setUnreadMessages(msgCount ?? 0)

      const channel = supabase
        .channel(`notifications:${data.user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${data.user.id}`,
          },
          (payload) => {
            setNotifications(prev => [payload.new as Notification, ...prev].slice(0, 10))
            setUnreadCount(c => c + 1)
          }
        )
        .subscribe()

      channelRef.current = channel
    })

    const saved = localStorage.getItem('cf_dash_mode') as DashMode | null
    if (saved) setDashMode(saved)

    const handleModeChange = (e: Event) => {
      const newMode = (e as CustomEvent<DashMode>).detail
      setDashMode(newMode)
    }
    window.addEventListener('cf_mode_change', handleModeChange)

    return () => {
      if (channelRef.current) {
        const supabase = createClient()
        supabase.removeChannel(channelRef.current)
      }
      window.removeEventListener('cf_mode_change', handleModeChange)
    }
  }, [pathname])

  async function loadNotifications(userId: string) {
    const supabase = createClient()
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (data) {
      setNotifications(data)
      setUnreadCount(data.filter((n: Notification) => !n.read).length)
    }
  }

  async function markAllRead() {
    if (!user) return
    const supabase = createClient()
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  async function markNotifRead(notifId: string, href?: string) {
    const supabase = createClient()
    await supabase.from('notifications').update({ read: true }).eq('id', notifId)
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n))
    setUnreadCount(c => Math.max(0, c - 1))
    setNotifOpen(false)
    if (href) router.push(href)
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSwitchMode() {
    const newMode: DashMode = dashMode === 'host' ? 'advertiser' : 'host'
    setDashMode(newMode)
    localStorage.setItem('cf_dash_mode', newMode)
    window.dispatchEvent(new CustomEvent('cf_mode_change', { detail: newMode }))
    setDropdownOpen(false)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setDropdownOpen(false)
    setMobileOpen(false)
    router.push('/')
    router.refresh()
  }

  const navLinks = [
    { href: '/marketplace', label: 'Marketplace' },
    { href: '/how-it-works', label: 'How It Works' },
    { href: '/dashboard/create-listing', label: 'For Hosts' },
    { href: '/about', label: 'About' },
  ]

  const initials = user?.firstName?.charAt(0).toUpperCase() ?? 'U'

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: 'var(--gold)' }}
          />
          <span
            className="text-xl font-extrabold tracking-tight"
            style={{ color: 'var(--charcoal)', letterSpacing: '-0.5px' }}
          >
            City Feed
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium transition-colors hover:text-[var(--charcoal)]"
              style={{
                color: pathname === link.href ? 'var(--charcoal)' : 'var(--text-secondary)',
                fontWeight: pathname === link.href ? 600 : 500,
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop auth */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              {/* Notification Bell */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen && unreadCount > 0) markAllRead() }}
                  className="relative w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-black/5"
                  style={{ border: '1px solid var(--border)' }}
                >
                  <Bell className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                  {unreadCount > 0 && (
                    <span
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs font-bold flex items-center justify-center"
                      style={{ backgroundColor: 'var(--red)', color: '#fff', fontSize: '10px' }}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div
                    className="absolute right-0 mt-2 w-80 rounded-2xl overflow-hidden"
                    style={{ backgroundColor: '#fff', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}
                  >
                    <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--light-gray)' }}>
                      <p className="font-semibold text-sm" style={{ color: 'var(--charcoal)' }}>Notifications</p>
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} className="text-xs hover:opacity-70" style={{ color: 'var(--mint-dark)' }}>Mark all read</button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <Bell className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--border)' }} />
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No notifications yet</p>
                        </div>
                      ) : (
                        notifications.slice(0, 5).map(notif => (
                          <button
                            key={notif.id}
                            onClick={() => markNotifRead(notif.id, notif.href)}
                            className="w-full text-left px-4 py-3 hover:bg-[var(--light-gray)] transition-colors"
                            style={{
                              borderBottom: '1px solid var(--light-gray)',
                              backgroundColor: notif.read ? 'transparent' : 'rgba(126,207,192,0.05)',
                            }}
                          >
                            <div className="flex items-start gap-2">
                              {!notif.read && (
                                <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: 'var(--mint)' }} />
                              )}
                              <div style={{ flex: 1 }}>
                                <p className="text-sm font-medium" style={{ color: 'var(--charcoal)' }}>{notif.title}</p>
                                {notif.body && (
                                  <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{notif.body}</p>
                                )}
                                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{timeAgo(notif.created_at)}</p>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                    <div className="px-4 py-2.5" style={{ borderTop: '1px solid var(--light-gray)' }}>
                      <Link
                        href="/dashboard/notifications"
                        onClick={() => setNotifOpen(false)}
                        className="block text-center text-sm hover:opacity-70"
                        style={{ color: 'var(--mint-dark)' }}
                      >
                        View all notifications
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Mode indicator pill */}
              <Link
                href="/dashboard"
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-opacity hover:opacity-80"
                style={{ backgroundColor: 'var(--gold-light)', color: 'var(--gold-dark)', border: '1px solid rgba(222,187,115,0.3)' }}
              >
                {dashMode === 'host' ? '🏠 Host' : '📢 Advertiser'}
              </Link>

              {/* User dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-black/5 transition-colors"
                  style={{ border: '1px solid var(--border)' }}
                >
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.firstName || 'Profile'} className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: 'var(--gold-light)', color: 'var(--gold-dark)' }}
                    >
                      {user.firstName ? initials : <User className="w-4 h-4" />}
                    </div>
                  )}
                  {user.firstName && (
                    <span className="text-sm font-medium" style={{ color: 'var(--charcoal)' }}>{user.firstName}</span>
                  )}
                  <ChevronDown
                    className="w-4 h-4"
                    style={{
                      color: 'var(--text-secondary)',
                      transform: dropdownOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s',
                    }}
                  />
                </button>

                {dropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-52 rounded-2xl overflow-hidden"
                    style={{ backgroundColor: '#fff', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}
                  >
                    <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--light-gray)' }}>
                      <p className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Signed in as</p>
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--charcoal)' }}>{user.firstName || user.email || 'you'}</p>
                    </div>
                    <div className="py-1">
                      <Link href="/dashboard" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--light-gray)] transition-colors" style={{ color: 'var(--charcoal)' }}>
                        <LayoutDashboard className="w-4 h-4" style={{ color: 'var(--mint-dark)' }} />
                        Dashboard
                      </Link>
                      <Link href="/dashboard/messages" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--light-gray)] transition-colors" style={{ color: 'var(--charcoal)' }}>
                        <div className="relative">
                          <MessageSquare className="w-4 h-4" style={{ color: 'var(--mint-dark)' }} />
                          {unreadMessages > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full text-xs font-bold flex items-center justify-center" style={{ backgroundColor: 'var(--red)', color: '#fff', fontSize: '9px' }}>
                              {unreadMessages > 9 ? '9+' : unreadMessages}
                            </span>
                          )}
                        </div>
                        Messages
                        {unreadMessages > 0 && (
                          <span className="ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--red)', color: '#fff' }}>
                            {unreadMessages}
                          </span>
                        )}
                      </Link>
                      <Link href="/dashboard/profile" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--light-gray)] transition-colors" style={{ color: 'var(--charcoal)' }}>
                        <User className="w-4 h-4" style={{ color: 'var(--mint-dark)' }} />
                        My Profile
                      </Link>
                      <Link href="/dashboard/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--light-gray)] transition-colors" style={{ color: 'var(--charcoal)' }}>
                        <Settings className="w-4 h-4" style={{ color: 'var(--mint-dark)' }} />
                        Settings
                      </Link>
                    </div>
                    <div className="py-1" style={{ borderTop: '1px solid var(--light-gray)' }}>
                      <button onClick={handleSwitchMode} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--light-gray)] transition-colors" style={{ color: 'var(--text-secondary)' }}>
                        <ArrowLeftRight className="w-4 h-4" style={{ color: 'var(--gold)' }} />
                        {dashMode === 'host' ? 'Switch to Advertiser' : 'Switch to Host'}
                      </button>
                    </div>
                    <div className="py-1" style={{ borderTop: '1px solid var(--light-gray)' }}>
                      <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--light-gray)] transition-colors" style={{ color: 'var(--red)' }}>
                        <LogOut className="w-4 h-4" />
                        Log Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-semibold px-5 py-2 rounded-full transition-all hover:border-[var(--charcoal)]"
                style={{ color: 'var(--charcoal)', border: '1px solid var(--border)' }}
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="text-sm font-semibold px-5 py-2 rounded-full transition-all hover:-translate-y-0.5"
                style={{
                  backgroundColor: 'var(--gold)',
                  color: 'var(--charcoal)',
                  boxShadow: '0 2px 8px rgba(222,187,115,0.3)',
                }}
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-black/5"
          style={{ color: 'var(--charcoal)', border: '1px solid var(--border)' }}
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="md:hidden px-6 pb-5 space-y-1"
          style={{
            background: 'rgba(255,255,255,0.96)',
            backdropFilter: 'blur(16px)',
            borderTop: '1px solid var(--border)',
          }}
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2.5 text-sm font-medium transition-colors"
              style={{
                color: pathname === link.href ? 'var(--charcoal)' : 'var(--text-secondary)',
                fontWeight: pathname === link.href ? 600 : 500,
              }}
            >
              {link.label}
            </Link>
          ))}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '8px' }}>
            {user ? (
              <>
                <div className="flex items-center gap-3 py-2 mb-2">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.firstName || 'Profile'} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'var(--gold-light)', color: 'var(--gold-dark)' }}>
                      {user.firstName ? initials : <User className="w-4 h-4" />}
                    </div>
                  )}
                  {user.firstName && (
                    <span className="text-sm font-medium" style={{ color: 'var(--charcoal)' }}>{user.firstName}</span>
                  )}
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--gold-light)', color: 'var(--gold-dark)' }}>
                    {dashMode === 'host' ? '🏠 Host' : '📢 Advertiser'}
                  </span>
                  {unreadCount > 0 && (
                    <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--red)', color: '#fff' }}>
                      {unreadCount} notif{unreadCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-2.5 text-sm hover:opacity-70" style={{ color: 'var(--charcoal)' }}>
                  <LayoutDashboard className="w-4 h-4" style={{ color: 'var(--mint-dark)' }} /> Dashboard
                </Link>
                <Link href="/dashboard/notifications" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-2.5 text-sm hover:opacity-70" style={{ color: 'var(--charcoal)' }}>
                  <Bell className="w-4 h-4" style={{ color: 'var(--mint-dark)' }} /> Notifications
                  {unreadCount > 0 && (
                    <span className="ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--red)', color: '#fff' }}>
                      {unreadCount}
                    </span>
                  )}
                </Link>
                <Link href="/dashboard/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-2.5 text-sm hover:opacity-70" style={{ color: 'var(--charcoal)' }}>
                  <User className="w-4 h-4" style={{ color: 'var(--mint-dark)' }} /> My Profile
                </Link>
                <Link href="/dashboard/settings" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-2.5 text-sm hover:opacity-70" style={{ color: 'var(--charcoal)' }}>
                  <Settings className="w-4 h-4" style={{ color: 'var(--mint-dark)' }} /> Settings
                </Link>
                <button onClick={() => { handleSwitchMode(); setMobileOpen(false) }} className="flex items-center gap-3 py-2.5 text-sm w-full hover:opacity-70" style={{ color: 'var(--gold-dark)' }}>
                  <ArrowLeftRight className="w-4 h-4" /> {dashMode === 'host' ? 'Switch to Advertiser' : 'Switch to Host'}
                </button>
                <button onClick={handleLogout} className="flex items-center gap-3 py-2.5 text-sm w-full hover:opacity-70" style={{ color: 'var(--red)' }}>
                  <LogOut className="w-4 h-4" /> Log Out
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2 pt-2">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block py-2.5 text-sm font-semibold text-center rounded-full"
                  style={{ color: 'var(--charcoal)', border: '1px solid var(--border)' }}
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="block py-2.5 text-sm font-semibold text-center rounded-full"
                  style={{ backgroundColor: 'var(--gold)', color: 'var(--charcoal)' }}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
