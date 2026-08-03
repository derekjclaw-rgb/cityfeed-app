'use client'

/**
 * LayoutShell — Conditionally renders Navbar + Footer
 * Dashboard routes get their own sidebar layout, so we hide global nav/footer there.
 */
import { usePathname } from 'next/navigation'
import Navbar from './Navbar'
import Footer from './Footer'

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isDashboard = pathname.startsWith('/dashboard')

  return (
    <>
      {!isDashboard && <Navbar />}
      <main className="min-h-screen">{children}</main>
      {!isDashboard && <Footer />}
    </>
  )
}
