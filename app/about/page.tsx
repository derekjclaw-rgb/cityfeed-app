import Link from 'next/link'
import { MapPin, CheckCircle, TrendingUp, ArrowRight } from 'lucide-react'

/**
 * About Page — How City Feed works in 3 steps
 */
export default function AboutPage() {
  return (
    <div style={{ backgroundColor: '#f0f0ec' }}>
      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6" style={{ color: '#2b2b2b' }}>
            About City Feed
          </h1>
          <p className="text-xl leading-relaxed" style={{ color: '#555' }}>
            We built City Feed to make real-world advertising simple, transparent, and accessible to everyone — not just big brands with agency budgets.
          </p>
        </div>
      </section>

      {/* How It Works — 3 Steps */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#2b2b2b' }}>How City Feed works</h2>
            <p className="text-lg" style={{ color: '#555' }}>From search to live in three straightforward steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: MapPin,
                title: 'Find your spot',
                desc: 'Browse verified ad placements by location, format, and budget. See traffic data, photos, and real specs — no surprises.',
              },
              {
                step: '02',
                icon: CheckCircle,
                title: 'Book instantly',
                desc: 'Select your dates, upload your creative, and pay securely. No haggling, no longterm contracts, no agency middlemen.',
              },
              {
                step: '03',
                icon: TrendingUp,
                title: 'Go live',
                desc: 'Your host posts the ad and submits proof of posting. You see it happen. Track your campaign directly from your dashboard.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative p-8 rounded-2xl"
                style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
              >
                <div className="text-6xl font-black absolute top-6 right-6 leading-none select-none" style={{ color: '#f0f0ec' }}>
                  {item.step}
                </div>
                <div className="text-xs font-black tracking-widest mb-3" style={{ color: '#E63946' }}>{item.step}</div>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-5" style={{ backgroundColor: 'rgba(126,207,192,0.12)' }}>
                  <item.icon className="w-5 h-5" style={{ color: '#7ecfc0' }} />
                </div>
                <h3 className="text-lg font-semibold mb-3" style={{ color: '#2b2b2b' }}>{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#555' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 px-6" style={{ backgroundColor: '#fff', borderTop: '1px solid #e0e0d8', borderBottom: '1px solid #e0e0d8' }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6" style={{ color: '#2b2b2b' }}>Our mission</h2>
          <p className="text-lg leading-relaxed mb-6" style={{ color: '#555' }}>
            The out-of-home advertising industry has been locked behind agency relationships and opaque pricing for decades. City Feed tears down that wall — giving any brand, business, or creator direct access to real-world ad placements at transparent prices.
          </p>
          <p className="text-lg leading-relaxed" style={{ color: '#555' }}>
            On the host side, we unlock value that was sitting idle — storefronts, parking lots, vehicle fleets, event spaces — and connect them with advertisers who want exactly what they have.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6" style={{ color: '#2b2b2b' }}>
            Ready to get started?
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 font-semibold px-8 py-4 rounded-xl text-lg hover:opacity-90 transition-all"
              style={{ backgroundColor: '#debb73', color: '#2b2b2b', boxShadow: '0 4px 16px rgba(222,187,115,0.35)' }}
            >
              Browse placements
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-2 font-semibold px-8 py-4 rounded-xl text-lg hover:opacity-90 transition-all"
              style={{ backgroundColor: '#fff', color: '#2b2b2b', border: '1px solid #e0e0d8' }}
            >
              How it works in detail
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
