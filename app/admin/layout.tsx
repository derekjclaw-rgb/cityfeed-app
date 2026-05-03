'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, CalendarCheck, LayoutList, Users, DollarSign,
  LogOut, ExternalLink,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/bookings', label: 'Bookings', icon: CalendarCheck },
  { href: '/admin/listings', label: 'Listings', icon: LayoutList },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/financials', label: 'Financials', icon: DollarSign },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  // Don't render admin chrome on login page
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#1e1e1e' }}>
      {/* Sidebar */}
      <aside
        className="w-60 flex-shrink-0 flex flex-col border-r"
        style={{ background: '#2b2b2b', borderColor: '#3a3a3a' }}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b" style={{ borderColor: '#3a3a3a' }}>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
              style={{ background: '#debb73', color: '#2b2b2b' }}
            >
              CF
            </div>
            <div>
              <div className="text-white font-semibold text-sm">City Feed</div>
              <div className="text-[11px]" style={{ color: '#888' }}>God View</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
                style={{
                  background: active ? '#debb7320' : 'transparent',
                  color: active ? '#debb73' : '#aaa',
                }}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t space-y-1" style={{ borderColor: '#3a3a3a' }}>
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
            style={{ color: '#888' }}
          >
            <ExternalLink className="w-4 h-4" />
            Back to site
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full text-left transition-colors hover:opacity-80"
            style={{ color: '#888' }}
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto" style={{ background: '#1e1e1e' }}>
        <div className="p-8 max-w-[1400px]">
          {children}
        </div>
      </main>
    </div>
  )
}
