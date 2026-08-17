import type { Metadata } from 'next'
import Link from 'next/link'
import Reveal from '@/components/Reveal'

export const metadata: Metadata = {
  title: 'About — City Feed',
  description:
    'Our mission is to give businesses of all sizes access to more flexible and creative opportunities to showcase their brands, while creating new ways for people to earn from the spaces around them.',
}

/* ─── Reusable inline SVGs (gold-dark stroke) ─── */

function IconWindow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#c9a54e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24, marginBottom: 14, display: 'block' }}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="12" y1="3" x2="12" y2="21" />
    </svg>
  )
}

function IconCoffee() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#c9a54e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24, marginBottom: 14, display: 'block' }}>
      <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
      <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z" />
    </svg>
  )
}

function IconPencil() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#c9a54e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24, marginBottom: 14, display: 'block' }}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  )
}

function IconBuilding() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#c9a54e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24, marginBottom: 14, display: 'block' }}>
      <path d="M3 21V8l9-5 9 5v13" />
      <line x1="3" y1="21" x2="21" y2="21" />
      <line x1="9" y1="21" x2="9" y2="13" />
      <line x1="15" y1="21" x2="15" y2="13" />
    </svg>
  )
}

function IconMonitor() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#c9a54e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24, marginBottom: 14, display: 'block' }}>
      <rect x="2" y="4" width="20" height="14" rx="2" />
      <line x1="8" y1="22" x2="16" y2="22" />
      <line x1="12" y1="18" x2="12" y2="22" />
    </svg>
  )
}

function IconCar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#c9a54e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24, marginBottom: 14, display: 'block' }}>
      <path d="M14 16H9m10 0h1a1 1 0 0 0 1-1v-4l-3-5H6L3 11v4a1 1 0 0 0 1 1h1" />
      <circle cx="7" cy="16" r="2" />
      <circle cx="17" cy="16" r="2" />
    </svg>
  )
}

/* Trust card icons (gold stroke on charcoal bg) */
function IconLock({ size = 26 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#debb73" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: size, height: size, marginBottom: 16, display: 'block' }}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function IconCamera() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#debb73" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 26, height: 26, marginBottom: 16, display: 'block' }}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
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

function IconShield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#debb73" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 26, height: 26, marginBottom: 16, display: 'block' }}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

/* ─────────────────────────────────────────── */

export default function AboutPage() {
  return (
    <div style={{ backgroundColor: '#f0f0ec' }}>

      {/* ── 1 · MISSION-LED HERO ── */}
      <section className="px-6" style={{ paddingTop: 110, paddingBottom: 90, textAlign: 'center' }}>
        <div className="mx-auto" style={{ maxWidth: 1060 }}>
          <Reveal>
            <span style={{
              display: 'inline-block', fontSize: 12, fontWeight: 700,
              letterSpacing: '2.5px', textTransform: 'uppercase',
              color: '#c9a54e', backgroundColor: '#f5edda',
              border: '1px solid #debb73', padding: '6px 14px',
              borderRadius: 999, marginBottom: 28,
            }}>
              About City Feed
            </span>
          </Reveal>
          <Reveal delay={1}>
            <h1 style={{
              fontSize: 'clamp(38px, 6vw, 64px)', lineHeight: 1.08,
              letterSpacing: '-1.5px', fontWeight: 800,
              maxWidth: 880, margin: '0 auto 24px', color: '#2b2b2b',
            }}>
              Your next big opportunity could be{' '}
              <span style={{ color: '#c9a54e' }}>anywhere.</span>
            </h1>
          </Reveal>
          <Reveal delay={2}>
            <p style={{ fontSize: 20, color: '#555', maxWidth: 660, margin: '0 auto' }}>
              Advertise on your terms.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── 1b · MISSION + MODEL CARDS ── */}
      <section className="px-6" style={{ paddingBottom: 90 }}>
        <div className="mx-auto" style={{ maxWidth: 1060 }}>
          {/* Mission statement */}
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 44 }}>
              <div style={{
                fontSize: 12, fontWeight: 700, letterSpacing: '2.5px',
                textTransform: 'uppercase', color: '#c9a54e', marginBottom: 14,
              }}>Our Mission</div>
              <p style={{
                fontSize: 'clamp(20px, 2.8vw, 27px)', fontWeight: 700,
                letterSpacing: '-0.5px', lineHeight: 1.5,
                maxWidth: 880, margin: '0 auto', color: '#2b2b2b',
              }}>
                Our mission is to give businesses of all sizes access to more flexible and creative opportunities to showcase their brands, while creating new ways for people to earn from the spaces around them —{' '}
                <span style={{ borderBottom: '4px solid #debb73' }}>building a new advertising economy.</span>
              </p>
            </div>
          </Reveal>

          {/* 3 model cards */}
          <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 18 }}>
            <Reveal>
              <div style={{
                backgroundColor: '#fff', border: '1px solid #e0e0d8',
                borderRadius: 18, padding: 26,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#4aa99a', marginBottom: 8 }}>Advertisers</div>
                <p style={{ fontSize: 15, color: '#555' }}>Find and book real-world advertising — from billboards to bar tops.</p>
              </div>
            </Reveal>
            <Reveal delay={1}>
              <div style={{
                backgroundColor: '#fff', border: '1px solid #e0e0d8',
                borderRadius: 18, padding: 26,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#c9a54e', marginBottom: 8 }}>Hosts</div>
                <p style={{ fontSize: 15, color: '#555' }}>Turn your physical spaces and creativity into income.</p>
              </div>
            </Reveal>
            <Reveal delay={2}>
              <div style={{
                backgroundColor: '#2b2b2b', border: '1px solid #2b2b2b',
                borderRadius: 18, padding: 26,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#debb73', marginBottom: 8 }}>City Feed</div>
                <p style={{ fontSize: 15, color: 'rgba(240,240,236,0.75)' }}>The marketplace, transaction, verification, and trust layer connecting them.</p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── 2 · WHY WE EXIST ── */}
      <section className="px-6" style={{
        backgroundColor: '#fff',
        borderTop: '1px solid #e0e0d8',
        borderBottom: '1px solid #e0e0d8',
        paddingTop: 84, paddingBottom: 84,
      }}>
        <div className="mx-auto" style={{ maxWidth: 720 }}>
          <Reveal>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#7ecfc0', marginBottom: 14 }}>Why we exist</div>
          </Reveal>
          <Reveal delay={1}>
            <h2 style={{ fontSize: 34, letterSpacing: '-0.8px', fontWeight: 800, marginBottom: 18, color: '#2b2b2b' }}>Modern brands need modern ways to show up.</h2>
          </Reveal>
          <Reveal>
            <p style={{ fontSize: 17, color: '#555', marginBottom: 16 }}>For decades, real-world advertising has been difficult to access — hidden behind agency relationships, opaque pricing, minimum spends, and a buying process built for the biggest advertisers.</p>
          </Reveal>
          <Reveal>
            <p style={{ fontSize: 17, color: '#555', marginBottom: 16 }}>The way brands are built has changed. Today&apos;s businesses move faster, think more creatively, and need flexible opportunities to reach people in ways that feel relevant, unexpected, and within reach.</p>
          </Reveal>
          <Reveal>
            <p style={{ fontSize: 17, color: '#555', marginBottom: 16 }}>At the same time, the digital world has never been more crowded. Consumers are constantly surrounded by ads, content, and competing messages — making it harder for brands to create moments that actually stick.</p>
          </Reveal>
          <Reveal>
            <p style={{ fontSize: 17, color: '#555', marginBottom: 16 }}>
              <strong style={{ color: '#2b2b2b' }}>We believe those opportunities are already all around us — they just need someone to see them.</strong>
            </p>
          </Reveal>
          <Reveal>
            <p style={{ fontSize: 17, color: '#555', marginBottom: 16 }}>A storefront window can become a canvas. A bar top can launch an event. A café chalkboard can introduce a new brand to a neighborhood. A wall, vehicle, screen, venue, or everyday space can become a meaningful opportunity to any business with a little creativity.</p>
          </Reveal>
          <Reveal>
            <p style={{ fontSize: 17, color: '#555', marginBottom: 16 }}>City Feed gives hosts the platform to create those opportunities — and businesses of every size a place to access them.</p>
          </Reveal>
          <Reveal>
            <p style={{
              fontSize: 21, fontWeight: 700, color: '#2b2b2b',
              letterSpacing: '-0.3px',
              borderLeft: '4px solid #debb73', paddingLeft: 18,
              margin: '26px 0', lineHeight: 1.45,
            }}>
              More creativity. More meaningful attention. More opportunity. A new advertising economy.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── 3 · BEYOND THE BILLBOARD ── */}
      <section className="px-6" style={{ paddingTop: 90, paddingBottom: 90, textAlign: 'center' }}>
        <div className="mx-auto" style={{ maxWidth: 1060 }}>
          <Reveal>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#c9a54e', marginBottom: 14 }}>Beyond the billboard</div>
          </Reveal>
          <Reveal delay={1}>
            <h2 style={{ fontSize: 34, letterSpacing: '-0.8px', fontWeight: 800, marginBottom: 18, color: '#2b2b2b' }}>Opportunity is everywhere. You just have to see it.</h2>
          </Reveal>
          <Reveal delay={2}>
            <p style={{ color: '#555', fontSize: 17, maxWidth: 640, margin: '0 auto 44px' }}>
              You don&apos;t need to own a billboard to participate in the advertising economy. A valuable advertising opportunity can exist anywhere people spend their time, direct their attention, or engage with the world around them.
            </p>
          </Reveal>

          {/* 6 transformation cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 18, maxWidth: 980, margin: '0 auto 44px' }}>
            <Reveal>
              <div style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', borderRadius: 18, padding: '26px 24px', textAlign: 'left' }}>
                <IconWindow />
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '1.8px', textTransform: 'uppercase', color: '#999', marginBottom: 6 }}>A storefront window</div>
                <h4 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px', color: '#2b2b2b', lineHeight: 1.3 }}>Becomes a canvas</h4>
              </div>
            </Reveal>
            <Reveal delay={1}>
              <div style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', borderRadius: 18, padding: '26px 24px', textAlign: 'left' }}>
                <IconCoffee />
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '1.8px', textTransform: 'uppercase', color: '#999', marginBottom: 6 }}>A bar top</div>
                <h4 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px', color: '#2b2b2b', lineHeight: 1.3 }}>Launches an event</h4>
              </div>
            </Reveal>
            <Reveal delay={2}>
              <div style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', borderRadius: 18, padding: '26px 24px', textAlign: 'left' }}>
                <IconPencil />
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '1.8px', textTransform: 'uppercase', color: '#999', marginBottom: 6 }}>A café chalkboard</div>
                <h4 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px', color: '#2b2b2b', lineHeight: 1.3 }}>Introduces a brand to the neighborhood</h4>
              </div>
            </Reveal>
            <Reveal>
              <div style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', borderRadius: 18, padding: '26px 24px', textAlign: 'left' }}>
                <IconBuilding />
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '1.8px', textTransform: 'uppercase', color: '#999', marginBottom: 6 }}>A blank wall</div>
                <h4 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px', color: '#2b2b2b', lineHeight: 1.3 }}>Becomes a mural with a message</h4>
              </div>
            </Reveal>
            <Reveal delay={1}>
              <div style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', borderRadius: 18, padding: '26px 24px', textAlign: 'left' }}>
                <IconMonitor />
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '1.8px', textTransform: 'uppercase', color: '#999', marginBottom: 6 }}>A venue screen</div>
                <h4 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px', color: '#2b2b2b', lineHeight: 1.3 }}>Premieres a campaign</h4>
              </div>
            </Reveal>
            <Reveal delay={2}>
              <div style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', borderRadius: 18, padding: '26px 24px', textAlign: 'left' }}>
                <IconCar />
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '1.8px', textTransform: 'uppercase', color: '#999', marginBottom: 6 }}>A vehicle</div>
                <h4 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px', color: '#2b2b2b', lineHeight: 1.3 }}>Takes a brand across the city</h4>
              </div>
            </Reveal>
          </div>

          <Reveal>
            <p style={{ color: '#555', fontSize: 17, maxWidth: 660, margin: '0 auto 28px' }}>
              With a little creativity, everyday spaces can become meaningful opportunities for brands to show up differently. City Feed gives people a place to turn that potential into opportunity — connecting unique spaces with brands looking for more creative ways to be seen.
            </p>
          </Reveal>
          <Reveal delay={1}>
            <p style={{ fontSize: 'clamp(22px, 3vw, 28px)', fontWeight: 800, letterSpacing: '-0.5px', maxWidth: 720, margin: '0 auto', lineHeight: 1.35, color: '#2b2b2b' }}>
              We&apos;re expanding what advertising can be —{' '}
              <span style={{ borderBottom: '4px solid #7ecfc0' }}>and who can benefit from it.</span>
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── 4 · TWO-SIDED PLATFORM ── */}
      <section className="px-6" style={{
        backgroundColor: '#fff',
        borderTop: '1px solid #e0e0d8',
        borderBottom: '1px solid #e0e0d8',
        paddingTop: 90, paddingBottom: 90,
      }}>
        <div className="mx-auto" style={{ maxWidth: 1060 }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <Reveal>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#7ecfc0', marginBottom: 14 }}>The Platform</div>
            </Reveal>
            <Reveal delay={1}>
              <h2 style={{ fontSize: 34, letterSpacing: '-0.8px', fontWeight: 800, marginBottom: 18, color: '#2b2b2b' }}>One marketplace. Two sides. Zero friction.</h2>
            </Reveal>
            <Reveal delay={2}>
              <p style={{ color: '#555', fontSize: 17 }}>Whether you&apos;re placing an ad or hosting one, the process is built to be effortless.</p>
            </Reveal>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 24 }}>
            {/* Advertiser side */}
            <Reveal>
              <div style={{
                backgroundColor: '#f0f0ec', border: '1px solid #e0e0d8',
                borderTop: '4px solid #7ecfc0', borderRadius: 20, padding: 36,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#4aa99a', marginBottom: 10 }}>For Advertisers</div>
                <h3 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px', marginBottom: 20, color: '#2b2b2b' }}>Discover. Book. Stand out.</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {([
                    { n: '1', bold: 'Discover', rest: ' real-world placements you wouldn\'t otherwise know existed — many aren\'t available through traditional media channels at all.' },
                    { n: '2', bold: 'Book', rest: ' with upfront pricing and a simple transaction. No quotes, no calls, no minimum spends.' },
                    { n: '3', bold: 'Stand out', rest: ' — see your brand in the real world through creative opportunities.' },
                  ] as const).map((item, i) => (
                    <li key={i} style={{ display: 'flex', gap: 12, fontSize: 15, color: '#555', padding: '12px 0', borderTop: i === 0 ? 'none' : '1px solid #e6e6df' }}>
                      <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, marginTop: 2, backgroundColor: 'rgba(126,207,192,0.18)', color: '#4aa99a' }}>{item.n}</span>
                      <span><strong style={{ color: '#2b2b2b' }}>{item.bold}</strong>{item.rest}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            {/* Host side */}
            <Reveal delay={1}>
              <div style={{
                backgroundColor: '#f0f0ec', border: '1px solid #e0e0d8',
                borderTop: '4px solid #debb73', borderRadius: 20, padding: 36,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#c9a54e', marginBottom: 10 }}>For Hosts</div>
                <h3 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px', marginBottom: 20, color: '#2b2b2b' }}>Your space is an asset. Treat it like one.</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {([
                    { n: '1', bold: 'Turn the spaces you control into income', rest: ' — windows, walls, vehicles, screens, venues. You set the price.' },
                    { n: '2', bold: 'Host on your terms', rest: ' — enable instant booking for a seamless experience, or review each request before it runs. You set the standards.' },
                    { n: '3', bold: 'Get paid automatically', rest: ' — upload proof of posting and your payout is on its way. No invoicing, no chasing.' },
                  ] as const).map((item, i) => (
                    <li key={i} style={{ display: 'flex', gap: 12, fontSize: 15, color: '#555', padding: '12px 0', borderTop: i === 0 ? 'none' : '1px solid #e6e6df' }}>
                      <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, marginTop: 2, backgroundColor: '#f5edda', color: '#c9a54e' }}>{item.n}</span>
                      <span><strong style={{ color: '#2b2b2b' }}>{item.bold}</strong>{item.rest}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── 5 · TRUST & TRANSPARENCY ── */}
      <section className="px-6" style={{ backgroundColor: '#2b2b2b', paddingTop: 90, paddingBottom: 90 }}>
        <div className="mx-auto" style={{ maxWidth: 1060 }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <Reveal>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#debb73', marginBottom: 14 }}>Built on Trust</div>
            </Reveal>
            <Reveal delay={1}>
              <h2 style={{ fontSize: 34, letterSpacing: '-0.8px', fontWeight: 800, marginBottom: 18, color: '#fff' }}>Every booking, protected by design</h2>
            </Reveal>
            <Reveal delay={2}>
              <p style={{ color: 'rgba(240,240,236,0.65)', fontSize: 17, maxWidth: 560, margin: '0 auto' }}>
                Trust isn&apos;t a tagline here — it&apos;s the architecture. This is how every dollar and every campaign moves through City Feed.
              </p>
            </Reveal>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: 20 }}>
            <Reveal>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(240,240,236,0.12)', borderRadius: 18, padding: '28px 24px' }}>
                <IconLock />
                <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#fff' }}>Escrow Protection</h4>
                <p style={{ fontSize: 13.5, color: 'rgba(240,240,236,0.6)', lineHeight: 1.55 }}>
                  Payment is held securely by City Feed and only released to the host <strong style={{ color: '#debb73' }}>after your ad is verified live</strong>. Nobody gets paid until the work is real.
                </p>
              </div>
            </Reveal>
            <Reveal delay={1}>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(240,240,236,0.12)', borderRadius: 18, padding: '28px 24px' }}>
                <IconCamera />
                <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#fff' }}>Proof of Posting</h4>
                <p style={{ fontSize: 13.5, color: 'rgba(240,240,236,0.6)', lineHeight: 1.55 }}>
                  Every campaign requires <strong style={{ color: '#debb73' }}>photo evidence</strong> from the host — reviewed and delivered straight to your dashboard.
                </p>
              </div>
            </Reveal>
            <Reveal delay={2}>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(240,240,236,0.12)', borderRadius: 18, padding: '28px 24px' }}>
                <IconDollar />
                <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#fff' }}>Transparent Pricing</h4>
                <p style={{ fontSize: 13.5, color: 'rgba(240,240,236,0.6)', lineHeight: 1.55 }}>
                  <strong style={{ color: '#debb73' }}>No hidden fees.</strong> The price you see is the price you pay — everything is itemized before you ever check out.
                </p>
              </div>
            </Reveal>
            <Reveal delay={3}>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(240,240,236,0.12)', borderRadius: 18, padding: '28px 24px' }}>
                <IconShield />
                <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#fff' }}>Secure Payments</h4>
                <p style={{ fontSize: 13.5, color: 'rgba(240,240,236,0.6)', lineHeight: 1.55 }}>
                  All transactions run through <strong style={{ color: '#debb73' }}>Stripe</strong> — bank-level encryption, verified payouts, zero card data stored by us.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── 6 · BETA + CTA ── */}
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
              City Feed is in beta — we&apos;re building in public and shipping every week
            </div>
          </Reveal>
          <Reveal delay={1}>
            <h2 style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-1px', marginBottom: 12, color: '#2b2b2b' }}>Be early to the new economy</h2>
          </Reveal>
          <Reveal delay={2}>
            <p style={{ color: '#555', fontSize: 17, marginBottom: 36 }}>Discover your first placement, or turn your space into income.</p>
          </Reveal>
          <Reveal delay={3}>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link
                href="/marketplace"
                style={{
                  display: 'inline-block', fontWeight: 700, fontSize: 16,
                  padding: '16px 34px', borderRadius: 14, textDecoration: 'none',
                  letterSpacing: '-0.2px', backgroundColor: '#debb73', color: '#2b2b2b',
                  boxShadow: '0 4px 18px rgba(222,187,115,0.4)',
                }}
              >
                Browse placements
              </Link>
              <Link
                href="/hosts"
                style={{
                  display: 'inline-block', fontWeight: 700, fontSize: 16,
                  padding: '16px 34px', borderRadius: 14, textDecoration: 'none',
                  letterSpacing: '-0.2px', backgroundColor: '#fff', color: '#2b2b2b',
                  border: '1px solid #e0e0d8',
                }}
              >
                Become a host
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

    </div>
  )
}
