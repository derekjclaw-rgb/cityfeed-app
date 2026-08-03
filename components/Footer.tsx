import Link from 'next/link'

/**
 * Footer v2 — Dark charcoal with 4-column grid
 * Matches the design mockups: brand dot, link columns, bottom bar
 */
export default function Footer() {
  return (
    <footer style={{ backgroundColor: 'var(--charcoal)' }}>
      <div className="max-w-[1120px] mx-auto px-6 pt-14 pb-8">
        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2.5 mb-3.5 hover:opacity-80 transition-opacity">
              <img src="/C.png" alt="CF" className="w-7 h-7 rounded-lg flex-shrink-0" />
              <span className="text-lg font-extrabold text-white tracking-tight" style={{ letterSpacing: '-0.5px' }}>CITY FEED</span>
            </Link>
            <p className="text-sm leading-relaxed max-w-[280px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
              The marketplace for local, real-world advertising. Book unique placements — billboards, storefronts, transit, and more.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4
              className="text-xs font-bold uppercase tracking-widest mb-4"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              Product
            </h4>
            <div className="space-y-2.5">
              <Link href="/marketplace" className="block text-sm transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Marketplace
              </Link>
              <Link href="/how-it-works" className="block text-sm transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.6)' }}>
                How It Works
              </Link>
              <Link href="/how-it-works#pricing" className="block text-sm transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Pricing
              </Link>
              <Link href="/signup?role=host" className="block text-sm transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.6)' }}>
                For Hosts
              </Link>
            </div>
          </div>

          {/* Company */}
          <div>
            <h4
              className="text-xs font-bold uppercase tracking-widest mb-4"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              Company
            </h4>
            <div className="space-y-2.5">
              <Link href="/about" className="block text-sm transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.6)' }}>
                About
              </Link>
              <a href="mailto:mk@cityfeed.io" className="block text-sm transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Contact
              </a>
            </div>
          </div>

          {/* Support */}
          <div>
            <h4
              className="text-xs font-bold uppercase tracking-widest mb-4"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              Support
            </h4>
            <div className="space-y-2.5">
              <a href="mailto:mk@cityfeed.io" className="block text-sm transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Help Center
              </a>
              <Link href="/terms" className="block text-sm transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Terms of Service
              </Link>
              <Link href="/privacy" className="block text-sm transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            © {new Date().getFullYear()} City Feed, Inc. All rights reserved.
          </p>
          <div className="flex gap-5">
            <Link href="/privacy" className="text-xs transition-colors hover:text-white/60" style={{ color: 'rgba(255,255,255,0.3)' }}>Privacy</Link>
            <Link href="/terms" className="text-xs transition-colors hover:text-white/60" style={{ color: 'rgba(255,255,255,0.3)' }}>Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
