import type { Metadata } from 'next'
import Link from 'next/link'
import HowItWorksClient from '@/components/HowItWorksClient'

export const metadata: Metadata = {
  title: 'How It Works — City Feed',
  description:
    'See exactly how it works — every step, every dollar. Browse verified placements, book securely, and get photo proof your ad went live.',
}

/* ── Money-flow node SVG icons (gold on charcoal) ── */
function IconCreditCard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#debb73" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28, marginBottom: 10, display: 'block', margin: '0 auto 10px' }}>
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  )
}

function IconLock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#debb73" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28, display: 'block', margin: '0 auto 10px' }}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function IconCamera() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#debb73" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28, display: 'block', margin: '0 auto 10px' }}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

function IconDollar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#debb73" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28, display: 'block', margin: '0 auto 10px' }}>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

/* ── FAQ item ── */
function QA({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div style={{ borderBottom: '1px solid #f0f0ea', padding: '22px 4px' }}>
      <h4 style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.2px', marginBottom: 8, display: 'flex', gap: 10, color: '#2b2b2b' }}>
        <span style={{ color: '#c9a54e' }}>Q</span>
        {q}
      </h4>
      <p style={{ fontSize: 14.5, color: '#555', paddingLeft: 26 }}>{children}</p>
    </div>
  )
}

export default function HowItWorksPage() {
  return (
    <div style={{ backgroundColor: '#f0f0ec' }}>

      {/* ── 1 · HERO ── */}
      <section className="px-6" style={{ paddingTop: 96, paddingBottom: 0, textAlign: 'center' }}>
        <div className="mx-auto" style={{ maxWidth: 1060 }}>
          <div style={{
            fontSize: 12, fontWeight: 700, letterSpacing: '2.5px',
            textTransform: 'uppercase', color: '#4aa99a', marginBottom: 14,
          }}>How It Works</div>
          <h1 style={{
            fontSize: 'clamp(36px, 5.6vw, 58px)', lineHeight: 1.1,
            letterSpacing: '-1.4px', fontWeight: 800,
            maxWidth: 780, margin: '0 auto 20px', color: '#2b2b2b',
          }}>
            See exactly how it works. Every step, every dollar.
          </h1>
          <p style={{ fontSize: 19, color: '#555', maxWidth: 560, margin: '0 auto 40px' }}>
            No black boxes here — pick your side and walk the whole journey.
          </p>
        </div>
      </section>

      {/* ── 2 · TOGGLE + JOURNEY (client) ── */}
      <HowItWorksClient />

      {/* ── 3 · FOLLOW THE MONEY ── */}
      <section className="px-6" style={{ backgroundColor: '#2b2b2b', paddingTop: 90, paddingBottom: 90 }}>
        <div className="mx-auto" style={{ maxWidth: 1060 }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#debb73', marginBottom: 14 }}>Financial Transparency</div>
            <h2 style={{ fontSize: 34, letterSpacing: '-0.8px', fontWeight: 800, marginBottom: 14, color: '#fff' }}>Follow the money</h2>
            <p style={{ color: 'rgba(240,240,236,0.65)', fontSize: 17, maxWidth: 540, margin: '0 auto' }}>
              Most ad platforms hide this part. We think it&apos;s the most important thing on the page.
            </p>
          </div>

          {/* Flow nodes */}
          <div className="flex flex-col md:flex-row items-center justify-center" style={{ gap: 0 }}>
            {/* Node 1 */}
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(240,240,236,0.14)',
              borderRadius: 18, padding: '26px 22px', width: 210, textAlign: 'center',
            }}>
              <IconCreditCard />
              <h4 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Advertiser pays</h4>
              <p style={{ fontSize: 12.5, color: 'rgba(240,240,236,0.6)', lineHeight: 1.5 }}>
                Secure checkout via Stripe. Total shown upfront — subtotal plus a flat <strong style={{ color: '#debb73' }}>7% service fee</strong>.
              </p>
            </div>
            {/* Arrow */}
            <div className="rotate-90 md:rotate-0" style={{ padding: '14px', color: '#debb73', fontSize: 22, fontWeight: 700, flexShrink: 0 }}>→</div>
            {/* Node 2 — highlighted */}
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px solid #debb73',
              boxShadow: '0 0 24px rgba(222,187,115,0.18)',
              borderRadius: 18, padding: '26px 22px', width: 210, textAlign: 'center',
            }}>
              <IconLock />
              <h4 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>City Feed holds it</h4>
              <p style={{ fontSize: 12.5, color: 'rgba(240,240,236,0.6)', lineHeight: 1.5 }}>
                Money sits in <strong style={{ color: '#debb73' }}>escrow</strong> — the host can&apos;t touch it, and neither can anyone else.
              </p>
            </div>
            {/* Arrow */}
            <div className="rotate-90 md:rotate-0" style={{ padding: '14px', color: '#debb73', fontSize: 22, fontWeight: 700, flexShrink: 0 }}>→</div>
            {/* Node 3 */}
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(240,240,236,0.14)',
              borderRadius: 18, padding: '26px 22px', width: 210, textAlign: 'center',
            }}>
              <IconCamera />
              <h4 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Proof verified</h4>
              <p style={{ fontSize: 12.5, color: 'rgba(240,240,236,0.6)', lineHeight: 1.5 }}>
                The host submits photo proof that your ad is live in the real world.
              </p>
            </div>
            {/* Arrow */}
            <div className="rotate-90 md:rotate-0" style={{ padding: '14px', color: '#debb73', fontSize: 22, fontWeight: 700, flexShrink: 0 }}>→</div>
            {/* Node 4 */}
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(240,240,236,0.14)',
              borderRadius: 18, padding: '26px 22px', width: 210, textAlign: 'center',
            }}>
              <IconDollar />
              <h4 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Host gets paid</h4>
              <p style={{ fontSize: 12.5, color: 'rgba(240,240,236,0.6)', lineHeight: 1.5 }}>
                Payout releases automatically to the host&apos;s account — <strong style={{ color: '#debb73' }}>within 2 business days</strong>.
              </p>
            </div>
          </div>

          <p style={{ textAlign: 'center', marginTop: 40, fontSize: 13.5, color: 'rgba(240,240,236,0.55)' }}>
            Flat <strong style={{ color: '#debb73' }}>7% service fee</strong> on each side. That&apos;s the whole business model — no markups, no spreads, no surprises.
          </p>
        </div>
      </section>

      {/* ── 4 · THE INVENTORY ── */}
      <section className="px-6" style={{ paddingTop: 90, paddingBottom: 90, textAlign: 'center' }}>
        <div className="mx-auto" style={{ maxWidth: 1060 }}>
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#4aa99a', marginBottom: 14 }}>The Inventory</div>
            <h2 style={{ fontSize: 34, letterSpacing: '-0.8px', fontWeight: 800, marginBottom: 14, color: '#2b2b2b' }}>If people see it, it&apos;s ad space</h2>
            <p style={{ color: '#555', fontSize: 17, maxWidth: 560, margin: '0 auto' }}>
              From highway billboards to storefront windows — the marketplace covers every format the real world has to offer.
            </p>
          </div>
          <div className="flex flex-wrap justify-center" style={{ gap: 10, maxWidth: 860, margin: '0 auto' }}>
            {([
              { label: 'Digital Billboard', variant: 'hot' },
              { label: 'Static Billboard', variant: 'plain' },
              { label: 'Transit', variant: 'mint' },
              { label: 'Outdoor Digital', variant: 'plain' },
              { label: 'Outdoor Static', variant: 'plain' },
              { label: 'Storefront', variant: 'hot' },
              { label: 'Window Display', variant: 'plain' },
              { label: 'Vehicle Wrap', variant: 'mint' },
              { label: 'Display On-Premise', variant: 'plain' },
              { label: 'Indoor Digital', variant: 'plain' },
              { label: 'Indoor Static', variant: 'plain' },
              { label: 'Event-Based', variant: 'hot' },
              { label: 'Experiential', variant: 'plain' },
              { label: 'Human-Based', variant: 'mint' },
              { label: 'Street Furniture', variant: 'plain' },
              { label: 'Unique', variant: 'plain' },
            ] as const).map((pill) => (
              <span
                key={pill.label}
                style={{
                  borderRadius: 999, padding: '10px 20px',
                  fontSize: 14, fontWeight: 600,
                  backgroundColor:
                    pill.variant === 'hot' ? '#f5edda' :
                    pill.variant === 'mint' ? 'rgba(126,207,192,0.1)' :
                    '#fff',
                  border:
                    pill.variant === 'hot' ? '1px solid #debb73' :
                    pill.variant === 'mint' ? '1px solid #7ecfc0' :
                    '1px solid #e0e0d8',
                  color:
                    pill.variant === 'hot' ? '#c9a54e' :
                    pill.variant === 'mint' ? '#4aa99a' :
                    '#555',
                }}
              >
                {pill.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5 · FAQ ── */}
      <section className="px-6" style={{
        backgroundColor: '#fff',
        borderTop: '1px solid #e0e0d8',
        borderBottom: '1px solid #e0e0d8',
        paddingTop: 90, paddingBottom: 90,
      }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#4aa99a', marginBottom: 14 }}>Straight Answers</div>
            <h2 style={{ fontSize: 34, letterSpacing: '-0.8px', fontWeight: 800, marginBottom: 8, color: '#2b2b2b' }}>Questions everyone asks</h2>
            <p style={{ fontSize: 17, color: '#555' }}>The stuff other platforms bury in the fine print.</p>
          </div>

          <QA q="What if my ad never gets posted?">
            Your money never leaves escrow without verified photo proof. If a host doesn&apos;t deliver, the payment doesn&apos;t release — <strong style={{ color: '#2b2b2b' }}>you&apos;re protected the entire time</strong>.
          </QA>
          <QA q="What does City Feed cost?">
            A flat <strong style={{ color: '#2b2b2b' }}>7% service fee</strong> — advertisers see it at checkout, hosts see it on their earnings. No hidden markups, no negotiated rates, no agency spread.
          </QA>
          <QA q="When do hosts get paid?">
            The moment proof of posting is submitted, the payout fires automatically via Stripe — funds typically land <strong style={{ color: '#2b2b2b' }}>within 2 business days</strong>.
          </QA>
          <QA q="Can I cancel a booking?">
            Yes. Cancel <strong style={{ color: '#2b2b2b' }}>more than 7 days</strong> before your campaign starts for a 95% refund, <strong style={{ color: '#2b2b2b' }}>within 7 days</strong> for 50%. Once a campaign begins, bookings are non-refundable.
          </QA>
          <QA q="Do hosts have to accept every booking?">
            Never. Hosts review each request and <strong style={{ color: '#2b2b2b' }}>approve or decline</strong> — nothing runs on your space without your permission.
          </QA>
          <QA q="What creative formats can I upload?">
            PDF, JPG, PNG, and ZIP files upload right into your booking. Physical placement? <strong style={{ color: '#2b2b2b' }}>Ship your own prints or have your host print for you</strong> where offered.
          </QA>
          <div style={{ padding: '22px 4px' }}>
            <h4 style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.2px', marginBottom: 8, display: 'flex', gap: 10, color: '#2b2b2b' }}>
              <span style={{ color: '#c9a54e' }}>Q</span>
              How do I know a placement is real?
            </h4>
            <p style={{ fontSize: 14.5, color: '#555', paddingLeft: 26 }}>
              Every listing carries real photos, specs, and a booking history — and every completed campaign requires photo proof. <strong style={{ color: '#2b2b2b' }}>Fakes don&apos;t survive here.</strong>
            </p>
          </div>
        </div>
      </section>

      {/* ── 6 · DUAL CTA ── */}
      <section className="px-6" style={{ paddingTop: 96, paddingBottom: 110 }}>
        <div className="mx-auto" style={{ maxWidth: 1060 }}>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#4aa99a', marginBottom: 14 }}>Get Started</div>
            <h2 style={{ fontSize: 34, letterSpacing: '-0.8px', fontWeight: 800, color: '#2b2b2b' }}>Pick your side</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 22, maxWidth: 860, margin: '0 auto' }}>
            {/* Advertiser card */}
            <div style={{
              backgroundColor: '#fff', border: '1px solid #e0e0d8',
              borderRadius: 20, padding: '40px 34px', textAlign: 'center',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}>
              <h3 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px', marginBottom: 8, color: '#2b2b2b' }}>I want to advertise</h3>
              <p style={{ fontSize: 14.5, color: '#555', marginBottom: 26 }}>Browse real-world placements with upfront pricing and book in minutes.</p>
              <Link
                href="/marketplace"
                style={{
                  display: 'inline-block', fontWeight: 700, fontSize: 15,
                  padding: '14px 30px', borderRadius: 13, textDecoration: 'none',
                  letterSpacing: '-0.2px', backgroundColor: '#debb73', color: '#2b2b2b',
                  boxShadow: '0 4px 18px rgba(222,187,115,0.4)',
                }}
              >
                Browse placements →
              </Link>
            </div>
            {/* Host card */}
            <div style={{
              backgroundColor: '#2b2b2b', border: '1px solid #2b2b2b',
              borderRadius: 20, padding: '40px 34px', textAlign: 'center',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}>
              <h3 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px', marginBottom: 8, color: '#fff' }}>I have space to list</h3>
              <p style={{ fontSize: 14.5, color: 'rgba(240,240,236,0.6)', marginBottom: 26 }}>Turn your storefront, vehicle, or wall into income. Free to list.</p>
              <Link
                href="/signup?role=host"
                style={{
                  display: 'inline-block', fontWeight: 700, fontSize: 15,
                  padding: '14px 30px', borderRadius: 13, textDecoration: 'none',
                  letterSpacing: '-0.2px', backgroundColor: '#7ecfc0', color: '#fff',
                  boxShadow: '0 4px 18px rgba(126,207,192,0.4)',
                }}
              >
                List your space →
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
