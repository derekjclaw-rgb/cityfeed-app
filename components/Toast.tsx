'use client'

/**
 * Toast notification system
 * Success (green), Error (red), Info (burnt orange) variants
 * Auto-dismisses after 4 seconds
 * Slides in from top-right
 *
 * Usage:
 *   const { showToast, ToastContainer } = useToast()
 *   showToast('Listing created!', 'success')
 *   <ToastContainer />
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

export type ToastVariant = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  message: string
  variant: ToastVariant
}

const VARIANT_STYLES: Record<ToastVariant, { bg: string; border: string; color: string; Icon: React.ElementType }> = {
  success: {
    bg: '#f0fdf4',
    border: '#bbf7d0',
    color: '#15803d',
    Icon: CheckCircle,
  },
  error: {
    bg: '#fef2f2',
    border: '#fecaca',
    color: '#dc2626',
    Icon: XCircle,
  },
  info: {
    bg: '#fef9f0',
    border: '#fde8c4',
    color: '#e6964d',
    Icon: Info,
  },
}

function ToastItem({ toast, onRemove }: { toast: ToastItem; onRemove: (id: string) => void }) {
  const { bg, border, color, Icon } = VARIANT_STYLES[toast.variant]
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Slide in
    requestAnimationFrame(() => setVisible(true))
    // Auto-dismiss
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onRemove(toast.id), 300)
    }, 4000)
    return () => clearTimeout(timer)
  }, [toast.id, onRemove])

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-2xl shadow-lg transition-all duration-300"
      style={{
        backgroundColor: bg,
        border: `1px solid ${border}`,
        minWidth: '260px',
        maxWidth: '360px',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(24px)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
      }}
      role="alert"
    >
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color }} />
      <p className="text-sm flex-1 leading-relaxed font-medium" style={{ color }}>
        {toast.message}
      </p>
      <button
        onClick={() => {
          setVisible(false)
          setTimeout(() => onRemove(toast.id), 300)
        }}
        className="flex-shrink-0 transition-opacity hover:opacity-60"
        style={{ color }}
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counterRef = useRef(0)

  const showToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = `toast-${Date.now()}-${counterRef.current++}`
    setToasts(prev => [...prev, { id, message, variant }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const ToastContainer = useCallback(() => (
    <div
      className="fixed top-20 right-4 z-[9999] flex flex-col gap-2"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  ), [toasts, removeToast])

  return { showToast, ToastContainer }
}

// Simple standalone toast trigger for non-hook contexts
// (wraps a global event system)
export function showGlobalToast(message: string, variant: ToastVariant = 'info') {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('cityfeed:toast', { detail: { message, variant } }))
}

/**
 * GlobalToastContainer — mount once in app layout for showGlobalToast()
 */
export function GlobalToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counterRef = useRef(0)

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  useEffect(() => {
    function handler(e: Event) {
      const { message, variant } = (e as CustomEvent).detail
      const id = `toast-${Date.now()}-${counterRef.current++}`
      setToasts(prev => [...prev, { id, message, variant: variant ?? 'info' }])
    }
    window.addEventListener('cityfeed:toast', handler)
    return () => window.removeEventListener('cityfeed:toast', handler)
  }, [])

  return (
    <div
      className="fixed top-20 right-4 z-[9999] flex flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  )
}
