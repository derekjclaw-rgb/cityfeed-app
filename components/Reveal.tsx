'use client'

import { useRef, useEffect, useState, type ReactNode } from 'react'

interface RevealProps {
  children: ReactNode
  /** Stagger index (0 = no delay, 1 = 0.08s, 2 = 0.16s, 3 = 0.24s, 4 = 0.32s) */
  delay?: number
  className?: string
  style?: React.CSSProperties
}

/**
 * Scroll-reveal wrapper.
 * Fades in + slides up when element enters viewport.
 * Respects prefers-reduced-motion (renders immediately visible).
 */
export default function Reveal({ children, delay = 0, className = '', style }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) {
      setRevealed(true)
      return
    }

    setActive(true)

    const el = ref.current
    if (!el) return

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setRevealed(true)
            io.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    )

    io.observe(el)
    return () => io.disconnect()
  }, [])

  const ds = delay * 0.08

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...style,
        ...(active
          ? {
              opacity: revealed ? 1 : 0,
              transform: revealed ? 'none' : 'translateY(26px)',
              transition: revealed
                ? `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${ds}s, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${ds}s`
                : 'none',
            }
          : {}),
      }}
    >
      {children}
    </div>
  )
}
