'use client'

import { useState } from 'react'

type Role = 'adv' | 'host'

/* Small inline SVG icons for fact pills */
function SmallLock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13, display: 'inline', verticalAlign: 'text-bottom', marginRight: 5, flexShrink: 0 }}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function SmallCamera() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13, display: 'inline', verticalAlign: 'text-bottom', marginRight: 5, flexShrink: 0 }}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

function SmallDollar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13, display: 'inline', verticalAlign: 'text-bottom', marginRight: 5, flexShrink: 0 }}>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

/* Toggle-button icon (inherits currentColor) */
function IconBroadcast() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15, flexShrink: 0 }}>
      <circle cx="12" cy="12" r="2" />
      <path d="M7.76 7.76a5 5 0 0 0 0 8.49M16.24 7.76a5 5 0 0 1 0 8.49" />
      <path d="M4.93 4.93a10 10 0 0 0 0 14.14M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
}

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15, flexShrink: 0 }}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

/* ─── Step data ─── */

const advSteps = [
  {
    title: 'Find your spot',
    body: 'Browse verified placements on the map or grid — real photos, real specs, upfront daily pricing. Filter by format, location, and budget.',
    fact: { icon: null as React.ReactNode, text: 'Every price is public. No quotes, no calls.' },
  },
  {
    title: 'Book securely',
    body: "Pick your dates and pay through Stripe. Your payment doesn't go to the host — it goes into escrow with City Feed, where it stays protected.",
    fact: { icon: <SmallLock />, text: 'Funds held in escrow until your ad is verified live' },
  },
  {
    title: 'Upload your creative',
    body: 'Send your artwork right in the booking — or have your host print it for you. Reminders keep everything on schedule so nothing slips.',
    fact: { icon: null as React.ReactNode, text: 'Ship your own prints or use host printing' },
  },
  {
    title: 'Your ad goes live — with proof',
    body: 'Your host posts the ad and submits photo proof. You see your ad in the real world, right from your dashboard. Only then does payment release.',
    fact: { icon: <SmallCamera />, text: 'Photo proof required on every campaign' },
  },
  {
    title: 'Wrap and rebook',
    body: 'Campaign ends, receipt lands in your dashboard, and rebooking your best-performing spots takes one click.',
    fact: { icon: null as React.ReactNode, text: 'Full receipt + campaign history, always' },
  },
]

const hostSteps = [
  {
    title: 'List your space — free',
    body: 'Windows, walls, vehicles, screens, event spaces — if people see it, it can earn. Photos, specs, and your price. Live in minutes.',
    fact: { icon: null as React.ReactNode, text: 'Free to list. You set the price.' },
  },
  {
    title: 'Approve every booking',
    body: "Requests come to you. Review the advertiser and their campaign, then accept or decline — nothing runs on your space without your say-so.",
    fact: { icon: null as React.ReactNode, text: "You're always in control of what's displayed" },
  },
  {
    title: 'Receive creative & post the ad',
    body: "The advertiser's files arrive in your dashboard — or they ship prints straight to you. Post the ad when the campaign starts.",
    fact: { icon: null as React.ReactNode, text: 'Offer printing? Charge a print fee on top.' },
  },
  {
    title: 'Snap the proof',
    body: "Upload a photo of the ad live. That's your proof of posting — and it's what triggers your payout. No invoices, no chasing anyone.",
    fact: { icon: <SmallCamera />, text: 'One photo = payment released' },
  },
  {
    title: 'Get paid automatically',
    body: "The moment your proof is in, your payout is on its way via Stripe — typically in your account within 2 business days.",
    fact: { icon: <SmallDollar />, text: 'Automatic payout. Every time.' },
  },
]

/* ─── Fact pill component ─── */
function FactPill({ icon, text, isHost }: { icon: React.ReactNode; text: string; isHost: boolean }) {
  return (
    <span style={{
      marginTop: 12,
      fontSize: 12.5,
      fontWeight: 600,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isHost ? '#f5edda' : 'rgba(126,207,192,0.12)',
      color: isHost ? '#c9a54e' : '#4aa99a',
      borderRadius: 999,
      padding: '5px 12px',
    }}>
      {icon}
      {text}
    </span>
  )
}

/* ─── Single step card ─── */
function Step({
  step,
  num,
  isLast,
  isHost,
}: {
  step: (typeof advSteps)[0]
  num: number
  isLast: boolean
  isHost: boolean
}) {
  return (
    <div style={{ position: 'relative', paddingBottom: isLast ? 0 : 44 }}>
      {/* Connector line */}
      {!isLast && (
        <div style={{
          position: 'absolute', left: 23, top: 52, bottom: 0,
          width: 2, backgroundColor: '#e0e0d8',
        }} />
      )}
      <div style={{ display: 'flex', gap: 24 }}>
        {/* Bead */}
        <div style={{
          flexShrink: 0, width: 48, height: 48, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 16, zIndex: 1,
          backgroundColor: '#fff',
          border: `2px solid ${isHost ? '#debb73' : '#7ecfc0'}`,
          color: isHost ? '#c9a54e' : '#4aa99a',
        }}>{num}</div>

        {/* Card */}
        <div style={{
          backgroundColor: '#fff', border: '1px solid #e0e0d8',
          borderRadius: 18, padding: '24px 26px', flex: 1,
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px', marginBottom: 6, color: '#2b2b2b' }}>{step.title}</h3>
          <p style={{ fontSize: 14.5, color: '#555' }}>{step.body}</p>
          <FactPill icon={step.fact.icon} text={step.fact.text} isHost={isHost} />
        </div>
      </div>
    </div>
  )
}

/* ─── Main export ─── */
export default function HowItWorksClient() {
  const [role, setRole] = useState<Role>('adv')

  const isAdv = role === 'adv'

  return (
    <>
      {/* Toggle buttons */}
      <div style={{ padding: '0 24px 40px', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', backgroundColor: '#fff',
          border: '1px solid #e0e0d8', borderRadius: 16,
          padding: 6, gap: 6,
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}>
          <button
            onClick={() => setRole('adv')}
            style={{
              fontFamily: 'inherit', fontSize: 15, fontWeight: 700,
              padding: '12px 28px', borderRadius: 11, border: 'none',
              cursor: 'pointer', letterSpacing: '-0.2px',
              display: 'flex', alignItems: 'center', gap: 7,
              backgroundColor: isAdv ? '#7ecfc0' : 'transparent',
              color: isAdv ? '#fff' : '#888',
              transition: 'background-color 0.2s, color 0.2s',
            }}
          >
            <IconBroadcast />
            I&apos;m an advertiser
          </button>
          <button
            onClick={() => setRole('host')}
            style={{
              fontFamily: 'inherit', fontSize: 15, fontWeight: 700,
              padding: '12px 28px', borderRadius: 11, border: 'none',
              cursor: 'pointer', letterSpacing: '-0.2px',
              display: 'flex', alignItems: 'center', gap: 7,
              backgroundColor: !isAdv ? '#debb73' : 'transparent',
              color: !isAdv ? '#2b2b2b' : '#888',
              transition: 'background-color 0.2s, color 0.2s',
            }}
          >
            <IconHome />
            I have space
          </button>
        </div>
      </div>

      {/* Journey track */}
      <section className="px-6" style={{ paddingTop: 56, paddingBottom: 90 }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          {(isAdv ? advSteps : hostSteps).map((step, i, arr) => (
            <Step
              key={`${role}-${i}`}
              step={step}
              num={i + 1}
              isLast={i === arr.length - 1}
              isHost={!isAdv}
            />
          ))}
        </div>
      </section>
    </>
  )
}
