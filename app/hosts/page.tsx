import type { Metadata } from 'next'
import Link from 'next/link'
import Reveal from '@/components/Reveal'

export const metadata: Metadata = {
  title: 'For Hosts — City Feed',
  description:
    'See the opportunity in the spaces around you. Turn your storefront, vehicle, wall, or screen into income with City Feed.',
}

/* ─── Inline SVGs ─── */

function IconWindow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#c9a54e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 26, height: 26, marginBottom: 14, display: 'block' }}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="12" y1="3" x2="12" y2="21" />
    </svg>
  )
}

function IconMonitor() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#c9a54e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 26, height: 26, marginBottom: 14, display: 'block' }}>
      <rect x="2" y="4" width="20" height="14" rx="2" />
      <line x1="8" y1="22" x2="16" y2="22" />
      <line x1="12" y1="18" x2="12" y2="22" />
    </svg>
  )
}

function IconBuilding() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#c9a54e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 26, height: 26, marginBottom: 14, display: 'block' }}>
      <path d="M3 21V8l9-5 9 5v13" />
      <line x1="3" y1="21" x2="21" y2="21" />
      <line x1="9" y1="21" x2="9" y2="13" />
      <line x1="15" y1="21" x2="15" y2="13" />
    </svg>
  )
}

function IconCar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#c9a54e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 26, height: 26, marginBottom: 14, display: 'block' }}>
      <path d="M14 16H9m10 0h1a1 1 0 0 0 1-1v-4l-3-5H6L3 11v4a1 1 0 0 0 1 1h1" />
      <circle cx="7" cy="16" r="2" />
      <circle cx="17" cy="16" r="2" />
    </svg>
  )
}

function IconCoffee() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#c9a54e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 26, height: 26, marginBottom: 14, display: 'block' }}>
      <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
      <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z" />
    </svg>
  )
}

function IconGlobe() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#c9a54e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 26, height: 26, marginBottom: 14, display: 'block' }}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      <line x1="2" y1="12" x2="22" y2="12" />
    </svg>
  )
}

/* Control band icons (gold on charcoal) */
function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#debb73" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 26, height: 26, marginBottom: 16, display: 'block' }}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#debb73" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 26, height: 26, marginBottom: 16, display: 'block' }}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function IconDollar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#debb73" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 26, height: 26, marginBottom: 16, display: 'block' }}>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

function IconLock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#debb73" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 26, height: 26, marginBottom: 16, display: 'block' }}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

/* ───────────────────────────────────────── */

export default function HostsPage() {
  return (
    <div style={{ backgroundColor: '#f0f0ec' }}>

      {/* ── 1 · HERO ── */}
      <section className="px-6" style={{ paddingTop: 110, paddingBottom: 80, textAlign: 'center' }}>
        <div className="mx-auto" style={{ maxWidth: 1060 }}>
          <Reveal>
            <span style={{
              display: 'inline-block', fontSize: 12, fontWeight: 700,
              letterSpacing: '2.5px', textTransform: 'uppercase',
              color: '#c9a54e', backgroundColor: '#f5edda',
              border: '1px solid #debb73', padding: '6px 14px',
              borderRadius: 999, marginBottom: 28,
            }}>
              For Hosts
            </span>
          </Reveal>
          <Reveal delay={1}>
            <h1 style={{
              fontSize: 'clamp(38px, 6vw, 62px)', lineHeight: 1.08,
              letterSpacing: '-1.5px', fontWeight: 800,
              maxWidth: 840, margin: '0 auto 24px', color: '#2b2b2b',
            }}>
              See the opportunity in the{' '}
              <span style={{ color: '#c9a54e' }}>spaces around you.</span>
            </h1>
          </Reveal>
          <Reveal delay={2}>
            <p style={{ fontSize: 20, color: '#2b2b2b', fontWeight: 600, maxWidth: 620, margin: '0 auto 18px' }}>
              Your space already has value. City Feed gives you a new way to unlock it.
            </p>
          </Reveal>
          <Reveal delay={2}>
            <p style={{ fontSize: 17, color: '#555', maxWidth: 620, margin: '0 auto 40px' }}>
              From a storefront window to a bar top, blank wall, vehicle, screen, or something entirely unexpected — if you control a space that captures attention, you can create an opportunity for brands to be part of it.
            </p>
          </Reveal>
          <Reveal delay={3}>
            <Link
              href="/signup?role=host"
              style={{
                display: 'inline-block', fontWeight: 700, fontSize: 16,
                padding: '16px 34px', borderRadius: 14, textDecoration: 'none',
                letterSpacing: '-0.2px', color: '#2b2b2b',
                backgroundColor: '#debb73',
                boxShadow: '0 4px 18px rgba(222,187,115,0.4)',
              }}
            >
              Start Hosting
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── 2 · WHAT COUNTS AS AD SPACE ── */}
      <section className="px-6" style={{
        backgroundColor: '#fff',
        borderTop: '1px solid #e0e0d8',
        borderBottom: '1px solid #e0e0d8',
        paddingTop: 90, paddingBottom: 90,
        textAlign: 'center',
      }}>
        <div className="mx-auto" style={{ maxWidth: 1060 }}>
          <Reveal>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#c9a54e', marginBottom: 14 }}>Your space. Your opportunity.</div>
          </Reveal>
          <Reveal delay={1}>
            <h2 style={{ fontSize: 34, letterSpacing: '-0.8px', fontWeight: 800, marginBottom: 18, color: '#2b2b2b' }}>Think beyond traditional ad space.</h2>
          </Reveal>
          <Reveal delay={2}>
            <p style={{ color: '#555', fontSize: 17, maxWidth: 620, margin: '0 auto 24px' }}>
              You don&apos;t need to own a billboard or operate a media company to participate in the advertising economy.
            </p>
          </Reveal>
          <Reveal delay={2}>
            <p style={{ color: '#555', fontSize: 17, maxWidth: 620, margin: '0 auto 48px' }}>
              Look at the spaces you already control differently. Where do people spend time? What do they look at? What could a brand creatively become part of?
            </p>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 20 }}>
            <Reveal>
              <div style={{ backgroundColor: '#f0f0ec', border: '1px solid #e0e0d8', borderRadius: 18, padding: '30px 26px', textAlign: 'left' }}>
                <IconWindow />
                <h4 style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.3px', marginBottom: 6, color: '#2b2b2b' }}>Storefronts &amp; Windows</h4>
                <p style={{ fontSize: 14, color: '#555' }}>Turn street-facing visibility into an opportunity for brands to reach your neighborhood.</p>
              </div>
            </Reveal>
            <Reveal delay={1}>
              <div style={{ backgroundColor: '#f0f0ec', border: '1px solid #e0e0d8', borderRadius: 18, padding: '30px 26px', textAlign: 'left' }}>
                <IconMonitor />
                <h4 style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.3px', marginBottom: 6, color: '#2b2b2b' }}>Screens &amp; Displays</h4>
                <p style={{ fontSize: 14, color: '#555' }}>TVs, digital displays, menu boards, and other screens can become valuable digital placements.</p>
              </div>
            </Reveal>
            <Reveal delay={2}>
              <div style={{ backgroundColor: '#f0f0ec', border: '1px solid #e0e0d8', borderRadius: 18, padding: '30px 26px', textAlign: 'left' }}>
                <IconBuilding />
                <h4 style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.3px', marginBottom: 6, color: '#2b2b2b' }}>Walls &amp; Buildings</h4>
                <p style={{ fontSize: 14, color: '#555' }}>Blank walls, building exteriors, murals, and other surfaces can become canvases for brands.</p>
              </div>
            </Reveal>
            <Reveal>
              <div style={{ backgroundColor: '#f0f0ec', border: '1px solid #e0e0d8', borderRadius: 18, padding: '30px 26px', textAlign: 'left' }}>
                <IconCar />
                <h4 style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.3px', marginBottom: 6, color: '#2b2b2b' }}>Vehicles &amp; Fleets</h4>
                <p style={{ fontSize: 14, color: '#555' }}>Cars, trucks, vans, and fleets can carry campaigns throughout the city.</p>
              </div>
            </Reveal>
            <Reveal delay={1}>
              <div style={{ backgroundColor: '#f0f0ec', border: '1px solid #e0e0d8', borderRadius: 18, padding: '30px 26px', textAlign: 'left' }}>
                <IconCoffee />
                <h4 style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.3px', marginBottom: 6, color: '#2b2b2b' }}>Bars, Cafés &amp; Venues</h4>
                <p style={{ fontSize: 14, color: '#555' }}>Bar tops, chalkboards, tables, mirrors, restrooms, entryways, and other high-attention spaces can become creative placements.</p>
              </div>
            </Reveal>
            <Reveal delay={2}>
              <div style={{ backgroundColor: '#f0f0ec', border: '1px solid #e0e0d8', borderRadius: 18, padding: '30px 26px', textAlign: 'left' }}>
                <IconGlobe />
                <h4 style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.3px', marginBottom: 6, color: '#2b2b2b' }}>Something We Haven&apos;t Thought Of Yet</h4>
                <p style={{ fontSize: 14, color: '#555' }}>Some of the best opportunities won&apos;t fit into a traditional category. Get creative.</p>
              </div>
            </Reveal>
          </div>

          <Reveal>
            <p style={{ marginTop: 36, fontSize: 15, color: '#555' }}>
              <strong style={{ color: '#2b2b2b' }}>If you control attention, there may be an opportunity.</strong>
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── 3 · HOW HOSTING WORKS ── */}
      <section className="px-6" style={{ paddingTop: 90, paddingBottom: 90 }}>
        <div className="mx-auto" style={{ maxWidth: 1060 }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <Reveal>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#c9a54e', marginBottom: 14 }}>How hosting works</div>
            </Reveal>
            <Reveal delay={1}>
              <h2 style={{ fontSize: 34, letterSpacing: '-0.8px', fontWeight: 800, marginBottom: 18, color: '#2b2b2b' }}>Create an opportunity. Stay in control.</h2>
            </Reveal>
            <Reveal delay={2}>
              <p style={{ color: '#555', fontSize: 17, maxWidth: 560, margin: '0 auto' }}>
                City Feed makes it simple to bring your space to market while giving you control over how it&apos;s used.
              </p>
            </Reveal>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: 20 }}>
            {([
              { n: '1', title: 'List your opportunity', body: 'Show advertisers what makes your space valuable. Add photos, location, placement details, availability, and your price.' },
              { n: '2', title: 'Review bookings', body: 'See who\'s interested, what they want to promote, and when they want to run it. Nothing moves forward without your approval — or enable instant booking for a more seamless experience.' },
              { n: '3', title: 'Bring the campaign to life', body: 'Once approved, execute the placement and provide proof that the campaign is live.' },
              { n: '4', title: 'Get paid', body: 'Once the placement is verified, your payout is processed securely through the platform.' },
            ] as const).map((item, i) => (
              <Reveal key={i} delay={i}>
                <div style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', borderRadius: 18, padding: '28px 24px' }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%',
                    backgroundColor: '#f5edda', color: '#c9a54e',
                    fontWeight: 800, fontSize: 15,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 16, border: '1px solid #debb73',
                  }}>{item.n}</div>
                  <h4 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.2px', color: '#2b2b2b' }}>{item.title}</h4>
                  <p style={{ fontSize: 13.5, color: '#555' }}>{item.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4 · YOU STAY IN CONTROL ── */}
      <section className="px-6" style={{ backgroundColor: '#2b2b2b', paddingTop: 90, paddingBottom: 90 }}>
        <div className="mx-auto" style={{ maxWidth: 1060 }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <Reveal>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#debb73', marginBottom: 14 }}>You stay in control</div>
            </Reveal>
            <Reveal delay={1}>
              <h2 style={{ fontSize: 34, letterSpacing: '-0.8px', fontWeight: 800, marginBottom: 18, color: '#fff' }}>Your space. Your standards.</h2>
            </Reveal>
            <Reveal delay={2}>
              <p style={{ color: 'rgba(240,240,236,0.65)', fontSize: 17, maxWidth: 560, margin: '0 auto' }}>
                Opening your space to advertisers shouldn&apos;t mean giving up control of it.
              </p>
            </Reveal>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 20, maxWidth: 880, margin: '0 auto' }}>
            <Reveal>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(240,240,236,0.12)', borderRadius: 18, padding: '28px 24px' }}>
                <IconCheck />
                <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#fff' }}>You control what runs</h4>
                <p style={{ fontSize: 13.5, color: 'rgba(240,240,236,0.6)', lineHeight: 1.55 }}>Set restrictions on the industries and messaging advertisers can bring to your space.</p>
              </div>
            </Reveal>
            <Reveal delay={1}>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(240,240,236,0.12)', borderRadius: 18, padding: '28px 24px' }}>
                <IconCalendar />
                <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#fff' }}>You decide when you&apos;re available</h4>
                <p style={{ fontSize: 13.5, color: 'rgba(240,240,236,0.6)', lineHeight: 1.55 }}>Make your opportunity available when it works for you — and unavailable when it doesn&apos;t.</p>
              </div>
            </Reveal>
            <Reveal delay={2}>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(240,240,236,0.12)', borderRadius: 18, padding: '28px 24px' }}>
                <IconDollar />
                <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#fff' }}>You set your price</h4>
                <p style={{ fontSize: 13.5, color: 'rgba(240,240,236,0.6)', lineHeight: 1.55 }}>You know the value of your space. Set the rate you believe it&apos;s worth and adjust it as you learn what advertisers want.</p>
              </div>
            </Reveal>
            <Reveal delay={3}>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(240,240,236,0.12)', borderRadius: 18, padding: '28px 24px' }}>
                <IconLock />
                <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#fff' }}>Your payment is protected</h4>
                <p style={{ fontSize: 13.5, color: 'rgba(240,240,236,0.6)', lineHeight: 1.55 }}>
                  Advertiser payment is secured <strong style={{ color: '#debb73' }}>before the campaign begins</strong>, so you&apos;re not executing a campaign based on a promise to pay.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── 5 · A NEW REVENUE STREAM ── */}
      <section className="px-6" style={{
        backgroundColor: '#fff',
        borderTop: '1px solid #e0e0d8',
        borderBottom: '1px solid #e0e0d8',
        paddingTop: 90, paddingBottom: 90,
      }}>
        <div className="mx-auto" style={{ maxWidth: 1060 }}>
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 56, alignItems: 'center' }}>
            <div>
              <Reveal>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#c9a54e', marginBottom: 14 }}>A new revenue stream</div>
              </Reveal>
              <Reveal delay={1}>
                <h2 style={{ fontSize: 34, letterSpacing: '-0.8px', fontWeight: 800, marginBottom: 18, color: '#2b2b2b' }}>Turn attention into opportunity.</h2>
              </Reveal>
              <Reveal>
                <p style={{ fontSize: 16.5, color: '#555', marginBottom: 16 }}>
                  Your business, property, vehicle, or space may already have something brands value: <strong style={{ color: '#2b2b2b' }}>access to real people in the real world</strong>. City Feed creates a place for that value to meet demand.
                </p>
              </Reveal>
              <Reveal>
                <p style={{ fontSize: 16.5, color: '#555', marginBottom: 16 }}>
                  A $25-a-day placement can become supplemental revenue or income. A unique venue activation could be worth significantly more. You decide what you&apos;re willing to offer, when it&apos;s available, and what it&apos;s worth.
                </p>
              </Reveal>
              <Reveal>
                <p style={{ fontSize: 16.5, color: '#555' }}>
                  <strong style={{ color: '#2b2b2b' }}>The more creatively you look at your space, the more opportunities you may find.</strong>
                </p>
              </Reveal>
            </div>

            {/* Ledger card */}
            <Reveal delay={1}>
              <div style={{ backgroundColor: '#f0f0ec', border: '1px solid #e0e0d8', borderRadius: 20, padding: 32 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '1.5px',
                  textTransform: 'uppercase', color: '#4aa99a',
                  backgroundColor: 'rgba(126,207,192,0.15)',
                  borderRadius: 999, padding: '4px 12px',
                  display: 'inline-block', marginBottom: 18,
                }}>Example campaign</span>
                {([
                  { label: 'Your rate', value: '$25 / day', last: false },
                  { label: 'Campaign length', value: '14 days', last: false },
                  { label: 'Campaign total', value: '$350.00', last: false },
                  { label: 'Your payout', value: 'Sent on proof of posting', last: true },
                ] as const).map((row, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: row.last ? 17 : 15,
                    padding: row.last ? '16px 0 0' : '12px 0',
                    borderBottom: row.last ? 'none' : '1px solid #e4e4dc',
                    color: '#555',
                  }}>
                    <span>{row.label}</span>
                    <strong style={{ color: row.last ? '#c9a54e' : '#2b2b2b', fontSize: row.last ? 20 : undefined }}>{row.value}</strong>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── 6 · CTA ── */}
      <section className="px-6" style={{ paddingTop: 100, paddingBottom: 110, textAlign: 'center' }}>
        <div className="mx-auto" style={{ maxWidth: 1060 }}>
          <Reveal>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              fontSize: 13, color: '#555', backgroundColor: '#fff',
              border: '1px solid #e0e0d8', borderRadius: 999,
              padding: '8px 18px', marginBottom: 34,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#7ecfc0', display: 'inline-block' }} />
              Join the new advertising economy
            </div>
          </Reveal>
          <Reveal delay={1}>
            <h2 style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-1px', marginBottom: 12, color: '#2b2b2b' }}>What could your space become?</h2>
          </Reveal>
          <Reveal delay={2}>
            <p style={{ color: '#555', fontSize: 17, marginBottom: 36 }}>Free to list — you earn when campaigns run.</p>
          </Reveal>
          <Reveal delay={3}>
            <Link
              href="/signup?role=host"
              style={{
                display: 'inline-block', fontWeight: 700, fontSize: 16,
                padding: '16px 34px', borderRadius: 14, textDecoration: 'none',
                letterSpacing: '-0.2px', color: '#2b2b2b',
                backgroundColor: '#debb73',
                boxShadow: '0 4px 18px rgba(222,187,115,0.4)',
              }}
            >
              List Your First Opportunity
            </Link>
          </Reveal>
        </div>
      </section>

    </div>
  )
}
