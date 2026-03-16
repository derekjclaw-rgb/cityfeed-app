import Link from 'next/link'
import { MapPin, Users, CheckCircle, ArrowRight, Zap, Shield, TrendingUp } from 'lucide-react'

/**
 * City Feed Landing Page — Light theme, professional, clean
 */
export default function HomePage() {
  return (
    <div className="bg-white text-gray-900">
      {/* Hero */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-xs font-medium px-3 py-1.5 rounded-full mb-8">
            <Zap className="w-3 h-3" />
            The future of local advertising
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.05] text-gray-900">
            Advertise on{' '}
            <span className="text-[#22c55e]">your terms</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-500 mb-12 max-w-2xl mx-auto leading-relaxed">
            The peer-to-peer marketplace for local advertising. Book real-world ad placements in minutes — billboards, storefronts, digital screens, and more.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/marketplace"
              className="group inline-flex items-center gap-2 bg-[#22c55e] text-white font-semibold px-8 py-4 rounded-xl text-lg hover:bg-[#16a34a] transition-all hover:scale-105 shadow-lg shadow-green-200"
            >
              Find Ad Space
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/signup?role=host"
              className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 font-semibold px-8 py-4 rounded-xl text-lg hover:bg-gray-50 hover:border-gray-300 transition-all hover:scale-105 shadow-sm"
            >
              List Your Space
            </Link>
          </div>

          {/* Social proof */}
          <p className="mt-10 text-sm text-gray-400">
            Trusted by brands and local businesses across the US
          </p>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-gray-100 py-12 bg-white">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '2,400+', label: 'Active placements' },
            { value: '180+', label: 'Cities covered' },
            { value: '$0', label: 'Listing fee' },
            { value: '48hr', label: 'Avg. booking time' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl font-bold text-[#22c55e] mb-1">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">Dead simple to use</h2>
            <p className="text-gray-500 text-lg">From search to live in three steps</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: MapPin,
                title: 'Find your spot',
                desc: 'Browse thousands of verified ad placements by location, format, and budget. See traffic data, photos, and real specs.',
              },
              {
                step: '02',
                icon: CheckCircle,
                title: 'Book instantly',
                desc: 'Select your dates, upload your creative, and pay securely through Stripe. No haggling, no phone calls.',
              },
              {
                step: '03',
                icon: TrendingUp,
                title: 'Go live',
                desc: 'Your host posts the ad and submits proof of posting. You see it happen. Track your campaign from your dashboard.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative p-8 rounded-2xl bg-white border border-gray-100 shadow-sm hover:border-green-200 hover:shadow-md transition-all group"
              >
                <div className="text-6xl font-black text-gray-100 absolute top-6 right-6 leading-none select-none">
                  {item.step}
                </div>
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center mb-5">
                  <item.icon className="w-5 h-5 text-[#22c55e]" />
                </div>
                <h3 className="text-lg font-semibold mb-3 text-gray-900">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Hosts */}
      <section id="for-hosts" className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
              <Users className="w-3 h-3" />
              For hosts
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-tight text-gray-900">
              Turn empty walls into passive income
            </h2>
            <p className="text-gray-500 mb-8 leading-relaxed">
              Own a storefront, parking lot, vehicle fleet, or event space? List it on City Feed and start earning from advertisers looking for exactly what you have.
            </p>
            <ul className="space-y-4">
              {[
                'Free to list — no upfront costs',
                'You set the price and availability',
                'Stripe payouts directly to your account',
                'Verified advertisers only',
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-[#22c55e] flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/signup?role=host"
              className="mt-10 inline-flex items-center gap-2 bg-[#22c55e] text-white font-semibold px-6 py-3 rounded-xl hover:bg-[#16a34a] transition-colors shadow-lg shadow-green-200"
            >
              Start listing today
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Visual placeholder */}
          <div className="relative">
            <div className="aspect-square rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 flex items-center justify-center">
              <div className="text-center">
                <div className="text-7xl font-black text-green-200 mb-4">$$$</div>
                <div className="text-gray-400 text-sm">Your space, earning for you</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="py-16 px-6 bg-gray-50 border-t border-gray-100">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8 text-center">
          {[
            { icon: Shield, title: 'Secure payments', desc: 'Stripe-powered escrow. Funds release only after proof of posting.' },
            { icon: CheckCircle, title: 'Verified hosts', desc: 'Every listing goes through manual review before going live.' },
            { icon: Zap, title: 'Instant booking', desc: 'No back-and-forth. Book a placement in under 5 minutes.' },
          ].map((item) => (
            <div key={item.title} className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                <item.icon className="w-6 h-6 text-[#22c55e]" />
              </div>
              <div>
                <h3 className="font-semibold mb-1 text-gray-900">{item.title}</h3>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-gray-900">
            Ready to get your brand{' '}
            <span className="text-[#22c55e]">out there?</span>
          </h2>
          <p className="text-gray-500 mb-10 text-lg">
            Join thousands of advertisers and hosts already on City Feed.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="bg-[#22c55e] text-white font-semibold px-8 py-4 rounded-xl text-lg hover:bg-[#16a34a] transition-colors shadow-lg shadow-green-200"
            >
              Create free account
            </Link>
            <Link
              href="/marketplace"
              className="bg-white border border-gray-200 text-gray-700 font-semibold px-8 py-4 rounded-xl text-lg hover:bg-gray-50 transition-colors shadow-sm"
            >
              Browse placements
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
