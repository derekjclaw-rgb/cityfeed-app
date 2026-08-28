'use client'

/**
 * LayoutShell — Conditionally renders Navbar + Footer
 * Dashboard and admin routes get their own sidebar layouts, so we hide
 * the global nav/footer there (the fixed public navbar was overlapping
 * God View headers — fixed 2026-08-27).
 */
import { usePathname } from 'next/navigation'
import Navbar from './Navbar'
import Footer from './Footer'

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isDashboard = pathname.startsWith('/dashboard') || pathname.startsWith('/admin')

  return (
    <>
      {!isDashboard && <Navbar />}
      <main className="min-h-screen">{children}</main>
      {!isDashboard && <Footer />}
    </>
  )
}
