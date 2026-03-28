import Link from 'next/link'
import { MapPin, CheckCircle, TrendingUp, Users, Shield, Zap, ArrowRight } from 'lucide-react'

/**
 * How It Works Page — detailed steps, host section, trust blocks, CTAs
 */
export default function HowItWorksPage() {
  return (
    <div style={{ backgroundColor: '#f0f0ec' }}>
      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6" style={{ color: '#2b2b2b' }}>
            How City Feed works
          </h1>
          <p className="text-xl leading-relaxed" style={{ color: '#555' }}>
            Whether you&apos;re an advertiser looking to get your brand out in the real world, or a host ready to monetize your space — this is how it works.
          </p>
        </div>
      </section>

      {/* For Advertisers */}
      <section className="py-20 px-6" style={{ backgroundColor: '#fff', borderTop: '1px solid #e0e0d8', borderBottom: '1px solid #e0e0d8' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-4" style={{ backgroundColor: 'rgba(126,207,192,0.12)', color: '#7ecfc0' }}>
              For Advertisers
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#2b2b2b' }}>Book a placement in minutes</h2>
            <p className="text-lg" style={{ color: '#555' }}>From discovery to live in three steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: MapPin,
                title: 'Find your spot',
                desc: 'Browse thousands of verified ad placements filtered by city, format, budget, and audience. Every listing includes real traffic data, dimensions, photos, and host reviews.',
                detail: 'Search Digital Billboards, Transit, Storefront, Event-Based, and more across 180+ cities.',
              },
              {
                step: '02',
                icon: CheckCircle,
                title: 'Book instantly',
                desc: 'Select your campaign dates, upload your creative files, and pay securely through Stripe. No phone calls, no RFPs, no agency markup.',
                detail: 'Funds are held in escrow and only released to the host after proof of posting.',
              },
              {
                step: '03',
                icon: TrendingUp,
                title: 'Go live',
                desc: 'Your host installs the ad and submits photo/video proof. You track everything from your dashboard — no guesswork, no chasing.',
                detail: 'Campaigns typically go live within 1–7 business days depending on production requirements.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative p-8 rounded-2xl"
                style={{ backgroundColor: '#f0f0ec', border: '1px solid #e0e0d8' }}
              >
                <div className="text-6xl font-black absolute top-6 right-6 leading-none select-none" style={{ color: '#ddddd4' }}>
                  {item.step}
                </div>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-5" style={{ backgroundColor: 'rgba(126,207,192,0.15)' }}>
                  <item.icon className="w-5 h-5" style={{ color: '#7ecfc0' }} />
                </div>
                <h3 className="text-lg font-semibold mb-3" style={{ color: '#2b2b2b' }}>{item.title}</h3>
                <p className="text-sm leading-relaxed mb-3" style={{ color: '#555' }}>{item.desc}</p>
                <p className="text-xs" style={{ color: '#888' }}>{item.detail}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 font-semibold px-8 py-4 rounded-xl text-base hover:opacity-90 transition-all"
              style={{ backgroundColor: '#debb73', color: '#2b2b2b', boxShadow: '0 4px 16px rgba(222,187,115,0.35)' }}
            >
              Browse placements
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* For Hosts */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-6" style={{ backgroundColor: 'rgba(126,207,192,0.12)', color: '#7ecfc0' }}>
              <Users className="w-3 h-3" />
              For Hosts
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-tight" style={{ color: '#2b2b2b' }}>
              Turn empty walls into passive income
            </h2>
            <p className="mb-8 leading-relaxed" style={{ color: '#555' }}>
              Own a storefront, parking lot, vehicle fleet, or event space? List it on City Feed and start earning from advertisers looking for exactly what you have. Free to list, you set your price.
            </p>
            <ul className="space-y-4">
              {[
                'Free to list — no upfront costs',
                'You set the price and availability',
                'Stripe payouts directly to your account',
                'Verified advertisers only',
                'Submit proof of posting through the dashboard',
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm" style={{ color: '#555' }}>
                  <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#7ecfc0' }} />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/signup?role=host"
              className="mt-10 inline-flex items-center gap-2 font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-colors"
              style={{ backgroundColor: '#debb73', color: '#2b2b2b', boxShadow: '0 4px 16px rgba(222,187,115,0.35)' }}
            >
              Start listing today
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Visual */}
          <div className="relative">
            <div className="aspect-square rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8' }}>
              <div className="text-center">
                <div className="text-7xl font-black mb-4" style={{ color: '#f0f0ec' }}>$$$</div>
                <div className="text-sm" style={{ color: '#888' }}>Your space, earning for you</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Blocks */}
      <section className="py-16 px-6" style={{ backgroundColor: '#fff', borderTop: '1px solid #e0e0d8', borderBottom: '1px solid #e0e0d8' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold" style={{ color: '#2b2b2b' }}>Built on trust</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {[
              { icon: Shield, title: 'Secure payments', desc: 'Stripe-powered escrow. Funds release only after proof of posting is confirmed.' },
              { icon: CheckCircle, title: 'Verified hosts', desc: 'Every listing goes through manual review before going live on the marketplace.' },
              { icon: Zap, title: 'Instant booking', desc: 'No back-and-forth. Book a placement in under 5 minutes, any time of day.' },
            ].map((item) => (
              <div key={item.title} className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(126,207,192,0.12)' }}>
                  <item.icon className="w-6 h-6" style={{ color: '#7ecfc0' }} />
                </div>
                <div>
                  <h3 className="font-semibold mb-1" style={{ color: '#2b2b2b' }}>{item.title}</h3>
                  <p className="text-sm" style={{ color: '#555' }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dual CTA */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
          <div className="p-8 rounded-2xl text-center" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8' }}>
            <h3 className="text-xl font-bold mb-3" style={{ color: '#2b2b2b' }}>I want to advertise</h3>
            <p className="text-sm mb-6" style={{ color: '#555' }}>Browse thousands of real-world ad placements and book in minutes.</p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-all"
              style={{ backgroundColor: '#debb73', color: '#2b2b2b' }}
            >
              Create account
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="p-8 rounded-2xl text-center" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8' }}>
            <h3 className="text-xl font-bold mb-3" style={{ color: '#2b2b2b' }}>I have space to list</h3>
            <p className="text-sm mb-6" style={{ color: '#555' }}>Start earning from your storefront, parking lot, fleet, or event space.</p>
            <Link
              href="/signup?role=host"
              className="inline-flex items-center gap-2 font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-all"
              style={{ backgroundColor: '#2b2b2b', color: '#fff' }}
            >
              List your space
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
