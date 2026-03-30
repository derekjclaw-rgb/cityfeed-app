'use client'

/**
 * Navbar — shared navigation across all pages
 * When logged in: user dropdown with Dashboard, My Profile, Settings, Log Out
 * Phase 5: Notification bell with unread count
 * Phase 6: Host/Advertiser mode indicator + quick switch
 */
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, X, ChevronDown, LayoutDashboard, User, Settings, LogOut, Bell, ArrowLeftRight } from 'lucide-react'
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

      // Fetch notifications
      await loadNotifications(data.user.id)

      // Subscribe to new notifications via Realtime
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

    // Sync mode from localStorage
    const saved = localStorage.getItem('cf_dash_mode') as DashMode | null
    if (saved) setDashMode(saved)

    // Listen for mode changes from dashboard
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

  // Close dropdowns on outside click
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
    { href: '/about', label: 'About' },
    { href: '/how-it-works', label: 'How It Works' },
    { href: '/dashboard/create-listing', label: 'List Your Space' },
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
    <nav className="fixed top-0 w-full z-50" style={{ backgroundColor: '#2b2b2b', backdropFilter: 'blur(12px)', borderBottom: '1px solid #1a1a1a' }}>
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image
            src="/logo-nav.png"
            alt="City Feed"
            width={180}
            height={100}
            style={{ height: '48px', width: 'auto' }}
            priority
          />
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium transition-colors"
              style={{ color: pathname === link.href ? '#7ecfc0' : '#f0f0ec' }}
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
                  className="relative w-9 h-9 rounded-xl flex items-center justify-center hover:opacity-80 transition-opacity"
                  style={{ border: '1px solid rgba(255,255,255,0.12)' }}
                >
                  <Bell className="w-4 h-4" style={{ color: '#f0f0ec' }} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs font-bold flex items-center justify-center" style={{ backgroundColor: '#E63946', color: '#fff', fontSize: '10px' }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div
                    className="absolute right-0 mt-2 w-80 rounded-xl overflow-hidden"
                    style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                  >
                    <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #f0f0ea' }}>
                      <p className="font-semibold text-sm" style={{ color: '#2b2b2b' }}>Notifications</p>
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} className="text-xs hover:opacity-70" style={{ color: '#7ecfc0' }}>Mark all read</button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <Bell className="w-8 h-8 mx-auto mb-2" style={{ color: '#e0e0d8' }} />
                          <p className="text-sm" style={{ color: '#888' }}>No notifications yet</p>
                        </div>
                      ) : (
                        notifications.slice(0, 5).map(notif => (
                          <button
                            key={notif.id}
                            onClick={() => markNotifRead(notif.id, notif.href)}
                            className="w-full text-left px-4 py-3 hover:opacity-70 transition-opacity"
                            style={{
                              borderBottom: '1px solid #f5f5f0',
                              backgroundColor: notif.read ? 'transparent' : 'rgba(126,207,192,0.05)',
                            }}
                          >
                            <div className="flex items-start gap-2">
                              {!notif.read && (
                                <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: '#7ecfc0' }} />
                              )}
                              <div className={notif.read ? '' : 'ml-0'} style={{ flex: 1 }}>
                                <p className="text-sm font-medium" style={{ color: '#2b2b2b' }}>{notif.title}</p>
                                {notif.body && (
                                  <p className="text-xs mt-0.5 line-clamp-2" style={{ color: '#888' }}>{notif.body}</p>
                                )}
                                <p className="text-xs mt-1" style={{ color: '#bbb' }}>{timeAgo(notif.created_at)}</p>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                    <div className="px-4 py-2.5" style={{ borderTop: '1px solid #f0f0ea' }}>
                      <Link
                        href="/dashboard/notifications"
                        onClick={() => setNotifOpen(false)}
                        className="block text-center text-sm hover:opacity-70"
                        style={{ color: '#7ecfc0' }}
                      >
                        View all notifications
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Mode indicator pill */}
              <Link href="/dashboard" className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                style={{ backgroundColor: 'rgba(222,187,115,0.15)', color: '#debb73', border: '1px solid rgba(222,187,115,0.3)' }}>
                {dashMode === 'host' ? '🏠 Host' : '📢 Advertiser'}
              </Link>

              {/* User dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:opacity-80 transition-opacity"
                  style={{ border: '1px solid rgba(255,255,255,0.12)' }}
                >
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.firstName || 'Profile'} className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'rgba(126,207,192,0.2)', color: '#7ecfc0' }}>
                      {user.firstName ? initials : <User className="w-4 h-4" />}
                    </div>
                  )}
                  {user.firstName && (
                    <span className="text-sm font-medium" style={{ color: '#f0f0ec' }}>{user.firstName}</span>
                  )}
                  <ChevronDown className="w-4 h-4" style={{ color: '#888', transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>

                {dropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-48 rounded-xl overflow-hidden"
                    style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                  >
                    <div className="px-4 py-3" style={{ borderBottom: '1px solid #f0f0ea' }}>
                      <p className="text-xs font-medium" style={{ color: '#aaa' }}>Signed in as</p>
                      <p className="text-sm font-semibold truncate" style={{ color: '#2b2b2b' }}>{user.firstName || user.email || 'you'}</p>
                    </div>
                    <div className="py-1">
                      <Link href="/dashboard" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:opacity-70 transition-opacity" style={{ color: '#2b2b2b' }}>
                        <LayoutDashboard className="w-4 h-4" style={{ color: '#7ecfc0' }} />
                        Dashboard
                      </Link>
                      <Link href="/dashboard/profile" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:opacity-70 transition-opacity" style={{ color: '#2b2b2b' }}>
                        <User className="w-4 h-4" style={{ color: '#7ecfc0' }} />
                        My Profile
                      </Link>
                      <Link href="/dashboard/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:opacity-70 transition-opacity" style={{ color: '#2b2b2b' }}>
                        <Settings className="w-4 h-4" style={{ color: '#7ecfc0' }} />
                        Settings
                      </Link>
                    </div>
                    <div className="py-1" style={{ borderTop: '1px solid #f0f0ea' }}>
                      <button onClick={handleSwitchMode} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:opacity-70 transition-opacity" style={{ color: '#888' }}>
                        <ArrowLeftRight className="w-4 h-4" style={{ color: '#debb73' }} />
                        {dashMode === 'host' ? 'Switch to Advertiser' : 'Switch to Host'}
                      </button>
                    </div>
                    <div className="py-1" style={{ borderTop: '1px solid #f0f0ea' }}>
                      <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:opacity-70 transition-opacity" style={{ color: '#dc2626' }}>
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
              <Link href="/login" className="text-sm font-medium transition-colors" style={{ color: '#f0f0ec' }}>
                Login
              </Link>
              <Link
                href="/signup"
                className="text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                style={{ backgroundColor: '#debb73', color: '#2b2b2b' }}
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden"
          style={{ color: '#f0f0ec' }}
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden px-6 pb-4 space-y-1" style={{ backgroundColor: '#2b2b2b', borderTop: '1px solid #3d3d3d' }}>
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className="block py-2.5 text-sm font-medium" style={{ color: pathname === link.href ? '#7ecfc0' : '#f0f0ec' }}>
              {link.label}
            </Link>
          ))}
          <div style={{ borderTop: '1px solid #3d3d3d', paddingTop: '12px', marginTop: '8px' }}>
            {user ? (
              <>
                <div className="flex items-center gap-3 py-2 mb-2">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.firstName || 'Profile'} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'rgba(126,207,192,0.2)', color: '#7ecfc0' }}>
                      {user.firstName ? initials : <User className="w-4 h-4" />}
                    </div>
                  )}
                  {user.firstName && (
                    <span className="text-sm font-medium" style={{ color: '#f0f0ec' }}>{user.firstName}</span>
                  )}
                  {/* Mode indicator badge */}
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-lg" style={{ backgroundColor: 'rgba(222,187,115,0.15)', color: '#debb73', border: '1px solid rgba(222,187,115,0.3)' }}>
                    {dashMode === 'host' ? '🏠 Host' : '📢 Advertiser'}
                  </span>
                  {unreadCount > 0 && (
                    <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#E63946', color: '#fff' }}>
                      {unreadCount} notif{unreadCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-2.5 text-sm" style={{ color: '#f0f0ec' }}>
                  <LayoutDashboard className="w-4 h-4" style={{ color: '#7ecfc0' }} /> Dashboard
                </Link>
                <Link href="/dashboard/notifications" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-2.5 text-sm" style={{ color: '#f0f0ec' }}>
                  <Bell className="w-4 h-4" style={{ color: '#7ecfc0' }} /> Notifications
                  {unreadCount > 0 && (
                    <span className="ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#E63946', color: '#fff' }}>
                      {unreadCount}
                    </span>
                  )}
                </Link>
                <Link href="/dashboard/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-2.5 text-sm" style={{ color: '#f0f0ec' }}>
                  <User className="w-4 h-4" style={{ color: '#7ecfc0' }} /> My Profile
                </Link>
                <Link href="/dashboard/settings" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-2.5 text-sm" style={{ color: '#f0f0ec' }}>
                  <Settings className="w-4 h-4" style={{ color: '#7ecfc0' }} /> Settings
                </Link>
                <button onClick={() => { handleSwitchMode(); setMobileOpen(false) }} className="flex items-center gap-3 py-2.5 text-sm w-full" style={{ color: '#debb73' }}>
                  <ArrowLeftRight className="w-4 h-4" /> {dashMode === 'host' ? 'Switch to Advertiser' : 'Switch to Host'}
                </button>
                <button onClick={handleLogout} className="flex items-center gap-3 py-2.5 text-sm w-full" style={{ color: '#dc2626' }}>
                  <LogOut className="w-4 h-4" /> Log Out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileOpen(false)} className="block py-2.5 text-sm font-medium" style={{ color: '#f0f0ec' }}>
                  Login
                </Link>
                <Link href="/signup" onClick={() => setMobileOpen(false)} className="block py-2.5 text-sm font-semibold px-4 rounded-lg text-center mt-2" style={{ backgroundColor: '#debb73', color: '#2b2b2b' }}>
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
