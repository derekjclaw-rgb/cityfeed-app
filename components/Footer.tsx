import Link from 'next/link'
import { MapPin } from 'lucide-react'

/**
 * Footer — shared site-wide footer
 */
export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-[#22c55e] flex items-center justify-center">
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-gray-900">City Feed</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              The peer-to-peer marketplace for local advertising. Connect brands with real-world ad spaces.
            </p>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-gray-900 text-sm mb-4">Company</h4>
            <ul className="space-y-2.5">
              {['About', 'How It Works', 'Blog', 'Careers'].map((item) => (
                <li key={item}>
                  <Link href="#" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* For You */}
          <div>
            <h4 className="font-semibold text-gray-900 text-sm mb-4">For You</h4>
            <ul className="space-y-2.5">
              {['For Hosts', 'For Advertisers', 'Pricing', 'Help Center'].map((item) => (
                <li key={item}>
                  <Link href="#" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-gray-900 text-sm mb-4">Legal</h4>
            <ul className="space-y-2.5">
              {['Terms of Service', 'Privacy Policy', 'Cookie Policy'].map((item) => (
                <li key={item}>
                  <Link href="#" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} City Feed, Inc. All rights reserved.
          </p>
          <div className="flex gap-5">
            <Link href="#" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Privacy
            </Link>
            <Link href="#" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Terms
            </Link>
            <Link href="#" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
