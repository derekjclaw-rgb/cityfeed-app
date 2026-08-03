'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Calendar, Grid3X3, MessageSquare, Bookmark,
  Settings, HelpCircle, MapPin, LayoutGrid, Home, Menu, X,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type DashMode = 'advertiser' | 'host'

interface UserInfo {
  name: string
  email: string
  initials: string
}

// ─── Nav config ───────────────────────────────────────────────────────────────

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  badge?: number
  section: 'menu' | 'account'
}

const MENU_ITEMS: Omit<NavItem, 'badge' | 'section'>[] = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Bookings', href: '/dashboard/bookings', icon: Calendar },
  { label: 'Listings', href: '/dashboard/listings', icon: Grid3X3 },
  { label: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
  { label: 'Saved', href: '/dashboard/saved', icon: Bookmark },
]

const ACCOUNT_ITEMS: Omit<NavItem, 'badge' | 'section'>[] = [
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  { label: 'Help', href: '/dashboard/notifications', icon: HelpCircle },
]

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mode, setMode] = useState<DashMode>('advertiser')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [user, setUser] = useState<UserInfo | null>(null)
  const [bookingBadge, setBookingBadge] = useState(0)
  const [messageBadge, setMessageBadge] = useState(0)

  // ── Load user + mode + badge counts ──────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(async ({ data: { user: authUser } }) => {
      if (!authUser) return

      // Profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', authUser.id)
        .single()

      const name = profile?.full_name || authUser.email?.split('@')[0] || 'User'
      const email = profile?.email || authUser.email || ''
      const initials = name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
      setUser({ name, email, initials })

      // Saved mode
      const saved = localStorage.getItem('cf_dash_mode') as DashMode | null
      if (saved === 'host' || saved === 'advertiser') {
        setMode(saved)
      } else {
        const { count } = await supabase
          .from('listings')
          .select('id', { count: 'exact', head: true })
          .eq('host_id', authUser.id)
        setMode((count ?? 0) > 0 ? 'host' : 'advertiser')
      }

      // Badge counts
      const isHost = (saved === 'host') || ((saved !== 'advertiser') && ((await supabase.from('listings').select('id', { count: 'exact', head: true }).eq('host_id', authUser.id)).count ?? 0) > 0)

      const [bookingsRes, messagesRes] = await Promise.all([
        supabase.from('bookings').select('id', { count: 'exact', head: true })
          .eq(isHost ? 'host_id' : 'advertiser_id', authUser.id)
          .in('status', ['pending', 'pop_pending']),
        supabase.from('messages').select('id', { count: 'exact', head: true })
          .neq('sender_id', authUser.id)
          .eq('read', false),
      ])

      setBookingBadge(bookingsRes.count ?? 0)
      setMessageBadge(messagesRes.count ?? 0)
    })
  }, [])

  // ── Listen for external mode changes ─────────────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as DashMode
      if (detail === 'host' || detail === 'advertiser') setMode(detail)
    }
    window.addEventListener('cf_mode_change', handler)
    return () => window.removeEventListener('cf_mode_change', handler)
  }, [])

  // ── Mode toggle handler ──────────────────────────────────────────────────────
  const handleModeChange = useCallback((newMode: DashMode) => {
    setMode(newMode)
    localStorage.setItem('cf_dash_mode', newMode)
    window.dispatchEvent(new CustomEvent('cf_mode_change', { detail: newMode }))

    // Redirect when current page doesn't apply to the new mode
    if (newMode === 'advertiser' && pathname.startsWith('/dashboard/listings')) {
      router.push('/dashboard/bookings')
    } else if (newMode === 'host' && pathname.startsWith('/dashboard/bookings')) {
      router.push('/dashboard/listings')
    }
  }, [pathname, router])

  // ── Close mobile sidebar on route change ─────────────────────────────────────
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // ── Active check ─────────────────────────────────────────────────────────────
  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const getBadge = (label: string) => {
    if (label === 'Bookings') return bookingBadge
    if (label === 'Messages') return messageBadge
    return 0
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--cream, #f0f0ec)' }}>

      {/* ── Mobile hamburger button ─────────────────────────────────────── */}
      <button
        onClick={() => setMobileOpen(true)}
        className={`fixed top-4 left-4 z-[200] w-[42px] h-[42px] rounded-xl items-center justify-center md:hidden ${mobileOpen ? 'hidden' : 'flex'}`}
        style={{
          backgroundColor: 'var(--charcoal, #2b2b2b)',
          boxShadow: 'var(--shadow-md, 0 4px 16px rgba(43,43,43,0.06))',
        }}
        aria-label="Toggle navigation"
      >
        <Menu className="w-5 h-5 text-white" />
      </button>

      {/* ── Mobile overlay ──────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[90] bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-[100] w-[252px] flex flex-col transition-transform duration-300 ease-[cubic-bezier(.4,0,.2,1)] md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: 'var(--charcoal, #2b2b2b)' }}
      >
        {/* Logo — links back to homepage */}
        <Link href="/" className="block px-6 pt-7 pb-5 hover:opacity-80 transition-opacity">
          <img src="/logo-new.png" alt="City Feed" className="h-12 w-auto" style={{ filter: 'invert(1)', opacity: 0.95 }} />
        </Link>

        {/* Role Toggle */}
        <div className="mx-4 mb-5 flex rounded-[10px] p-[3px]" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}>
          <button
            onClick={() => handleModeChange('advertiser')}
            className="flex-1 flex items-center justify-center gap-[5px] py-[7px] rounded-lg text-xs font-semibold transition-all"
            style={mode === 'advertiser'
              ? { backgroundColor: 'var(--gold, #debb73)', color: 'var(--charcoal, #2b2b2b)', boxShadow: '0 2px 8px rgba(222,187,115,0.25)' }
              : { backgroundColor: 'transparent', color: 'rgba(255,255,255,0.45)' }
            }
          >
            <LayoutGrid className="w-[14px] h-[14px]" />
            Advertiser
          </button>
          <button
            onClick={() => handleModeChange('host')}
            className="flex-1 flex items-center justify-center gap-[5px] py-[7px] rounded-lg text-xs font-semibold transition-all"
            style={mode === 'host'
              ? { backgroundColor: 'var(--gold, #debb73)', color: 'var(--charcoal, #2b2b2b)', boxShadow: '0 2px 8px rgba(222,187,115,0.25)' }
              : { backgroundColor: 'transparent', color: 'rgba(255,255,255,0.45)' }
            }
          >
            <Home className="w-[14px] h-[14px]" />
            Host
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 flex flex-col gap-[2px]">
          {/* MENU section */}
          <span className="text-[10px] font-semibold uppercase tracking-[1.2px] px-3 pt-[18px] pb-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Menu
          </span>
          {MENU_ITEMS.filter((item) => {
            // Bookings visible only for advertisers, Listings only for hosts
            if (item.label === 'Bookings' && mode === 'host') return false
            if (item.label === 'Listings' && mode === 'advertiser') return false
            return true
          }).map((item) => {
            const active = isActive(item.href)
            const badge = getBadge(item.label)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-[14px] py-[10px] rounded-[10px] text-sm font-medium transition-all relative"
                style={active
                  ? { backgroundColor: 'rgba(126,207,192,0.12)', color: 'var(--mint, #7ecfc0)', fontWeight: 600 }
                  : { color: 'rgba(255,255,255,0.6)' }
                }
                onMouseEnter={(e) => { if (!active) { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.9)' } }}
                onMouseLeave={(e) => { if (!active) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' } }}
              >
                <Icon className="w-[18px] h-[18px] flex-shrink-0" style={{ opacity: active ? 1 : 0.7, color: active ? 'var(--mint, #7ecfc0)' : undefined }} />
                {item.label}
                {badge > 0 && (
                  <span
                    className="ml-auto text-[11px] font-bold text-white px-[7px] py-[1px] rounded-[20px] min-w-[20px] text-center"
                    style={{ backgroundColor: 'var(--red, #E63946)' }}
                  >
                    {badge}
                  </span>
                )}
              </Link>
            )
          })}

          {/* Divider */}
          <div className="h-px mx-3 my-2" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />

          {/* ACCOUNT section */}
          <span className="text-[10px] font-semibold uppercase tracking-[1.2px] px-3 pt-[18px] pb-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Account
          </span>
          {ACCOUNT_ITEMS.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-[14px] py-[10px] rounded-[10px] text-sm font-medium transition-all"
                style={active
                  ? { backgroundColor: 'rgba(126,207,192,0.12)', color: 'var(--mint, #7ecfc0)', fontWeight: 600 }
                  : { color: 'rgba(255,255,255,0.6)' }
                }
                onMouseEnter={(e) => { if (!active) { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.9)' } }}
                onMouseLeave={(e) => { if (!active) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' } }}
              >
                <Icon className="w-[18px] h-[18px] flex-shrink-0" style={{ opacity: active ? 1 : 0.7, color: active ? 'var(--mint, #7ecfc0)' : undefined }} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User Footer */}
        <div className="px-4 py-4 pb-5 flex items-center gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[13px] flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--gold, #debb73), var(--gold-dark, #c9a54e))', color: 'var(--charcoal, #2b2b2b)' }}
          >
            {user?.initials || '..'}
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-white truncate">{user?.name || 'Loading...'}</div>
            <div className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{user?.email || ''}</div>
          </div>
        </div>
      </aside>

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <main className="flex-1 min-h-screen md:ml-[252px]">
        {pathname.startsWith('/dashboard/messages') ? (
          <>
            {/* Mobile top spacer for hamburger clearance */}
            <div className="h-14 md:hidden" />
            {children}
          </>
        ) : (
          <div className="max-w-[960px] mx-auto px-4 py-10 md:px-9 md:py-10 md:pb-20" style={{ paddingTop: 'max(40px, env(safe-area-inset-top))' }}>
            {/* Mobile top spacer for hamburger clearance */}
            <div className="h-14 md:hidden" />
            {children}
          </div>
        )}
      </main>
    </div>
  )
}
