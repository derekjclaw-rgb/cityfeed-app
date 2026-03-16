'use client'

/**
 * Navbar — shared navigation across all pages
 * Light theme, responsive with mobile hamburger menu
 */
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MapPin, Menu, X } from 'lucide-react'
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
    { href: '/dashboard/create-listing', label: 'List Your Space' },
  ]

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/60">
      <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#22c55e] flex items-center justify-center">
            <MapPin className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight text-gray-900">
            City Feed
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                pathname === link.href
                  ? 'text-[#22c55e]'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
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
                className="text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors"
              >
                Dashboard
              </Link>
              <div className="w-8 h-8 rounded-full bg-[#22c55e]/10 flex items-center justify-center text-[#22c55e] text-xs font-bold">
                {user.email?.charAt(0).toUpperCase() ?? 'U'}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="text-sm bg-[#22c55e] text-white font-semibold px-4 py-2 rounded-lg hover:bg-[#16a34a] transition-colors"
              >
                Get started
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-gray-600"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-6 pb-4 space-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              {link.label}
            </Link>
          ))}
          <hr className="border-gray-100" />
          {user ? (
            <Link
              href="/dashboard/listings"
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm font-medium text-gray-600"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="block py-2 text-sm font-medium text-gray-600"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileOpen(false)}
                className="block py-2 text-sm bg-[#22c55e] text-white font-semibold px-4 rounded-lg text-center"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
