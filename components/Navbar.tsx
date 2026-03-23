'use client'

/**
 * Navbar — shared navigation across all pages
 * When logged in: user dropdown with Dashboard, My Profile, Settings, Log Out
 */
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, X, ChevronDown, LayoutDashboard, User, Settings, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface UserInfo {
  email?: string
  id: string
  firstName: string
  avatarUrl?: string
}

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [user, setUser] = useState<UserInfo | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { setUser(null); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', data.user.id)
        .single()

      const fullName = profile?.full_name || data.user.email || 'User'
      const firstName = fullName.split(' ')[0]

      setUser({
        email: data.user.email ?? undefined,
        id: data.user.id,
        firstName,
        avatarUrl: profile?.avatar_url ?? undefined,
      })
    })
  }, [pathname])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:opacity-80 transition-opacity"
                style={{ border: '1px solid rgba(255,255,255,0.12)' }}
              >
                {/* Avatar */}
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.firstName} className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'rgba(126,207,192,0.2)', color: '#7ecfc0' }}>
                    {initials}
                  </div>
                )}
                <span className="text-sm font-medium" style={{ color: '#f0f0ec' }}>{user.firstName}</span>
                <ChevronDown className="w-4 h-4" style={{ color: '#888', transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>

              {/* Dropdown */}
              {dropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-48 rounded-xl overflow-hidden"
                  style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                >
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid #f0f0ea' }}>
                    <p className="text-xs font-medium" style={{ color: '#aaa' }}>Signed in as</p>
                    <p className="text-sm font-semibold truncate" style={{ color: '#2b2b2b' }}>{user.firstName}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm hover:opacity-70 transition-opacity"
                      style={{ color: '#2b2b2b' }}
                    >
                      <LayoutDashboard className="w-4 h-4" style={{ color: '#7ecfc0' }} />
                      Dashboard
                    </Link>
                    <Link
                      href="/dashboard/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm hover:opacity-70 transition-opacity"
                      style={{ color: '#2b2b2b' }}
                    >
                      <User className="w-4 h-4" style={{ color: '#7ecfc0' }} />
                      My Profile
                    </Link>
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm hover:opacity-70 transition-opacity"
                      style={{ color: '#2b2b2b' }}
                    >
                      <Settings className="w-4 h-4" style={{ color: '#7ecfc0' }} />
                      Settings
                    </Link>
                  </div>
                  <div className="py-1" style={{ borderTop: '1px solid #f0f0ea' }}>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:opacity-70 transition-opacity"
                      style={{ color: '#dc2626' }}
                    >
                      <LogOut className="w-4 h-4" />
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium transition-colors" style={{ color: '#f0f0ec' }}>
                Login
              </Link>
              <Link
                href="/signup"
                className="text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                style={{ backgroundColor: '#ef4135', color: '#fff' }}
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
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2.5 text-sm font-medium"
              style={{ color: pathname === link.href ? '#7ecfc0' : '#f0f0ec' }}
            >
              {link.label}
            </Link>
          ))}
          <div style={{ borderTop: '1px solid #3d3d3d', paddingTop: '12px', marginTop: '8px' }}>
            {user ? (
              <>
                <div className="flex items-center gap-3 py-2 mb-2">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.firstName} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'rgba(126,207,192,0.2)', color: '#7ecfc0' }}>
                      {initials}
                    </div>
                  )}
                  <span className="text-sm font-medium" style={{ color: '#f0f0ec' }}>{user.firstName}</span>
                </div>
                <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-2.5 text-sm" style={{ color: '#f0f0ec' }}>
                  <LayoutDashboard className="w-4 h-4" style={{ color: '#7ecfc0' }} /> Dashboard
                </Link>
                <Link href="/dashboard/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-2.5 text-sm" style={{ color: '#f0f0ec' }}>
                  <User className="w-4 h-4" style={{ color: '#7ecfc0' }} /> My Profile
                </Link>
                <Link href="/dashboard/settings" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-2.5 text-sm" style={{ color: '#f0f0ec' }}>
                  <Settings className="w-4 h-4" style={{ color: '#7ecfc0' }} /> Settings
                </Link>
                <button onClick={handleLogout} className="flex items-center gap-3 py-2.5 text-sm w-full" style={{ color: '#dc2626' }}>
                  <LogOut className="w-4 h-4" /> Log Out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileOpen(false)} className="block py-2.5 text-sm font-medium" style={{ color: '#f0f0ec' }}>
                  Login
                </Link>
                <Link href="/signup" onClick={() => setMobileOpen(false)} className="block py-2.5 text-sm font-semibold px-4 rounded-lg text-center mt-2" style={{ backgroundColor: '#ef4135', color: '#fff' }}>
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
