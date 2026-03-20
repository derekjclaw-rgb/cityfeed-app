'use client'

/**
 * Navbar — shared navigation across all pages
 * City Feed logo + updated links including About + How It Works
 */
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function Navbar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [user, setUser] = useState<{ email?: string } | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ? { email: data.user.email ?? undefined } : null)
    })
  }, [])

  const navLinks = [
    { href: '/marketplace', label: 'Marketplace' },
    { href: '/about', label: 'About' },
    { href: '/how-it-works', label: 'How It Works' },
    { href: '/dashboard/create-listing', label: 'List Your Space' },
  ]

  return (
    <nav className="fixed top-0 w-full z-50" style={{ backgroundColor: '#2b2b2b', backdropFilter: 'blur(12px)', borderBottom: '1px solid #1a1a1a' }}>
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="City Feed"
            width={160}
            height={114}
            style={{ height: '52px', width: 'auto' }}
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
              style={{
                color: pathname === link.href ? '#e6964d' : '#e6e6dd',
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
              <Link
                href="/dashboard/listings"
                className="text-sm font-medium transition-colors"
                style={{ color: '#e6e6dd' }}
              >
                Dashboard
              </Link>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: 'rgba(230,150,77,0.2)', color: '#e6964d' }}
              >
                {user.email?.charAt(0).toUpperCase() ?? 'U'}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium transition-colors"
                style={{ color: '#e6e6dd' }}
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                style={{ backgroundColor: '#e6964d', color: '#fff' }}
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden"
          style={{ color: '#e6e6dd' }}
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden px-6 pb-4 space-y-3" style={{ backgroundColor: '#2b2b2b', borderTop: '1px solid #3d3d3d' }}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm font-medium"
              style={{ color: '#e6e6dd' }}
            >
              {link.label}
            </Link>
          ))}
          <hr style={{ borderColor: '#3d3d3d' }} />
          {user ? (
            <Link
              href="/dashboard/listings"
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm font-medium"
              style={{ color: '#e6e6dd' }}
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="block py-2 text-sm font-medium"
                style={{ color: '#e6e6dd' }}
              >
                Login
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileOpen(false)}
                className="block py-2 text-sm font-semibold px-4 rounded-lg text-center"
                style={{ backgroundColor: '#e6964d', color: '#fff' }}
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
