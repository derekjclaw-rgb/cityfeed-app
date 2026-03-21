import Link from 'next/link'
import Image from 'next/image'

/**
 * Footer — shared site-wide footer with updated legal links
 */
export default function Footer() {
  return (
    <footer style={{ backgroundColor: '#ddddd4', borderTop: '1px solid #c8c8be' }}>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="mb-4">
              <Image
                src="/logo.png"
                alt="City Feed"
                width={100}
                height={71}
                style={{ height: '32px', width: 'auto' }}
              />
            </div>
            <p className="text-sm leading-relaxed" style={{ color: '#888' }}>
              Real world marketplace for local advertising. Connect brands with real-world ad spaces.
            </p>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-sm mb-4" style={{ color: '#2b2b2b' }}>Company</h4>
            <ul className="space-y-2.5">
              <li><Link href="/about" className="text-sm transition-colors hover:opacity-70" style={{ color: '#888' }}>About</Link></li>
              <li><Link href="/how-it-works" className="text-sm transition-colors hover:opacity-70" style={{ color: '#888' }}>How It Works</Link></li>
              <li><Link href="#" className="text-sm transition-colors hover:opacity-70" style={{ color: '#888' }}>Blog</Link></li>
              <li><Link href="#" className="text-sm transition-colors hover:opacity-70" style={{ color: '#888' }}>Careers</Link></li>
            </ul>
          </div>

          {/* For You */}
          <div>
            <h4 className="font-semibold text-sm mb-4" style={{ color: '#2b2b2b' }}>For You</h4>
            <ul className="space-y-2.5">
              {['For Hosts', 'For Advertisers', 'Pricing', 'Help Center'].map((item) => (
                <li key={item}>
                  <Link href="#" className="text-sm transition-colors hover:opacity-70" style={{ color: '#888' }}>
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-sm mb-4" style={{ color: '#2b2b2b' }}>Legal</h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/terms" className="text-sm transition-colors hover:opacity-70" style={{ color: '#888' }}>
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm transition-colors hover:opacity-70" style={{ color: '#888' }}>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/privacy#cookies" className="text-sm transition-colors hover:opacity-70" style={{ color: '#888' }}>
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3" style={{ borderTop: '1px solid #c8c8be' }}>
          <p className="text-xs" style={{ color: '#aaa' }}>
            © {new Date().getFullYear()} City Feed, Inc. All rights reserved.
          </p>
          <div className="flex gap-5">
            <Link href="/privacy" className="text-xs transition-colors hover:opacity-70" style={{ color: '#aaa' }}>Privacy</Link>
            <Link href="/terms" className="text-xs transition-colors hover:opacity-70" style={{ color: '#aaa' }}>Terms</Link>
            <Link href="#" className="text-xs transition-colors hover:opacity-70" style={{ color: '#aaa' }}>Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
