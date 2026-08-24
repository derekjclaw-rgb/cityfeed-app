'use client'

/**
 * Booking Detail Page — Phase 5b + UX Round 2
 *
 * Features:
 * - Full booking details
 * - Collateral upload flow (post-booking) — explicit Upload button, success state, additional upload zone
 * - Delivery instructions (for physical placements)
 * - Host can view and force-download uploaded collateral
 * - Host POP (proof of posting) upload flow
 *
 * IMPORTANT: Before using collateral uploads, create a Supabase Storage bucket:
 *   Bucket name: "booking-collateral"
 *   Public: false (private, authenticated access only)
 *   Run in Supabase dashboard → Storage → New bucket → "booking-collateral"
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Loader2, Upload, FileText, Image, Film, Archive,
  CheckCircle, Clock, Download, X, AlertCircle, Package, Camera, ExternalLink,
  Truck, DollarSign
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getBookingFinancials, formatBookingDate } from '@/lib/fees'
import { notify, systemMessage } from '@/lib/notify'

/** Derive a human-readable confirmation code from a booking UUID */
function confirmationCode(bookingId: string): string {
  return 'CF-' + bookingId.replace(/-/g, '').substring(0, 6).toUpperCase()
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ url, name, onClose }: { url: string; name?: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center rounded-full transition-opacity hover:opacity-80"
        style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
        aria-label="Close preview"
      >
        <X className="w-5 h-5" style={{ color: '#fff' }} />
      </button>
      <div className="max-w-[92vw] max-h-[86vh]" onClick={e => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={name ?? 'Preview'}
          className="max-w-full max-h-[80vh] rounded-xl object-contain"
          style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}
        />
        {name && <p className="text-center text-sm mt-3 truncate" style={{ color: 'rgba(255,255,255,0.8)' }}>{name}</p>}
      </div>
    </div>
  )
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Booking {
  id: string
  status: string
  start_date: string
  end_date: string
  total_price: number
  platform_fee?: number
  payout_amount?: number
  payout_at?: string
  stripe_transfer_id?: string
  created_at: string
  listing_id: string
  advertiser_id: string
  host_id?: string
  // Print / shipping fields
  // DB columns needed: delivery_mode text, shipped_at timestamptz, received_at timestamptz,
  //   tracking_number text, host_prints boolean DEFAULT false, print_fee_charged numeric
  delivery_mode?: 'self_deliver' | 'host_prints' | null
  shipped_at?: string | null
  received_at?: string | null
  dropped_off_at?: string | null
  tracking_number?: string | null
  host_prints?: boolean
  print_fee_charged?: number | null
}

interface Listing {
  id: string
  title: string
  category: string
  city: string
  state: string
  dimensions?: string
  production_time?: string
  delivery_instructions?: string
  creative_formats?: string[]
  creative_dimensions?: string
  creative_max_file_size?: string
  creative_video_duration?: string
  creative_audio_allowed?: boolean
  requires_print?: boolean
  offers_printing?: boolean
  print_fee?: number | null
  delivery_address?: string | null
  specs?: {
    dimensions?: { width: number; height: number; unit: string }
    [key: string]: unknown
  } | null
}

interface CollateralFile {
  name: string
  path: string
  size: number
  type: string
  created_at?: string | null
  url?: string
}

const ACCEPTED_FORMATS = ['PDF', 'JPG', 'PNG', 'MP4', 'AI', 'PSD', 'ZIP']
const ACCEPTED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'video/mp4',
  'application/postscript',         // .ai
  'image/vnd.adobe.photoshop',      // .psd
  'application/octet-stream',       // generic fallback for .ai/.psd
  'application/zip',
  'application/x-zip-compressed',
]

// ─── File icon helper ──────────────────────────────────────────────────────────

function FileIcon({ type, name }: { type: string; name: string }) {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    return <Image className="w-5 h-5" style={{ color: 'var(--mint, #7ecfc0)' }} />
  }
  if (type.startsWith('video/') || ext === 'mp4') {
    return <Film className="w-5 h-5" style={{ color: '#8b5cf6' }} />
  }
  if (ext === 'zip') {
    return <Archive className="w-5 h-5" style={{ color: '#64748b' }} />
  }
  return <FileText className="w-5 h-5" style={{ color: '#3b82f6' }} />
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Force download helper ─────────────────────────────────────────────────────

async function forceDownload(url: string, filename: string) {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(blobUrl), 100)
  } catch {
    window.open(url, '_blank')
  }
}

// ─── Collateral Upload Section ─────────────────────────────────────────────────

interface CollateralSectionProps {
  bookingId: string
  isHost: boolean
  bookingStatus: string
  hostId?: string
  advertiserId?: string
  listingTitle?: string
  listing?: Listing | null
  booking?: Booking | null
  onBookingUpdate?: (b: Partial<Booking>) => void
}

function CollateralSection({ bookingId, isHost, bookingStatus, hostId, advertiserId, listingTitle, listing, booking, onBookingUpdate }: CollateralSectionProps) {
  const [files, setFiles] = useState<CollateralFile[]>([])
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isDraggingAdditional, setIsDraggingAdditional] = useState(false)
  const [uploadComplete, setUploadComplete] = useState(false)
  const [showAdditional, setShowAdditional] = useState(false)
  const [lightboxFile, setLightboxFile] = useState<{ url: string; name: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const additionalInputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()
  const folderPath = `bookings/${bookingId}`

  async function loadFiles() {
    setLoading(true)
    try {
      const res = await fetch(`/api/collateral/list?bookingId=${bookingId}`)
      const json = await res.json()
      if (json.files) {
        setFiles(json.files)
      } else {
        console.warn('[Collateral] API error:', json.error)
        setFiles([])
      }
    } catch (err) {
      console.warn('[Collateral] Fetch error:', err)
      setFiles([])
    }
    setLoading(false)
  }

  useEffect(() => { loadFiles() }, [bookingId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Stage files only — don't upload yet
  const handleStagedFiles = useCallback((incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return
    const valid: File[] = []
    const errors: string[] = []
    for (const file of Array.from(incoming)) {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
      const isAllowed = ACCEPTED_MIME.includes(file.type) ||
        ['pdf', 'jpg', 'jpeg', 'png', 'mp4', 'ai', 'psd', 'zip'].includes(ext)
      if (isAllowed) valid.push(file)
      else errors.push(`"${file.name}" is not an accepted format`)
    }
    if (errors.length > 0) setUploadError(errors[0] + `. Allowed: ${ACCEPTED_FORMATS.join(', ')}`)
    if (valid.length > 0) {
      setUploadError('')
      setPendingFiles(prev => [...prev, ...valid])
    }
  }, [])

  // Actually upload the staged pending files
  const handleUpload = useCallback(async () => {
    if (pendingFiles.length === 0) return
    setUploading(true)
    setUploadError('')

    for (const file of pendingFiles) {
      const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const fd = new FormData()
      fd.append('file', file)
      fd.append('path', `${folderPath}/${safeName}`)
      const res = await fetch('/api/collateral/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        setUploadError(data.error || 'Upload failed')
        console.error('[Collateral] Upload error:', data.error)
      }
    }

    setPendingFiles([])
    setUploading(false)
    setUploadComplete(true)
    await loadFiles()

    // Notify host + advertiser
    if (!isHost && hostId && advertiserId) {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // System message to host — via /api/messages/system (neutral, host-only visibility)
          await systemMessage({
            booking_id: bookingId,
            to: 'host',
            content: `📎 Creative files have been uploaded for "${listingTitle ?? 'your listing'}"\n\nPlease review and begin setup when ready.\n\nView booking: https://www.cityfeed.io/dashboard/bookings/${bookingId}`,
          })
          // Confirmation message to advertiser
          await supabase.from('messages').insert({
            booking_id: bookingId,
            sender_id: user.id,
            recipient_id: user.id,
            content: `✅ Creative files submitted for "${listingTitle ?? 'your listing'}"\n\nThe host will review your files and begin setup. You'll receive proof of posting when your ad goes live.\n\nView booking: https://www.cityfeed.io/dashboard/bookings/${bookingId}`,
          })
          // Notification to host — via /api/notify (RLS blocks cross-user inserts from client)
          await notify({
            user_id: hostId!,
            type: 'collateral_uploaded',
            title: `Creative files uploaded`,
            body: `For "${listingTitle ?? 'booking'}"`,
            href: `/dashboard/bookings/${bookingId}`,
          })
          // Notification to advertiser confirming submission
          await notify({
            user_id: advertiserId!,
            type: 'creative_submitted',
            title: `Creative submitted`,
            body: `Your files for "${listingTitle ?? 'booking'}" have been submitted`,
            href: `/dashboard/bookings/${bookingId}`,
          })
          const { data: hostProfile } = await supabase
            .from('profiles').select('email, full_name').eq('id', hostId).single()
          const { data: advProfile } = await supabase
            .from('profiles').select('full_name, email').eq('id', advertiserId).single()
          // Email to host
          if (hostProfile?.email) {
            await fetch('/api/email/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'collateral_uploaded',
                hostEmail: hostProfile.email,
                listingTitle: listingTitle ?? 'your listing',
                advertiserName: advProfile?.full_name ?? 'The advertiser',
                bookingId,
                dates: booking?.start_date && booking?.end_date ? `${booking.start_date} → ${booking.end_date}` : undefined,
              }),
            })
          }
          // Email to advertiser confirming creative submission
          if (advProfile?.email) {
            await fetch('/api/email/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'creative_submitted_advertiser',
                advertiserEmail: advProfile.email,
                listingTitle: listingTitle ?? 'your listing',
                bookingId,
                dates: booking?.start_date && booking?.end_date ? `${booking.start_date} → ${booking.end_date}` : undefined,
              }),
            })
          }
        }
      } catch { /* non-fatal */ }
    }
  }, [pendingFiles, folderPath, isHost, hostId, advertiserId, bookingId, listingTitle]) // eslint-disable-line react-hooks/exhaustive-deps

  // Upload additional files (after success state)
  const handleAdditionalFiles = useCallback(async (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return
    setUploading(true)
    for (const file of Array.from(incoming)) {
      const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const fd = new FormData()
      fd.append('file', file)
      fd.append('path', `${folderPath}/${safeName}`)
      await fetch('/api/collateral/upload', { method: 'POST', body: fd })
    }
    setUploading(false)
    setShowAdditional(false)
    await loadFiles()

    // Log to activity feed — additional creative uploads should be visible too
    if (!isHost && hostId && advertiserId) {
      try {
        await Promise.all([
          notify({
            user_id: hostId,
            type: 'collateral_uploaded',
            title: 'Additional creative files uploaded',
            body: `For "${listingTitle ?? 'booking'}"`,
            href: `/dashboard/bookings/${bookingId}`,
          }),
          notify({
            user_id: advertiserId,
            type: 'creative_submitted',
            title: 'Additional creative submitted',
            body: `Your new files for "${listingTitle ?? 'booking'}" have been submitted`,
            href: `/dashboard/bookings/${bookingId}`,
          }),
        ])
      } catch { /* non-fatal */ }
    }
  }, [folderPath, isHost, hostId, advertiserId, bookingId, listingTitle]) // eslint-disable-line react-hooks/exhaustive-deps

  async function deleteFile(path: string) {
    const { error } = await supabase.storage.from('booking-collateral').remove([path])
    if (!error) await loadFiles()
  }

  const hasFiles = files.length > 0
  const canUpload = !isHost && ['confirmed', 'active'].includes(bookingStatus)
  // For requires_print listings: only show upload when delivery_mode is host_prints (or not yet set for non-print listings)
  const isSelfDeliver = listing?.requires_print && booking?.delivery_mode === 'self_deliver'
  const needsChoice = listing?.requires_print && !booking?.delivery_mode
  const showUploadArea = canUpload && !isSelfDeliver && !needsChoice
  // Show success state if upload was just completed OR if files already exist (returning to page)
  const showSuccessState = showUploadArea && (uploadComplete || hasFiles)

  return (
    <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: '1px solid var(--border, #e0e0d8)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      {/* Header — wraps on narrow screens so the status pill never clips */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--charcoal, #2b2b2b)' }}>
          {(isSelfDeliver || needsChoice) ? (isHost ? 'Advertiser Materials' : 'Printed Materials') : isHost ? 'Advertiser Creative Files' : 'Upload Your Creative Files'}
        </h2>
        {showSuccessState ? null : hasFiles ? (
          <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(22,163,74,0.1)', color: '#16a34a' }}>
            <CheckCircle className="w-3 h-3" />
            Creative Files Uploaded ✅
          </span>
        ) : bookingStatus === 'completed' ? (
          <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: 'var(--light-gray, #f8f8f5)', color: '#888' }}>
            No Creative Files
          </span>
        ) : isSelfDeliver ? (
          isHost ? (
            booking?.received_at ? (
              <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(22,163,74,0.1)', color: '#16a34a' }}>
                <CheckCircle className="w-3 h-3" />
                Materials Received ✅
              </span>
            ) : (booking?.shipped_at || booking?.dropped_off_at) ? (
              <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
                <Package className="w-3 h-3" />
                Materials In Transit
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
                <Clock className="w-3 h-3" />
                Awaiting Materials
              </span>
            )
          ) : booking?.received_at ? (
            <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(22,163,74,0.1)', color: '#16a34a' }}>
              <CheckCircle className="w-3 h-3" />
              Materials Received ✅
            </span>
          ) : (booking?.shipped_at || booking?.dropped_off_at) ? (
            <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
              <Package className="w-3 h-3" />
              Materials In Transit
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
              <Truck className="w-3 h-3" />
              Send Your Materials
            </span>
          )
        ) : needsChoice ? (
          <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
            <Package className="w-3 h-3 flex-shrink-0" />
            {isHost ? 'Awaiting Materials' : 'Choose Delivery Method'}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap" style={{ backgroundColor: 'rgba(180,83,9,0.08)', color: '#b45309' }}>
            <Clock className="w-3 h-3 flex-shrink-0" />
            {isHost ? 'Awaiting Creative Files' : 'Upload Required'}
          </span>
        )}
      </div>

      {/* ── DELIVERY METHOD CHOICE — for requires_print listings ── */}
      {!isHost && listing?.requires_print && !booking?.delivery_mode && canUpload && !showSuccessState && (
        <div className="mb-5 rounded-xl p-5" style={{ backgroundColor: 'var(--light-gray, #f8f8f5)', border: '1px solid var(--border, #e0e0d8)' }}>
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--charcoal, #2b2b2b)' }}>How will your materials arrive?</p>
          <p className="text-xs mb-3" style={{ color: '#888' }}>Choose how you&apos;ll get your printed materials to the host.</p>
          <div className="space-y-2">
            <button
              type="button"
              onClick={async () => {
                const supabase = createClient()
                await supabase.from('bookings').update({ delivery_mode: 'self_deliver' }).eq('id', bookingId)
                onBookingUpdate?.({ delivery_mode: 'self_deliver' })
              }}
              className="w-full text-left px-4 py-3 rounded-xl text-sm transition-colors hover:bg-white flex items-center gap-3"
              style={{ border: '1px solid var(--border, #e0e0d8)' }}
            >
              <Truck className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--mint, #7ecfc0)' }} />
              <div>
                <span className="font-medium" style={{ color: 'var(--charcoal, #2b2b2b)' }}>Ship my materials</span>
                <p className="text-xs mt-0.5" style={{ color: '#888' }}>Mail your prints to the host&apos;s address</p>
              </div>
            </button>
            <button
              type="button"
              onClick={async () => {
                const supabase = createClient()
                await supabase.from('bookings').update({ delivery_mode: 'self_deliver' }).eq('id', bookingId)
                onBookingUpdate?.({ delivery_mode: 'self_deliver' })
              }}
              className="w-full text-left px-4 py-3 rounded-xl text-sm transition-colors hover:bg-white flex items-center gap-3"
              style={{ border: '1px solid var(--border, #e0e0d8)' }}
            >
              <Package className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--mint, #7ecfc0)' }} />
              <div>
                <span className="font-medium" style={{ color: 'var(--charcoal, #2b2b2b)' }}>Drop off in person</span>
                <p className="text-xs mt-0.5" style={{ color: '#888' }}>Deliver directly to the host</p>
              </div>
            </button>
          </div>
          {/* Host printing is a PAID add-on selected at booking time (print fee is charged
              in checkout). Offering it here would hand it out free — the host would never
              be compensated. Advertisers who change their mind can arrange it with the host. */}

        </div>
      )}

      {/* Advertiser intro text — only before upload */}
      {!isHost && !showSuccessState && (!listing?.requires_print || booking?.delivery_mode === 'host_prints') && (
        <p className="text-sm mb-5 leading-relaxed" style={{ color: '#555' }}>
          Please deliver your creative files within the production window listed on this placement.
          Your host will begin setup once received.
        </p>
      )}

      {/* Host note — no files yet */}
      {isHost && !hasFiles && bookingStatus !== 'completed' && (
        <p className="text-sm mb-5" style={{ color: '#888' }}>
          Creative files haven&apos;t been uploaded yet. You&apos;ll be notified when they arrive.
        </p>
      )}

      {/* Advertiser note — no files, can't upload (booking already completed) */}
      {!isHost && !hasFiles && bookingStatus === 'completed' && (
        <p className="text-sm mb-5" style={{ color: '#888' }}>
          No creative files were uploaded for this booking.
        </p>
      )}

      {/* ── SELF-DELIVER VIEW — show host address + shipping actions ── */}
      {isSelfDeliver && ['confirmed', 'active', 'completed'].includes(bookingStatus) && (
        <ShippingSection
          bookingId={bookingId}
          isHost={isHost}
          booking={booking!}
          deliveryAddress={listing?.delivery_address ?? ''}
          listingTitle={listingTitle}
          hostId={hostId}
          advertiserId={advertiserId}
          onBookingUpdate={onBookingUpdate}
        />
      )}

      {/* ── ADVERTISER UPLOAD AREA (pre-upload) ─────────────────── */}
      {showUploadArea && !showSuccessState && (
        <>
          <div
            className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors mb-4"
            style={{
              borderColor: isDragging ? 'var(--mint, #7ecfc0)' : 'var(--border, #e0e0d8)',
              backgroundColor: isDragging ? 'rgba(126,207,192,0.05)' : 'transparent',
            }}
            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => { e.preventDefault(); setIsDragging(false); handleStagedFiles(e.dataTransfer.files) }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: isDragging ? 'var(--mint, #7ecfc0)' : '#ccc' }} />
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--charcoal, #2b2b2b)' }}>
              Drag & drop or <span style={{ color: 'var(--mint, #7ecfc0)' }}>click to browse</span>
            </p>
            <p className="text-xs" style={{ color: '#aaa' }}>
              Accepted formats: {ACCEPTED_FORMATS.join(', ')} · Max 100MB per file
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.mp4,.ai,.psd,.zip"
              className="hidden"
              onChange={e => handleStagedFiles(e.target.files)}
            />
          </div>

          {/* Staged files preview */}
          {pendingFiles.length > 0 && (
            <div className="space-y-2 mb-4">
              {pendingFiles.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ backgroundColor: 'var(--light-gray, #f8f8f5)', border: '1px solid var(--border, #e0e0d8)' }}
                >
                  <FileIcon type={file.type} name={file.name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--charcoal, #2b2b2b)' }}>{file.name}</p>
                    <p className="text-xs" style={{ color: '#aaa' }}>{formatBytes(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingFiles(prev => prev.filter((_, idx) => idx !== i))}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" style={{ color: '#aaa' }} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload button — only shown when files are staged */}
          {pendingFiles.length > 0 && (
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60 mb-4"
              style={{ backgroundColor: 'var(--gold, #debb73)', color: 'var(--charcoal, #2b2b2b)' }}
            >
              {uploading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
              ) : (
                <><Upload className="w-4 h-4" /> Submit Creative Files</>
              )}
            </button>
          )}
        </>
      )}

      {/* ── SUCCESS STATE (after upload) ────────────────────────── */}
      {showSuccessState && (
        <div className="rounded-xl p-5 mb-4" style={{ backgroundColor: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.2)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl" style={{ backgroundColor: 'rgba(22,163,74,0.12)' }}>
              <CheckCircle className="w-5 h-5" style={{ color: '#16a34a' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#16a34a' }}>Creative Submitted ✅</p>
              <p className="text-xs mt-0.5" style={{ color: '#555' }}>Your host will review your files, begin setup, and send you proof of posting</p>
            </div>
          </div>
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2 mb-4" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {uploadError}
        </div>
      )}

      {/* Files list */}
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--mint, #7ecfc0)' }} />
        </div>
      ) : hasFiles ? (
        <div className="space-y-2">
          {files.map(file => (
            <div
              key={file.path}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ backgroundColor: 'var(--light-gray, #f8f8f5)', border: '1px solid var(--border, #e0e0d8)' }}
            >
              {(file.type?.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(file.name)) && file.url ? (
                <button
                  type="button"
                  onClick={() => setLightboxFile({ url: file.url!, name: file.name })}
                  className="flex-shrink-0 cursor-zoom-in rounded-lg overflow-hidden"
                  title="Preview"
                >
                  <img src={file.url} alt={file.name} className="w-12 h-12 rounded-lg object-cover block" />
                </button>
              ) : (
                <FileIcon type={file.type} name={file.name} />
              )}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium truncate${(file.type?.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(file.name)) && file.url ? ' cursor-pointer hover:underline underline-offset-2' : ''}`}
                  style={{ color: 'var(--charcoal, #2b2b2b)' }}
                  onClick={() => {
                    if ((file.type?.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(file.name)) && file.url) {
                      setLightboxFile({ url: file.url, name: file.name })
                    }
                  }}
                >{file.name}</p>
                {file.size > 0 && (
                  <p className="text-xs" style={{ color: '#aaa' }}>{formatBytes(file.size)}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {file.url && isHost && (
                  <button
                    type="button"
                    onClick={() => forceDownload(file.url!, file.name)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" style={{ color: '#888' }} />
                  </button>
                )}
                {file.url && !isHost && (
                  <a
                    href={file.url}
                    download={file.name}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" style={{ color: '#888' }} />
                  </a>
                )}
                {!isHost && (
                  <button
                    type="button"
                    onClick={() => deleteFile(file.path)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white transition-colors"
                    title="Remove"
                  >
                    <X className="w-4 h-4" style={{ color: '#aaa' }} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Lightbox preview for creative image files */}
      {lightboxFile && (
        <Lightbox url={lightboxFile.url} name={lightboxFile.name} onClose={() => setLightboxFile(null)} />
      )}

      {/* "Forget something?" — subtle link after success state */}
      {showSuccessState && (
        <div className="mt-4">
          {!showAdditional ? (
            <button
              type="button"
              onClick={() => setShowAdditional(true)}
              className="text-xs hover:underline underline-offset-2 transition-opacity"
              style={{ color: '#aaa' }}
            >
              Forget something? Upload additional creative
            </button>
          ) : (
            <div>
              <div
                className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors"
                style={{
                  borderColor: isDraggingAdditional ? 'var(--mint, #7ecfc0)' : 'var(--border, #e0e0d8)',
                  backgroundColor: isDraggingAdditional ? 'rgba(126,207,192,0.05)' : 'transparent',
                }}
                onDragOver={e => { e.preventDefault(); setIsDraggingAdditional(true) }}
                onDragLeave={() => setIsDraggingAdditional(false)}
                onDrop={e => { e.preventDefault(); setIsDraggingAdditional(false); handleAdditionalFiles(e.dataTransfer.files) }}
                onClick={() => additionalInputRef.current?.click()}
              >
                {uploading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--mint, #7ecfc0)' }} />
                    <span className="text-xs" style={{ color: '#888' }}>Uploading...</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mx-auto mb-1.5" style={{ color: '#ccc' }} />
                    <p className="text-xs" style={{ color: '#888' }}>
                      Drop files or <span style={{ color: 'var(--mint, #7ecfc0)' }}>click to browse</span>
                    </p>
                  </>
                )}
                <input
                  ref={additionalInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.mp4,.ai,.psd,.zip"
                  className="hidden"
                  onChange={e => handleAdditionalFiles(e.target.files)}
                />
              </div>
              <button
                type="button"
                onClick={() => setShowAdditional(false)}
                className="text-xs mt-2 hover:underline"
                style={{ color: '#aaa' }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Shipping Section (self_deliver flow) ─────────────────────────────────────

interface ShippingSectionProps {
  bookingId: string
  isHost: boolean
  booking: Booking
  deliveryAddress: string
  listingTitle?: string
  hostId?: string
  advertiserId?: string
  onBookingUpdate?: (b: Partial<Booking>) => void
}

function ShippingSection({ bookingId, isHost, booking, deliveryAddress, listingTitle, hostId, advertiserId, onBookingUpdate }: ShippingSectionProps) {
  const [trackingNumber, setTrackingNumber] = useState(booking.tracking_number ?? '')
  const [deliveryMethod, setDeliveryMethod] = useState<'ship' | 'dropoff' | null>(booking.dropped_off_at ? 'dropoff' : booking.shipped_at ? 'ship' : null)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function markShipped() {
    setSaving(true)
    const now = new Date().toISOString()
    await supabase.from('bookings').update({
      shipped_at: now,
      tracking_number: trackingNumber || null,
    }).eq('id', bookingId)
    onBookingUpdate?.({ shipped_at: now, tracking_number: trackingNumber || null })

    // Notify host
    if (hostId) {
      await notify({
        user_id: hostId,
        type: 'materials_shipped',
        title: 'Materials shipped',
        body: `Printed materials for "${listingTitle ?? 'booking'}" have been shipped${trackingNumber ? ` (tracking: ${trackingNumber})` : ''}.`,
        href: `/dashboard/bookings/${bookingId}`,
      })
      await systemMessage({
        booking_id: bookingId,
        to: 'host',
        content: `📦 Printed materials have been shipped!${trackingNumber ? `\n\nTracking: ${trackingNumber}` : ''}\n\nView booking: https://www.cityfeed.io/dashboard/bookings/${bookingId}`,
      })
      // Confirmation variant for the ADVERTISER (acting party sees their action in the thread)
      await systemMessage({
        booking_id: bookingId,
        to: 'advertiser',
        content: `📦 You marked your materials as shipped${trackingNumber ? ` (tracking: ${trackingNumber})` : ''}. Your host has been notified and will confirm receipt when they arrive.`,
      })
      // Email host
      try {
        const { data: hostProfile } = await supabase.from('profiles').select('email, full_name').eq('id', hostId).single()
        const { data: advProfile } = await supabase.from('profiles').select('full_name').eq('id', advertiserId ?? '').single()
        if (hostProfile?.email) {
          await fetch('/api/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'materials_shipped',
              hostEmail: hostProfile.email,
              listingTitle: listingTitle ?? 'your listing',
              advertiserName: advProfile?.full_name ?? 'The advertiser',
              bookingId,
              trackingNumber: trackingNumber || undefined,
              isDropOff: false,
              dates: booking.start_date && booking.end_date ? `${booking.start_date} → ${booking.end_date}` : undefined,
            }),
          })
        }
        // Confirmation email to the ADVERTISER (acting party)
        const { data: { user: me } } = await supabase.auth.getUser()
        if (me?.email) {
          await fetch('/api/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'materials_shipped_confirm',
              advertiserEmail: me.email,
              listingTitle: listingTitle ?? 'your listing',
              bookingId,
              trackingNumber: trackingNumber || undefined,
              isDropOff: false,
              dates: booking.start_date && booking.end_date ? `${booking.start_date} → ${booking.end_date}` : undefined,
            }),
          })
        }
      } catch (err) { console.error('[markShipped] email error:', err) }
    }
    setSaving(false)
  }

  async function markDroppedOff() {
    setSaving(true)
    const now = new Date().toISOString()
    await supabase.from('bookings').update({ dropped_off_at: now }).eq('id', bookingId)
    onBookingUpdate?.({ dropped_off_at: now })

    if (hostId) {
      await notify({
        user_id: hostId,
        type: 'materials_shipped',
        title: 'Materials dropped off',
        body: `Printed materials for "${listingTitle ?? 'booking'}" have been dropped off.`,
        href: `/dashboard/bookings/${bookingId}`,
      })
      await systemMessage({
        booking_id: bookingId,
        to: 'host',
        content: `📦 Printed materials have been dropped off!\n\nView booking: https://www.cityfeed.io/dashboard/bookings/${bookingId}`,
      })
      // Confirmation variant for the ADVERTISER
      await systemMessage({
        booking_id: bookingId,
        to: 'advertiser',
        content: `📦 You marked your materials as dropped off. Your host has been notified and will confirm receipt.`,
      })
      // Email host
      try {
        const { data: hostProfile } = await supabase.from('profiles').select('email, full_name').eq('id', hostId).single()
        const { data: advProfile } = await supabase.from('profiles').select('full_name').eq('id', advertiserId ?? '').single()
        if (hostProfile?.email) {
          await fetch('/api/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'materials_shipped',
              hostEmail: hostProfile.email,
              listingTitle: listingTitle ?? 'your listing',
              advertiserName: advProfile?.full_name ?? 'The advertiser',
              bookingId,
              isDropOff: true,
              dates: booking.start_date && booking.end_date ? `${booking.start_date} → ${booking.end_date}` : undefined,
            }),
          })
        }
        // Confirmation email to the ADVERTISER (acting party)
        const { data: { user: me } } = await supabase.auth.getUser()
        if (me?.email) {
          await fetch('/api/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'materials_shipped_confirm',
              advertiserEmail: me.email,
              listingTitle: listingTitle ?? 'your listing',
              bookingId,
              isDropOff: true,
              dates: booking.start_date && booking.end_date ? `${booking.start_date} → ${booking.end_date}` : undefined,
            }),
          })
        }
      } catch (err) { console.error('[markDroppedOff] email error:', err) }
    }
    setSaving(false)
  }

  async function markReceived() {
    setSaving(true)
    const now = new Date().toISOString()
    await supabase.from('bookings').update({ received_at: now }).eq('id', bookingId)
    onBookingUpdate?.({ received_at: now })

    if (advertiserId) {
      await notify({
        user_id: advertiserId,
        type: 'materials_received',
        title: 'Materials received',
        body: `Your host has confirmed receipt of materials for "${listingTitle ?? 'booking'}".`,
        href: `/dashboard/bookings/${bookingId}`,
      })
      await systemMessage({
        booking_id: bookingId,
        to: 'advertiser',
        content: `✅ Your printed materials have been received! Your host will proceed with installation and submit proof of posting once your ad is live.\n\nView booking: https://www.cityfeed.io/dashboard/bookings/${bookingId}`,
      })
      // Confirmation variant for the HOST (acting party) — next step + urgency
      await systemMessage({
        booking_id: bookingId,
        to: 'host',
        content: `✅ You confirmed receipt of the advertiser's materials.\n\nNext step: post the ad on or before ${booking.start_date ? new Date(booking.start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'the campaign start date'}, then upload proof of posting to get paid.`,
      })
      // Email advertiser
      try {
        const { data: advProfile } = await supabase.from('profiles').select('email').eq('id', advertiserId).single()
        if (advProfile?.email) {
          await fetch('/api/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'materials_received',
              advertiserEmail: advProfile.email,
              listingTitle: listingTitle ?? 'your listing',
              bookingId,
              dates: booking.start_date && booking.end_date ? `${booking.start_date} → ${booking.end_date}` : undefined,
            }),
          })
        }
        // Confirmation email to the HOST (acting party) — next step + urgency
        const { data: { user: me } } = await supabase.auth.getUser()
        if (me?.email) {
          await fetch('/api/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'materials_received_host',
              hostEmail: me.email,
              listingTitle: listingTitle ?? 'your listing',
              bookingId,
              startDate: booking.start_date ? new Date(booking.start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : undefined,
              dates: booking.start_date && booking.end_date ? `${booking.start_date} → ${booking.end_date}` : undefined,
            }),
          })
        }
      } catch (err) { console.error('[markReceived] email error:', err) }
    }
    setSaving(false)
  }

  const alreadySent = !!(booking.shipped_at || booking.dropped_off_at)

  // Advertiser view
  if (!isHost) {
    return (
      <div className="rounded-xl p-5 mb-4" style={{ backgroundColor: 'var(--light-gray, #f8f8f5)', border: '1px solid var(--border, #e0e0d8)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-4 h-4" style={{ color: 'var(--mint, #7ecfc0)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--charcoal, #2b2b2b)' }}>Delivery Details</p>
        </div>
        {deliveryAddress ? (
          <p className="text-sm mb-4 leading-relaxed" style={{ color: '#555' }}>{deliveryAddress}</p>
        ) : (
          <p className="text-sm mb-4 leading-relaxed" style={{ color: '#888' }}>
            Your host hasn&apos;t added a delivery address to this listing yet — message them for delivery details.
          </p>
        )}

        {alreadySent ? (
          <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.2)' }}>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" style={{ color: '#16a34a' }} />
              <p className="text-sm font-medium" style={{ color: '#16a34a' }}>
                {booking.dropped_off_at
                  ? `Dropped off on ${new Date(booking.dropped_off_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                  : `Shipped on ${new Date(booking.shipped_at!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
              </p>
            </div>
            {booking.tracking_number && (
              <p className="text-xs mt-1 ml-6" style={{ color: '#888' }}>Tracking: {booking.tracking_number}</p>
            )}
            {booking.received_at ? (
              <div className="flex items-center gap-2 mt-2 ml-6">
                <CheckCircle className="w-3.5 h-3.5" style={{ color: '#16a34a' }} />
                <p className="text-xs" style={{ color: '#16a34a' }}>
                  Your host confirmed receipt on {new Date(booking.received_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            ) : (
              <p className="text-xs mt-2 ml-6" style={{ color: '#888' }}>Awaiting host confirmation of receipt</p>
            )}
          </div>
        ) : !deliveryMethod ? (
          /* Choose: Ship or Drop off */
          <div className="space-y-2">
            <p className="text-xs font-medium mb-2" style={{ color: '#555' }}>How will your materials arrive?</p>
            <button
              type="button"
              onClick={() => setDeliveryMethod('ship')}
              className="w-full text-left px-4 py-3 rounded-xl text-sm transition-colors hover:bg-white flex items-center gap-3"
              style={{ border: '1px solid var(--border, #e0e0d8)' }}
            >
              <Truck className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--mint, #7ecfc0)' }} />
              <div>
                <span className="font-medium" style={{ color: 'var(--charcoal, #2b2b2b)' }}>Ship</span>
                <p className="text-xs mt-0.5" style={{ color: '#888' }}>Mail your materials to the address above</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setDeliveryMethod('dropoff')}
              className="w-full text-left px-4 py-3 rounded-xl text-sm transition-colors hover:bg-white flex items-center gap-3"
              style={{ border: '1px solid var(--border, #e0e0d8)' }}
            >
              <Package className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--mint, #7ecfc0)' }} />
              <div>
                <span className="font-medium" style={{ color: 'var(--charcoal, #2b2b2b)' }}>Drop off in person</span>
                <p className="text-xs mt-0.5" style={{ color: '#888' }}>Deliver directly to the address above</p>
              </div>
            </button>
          </div>
        ) : deliveryMethod === 'ship' ? (
          <>
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1" style={{ color: '#888' }}>Tracking number (optional)</label>
              <input
                type="text"
                value={trackingNumber}
                onChange={e => setTrackingNumber(e.target.value)}
                placeholder="e.g. 1Z999AA10123456784"
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                style={{ backgroundColor: '#fff', border: '1px solid var(--border, #e0e0d8)', color: 'var(--charcoal, #2b2b2b)' }}
              />
            </div>
            <button
              type="button"
              onClick={markShipped}
              disabled={saving}
              className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
              style={{ backgroundColor: 'var(--gold, #debb73)', color: 'var(--charcoal, #2b2b2b)' }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
              Mark as Shipped
            </button>
            <button type="button" onClick={() => setDeliveryMethod(null)} className="text-xs mt-2 hover:underline" style={{ color: '#aaa' }}>Back</button>
          </>
        ) : (
          /* Drop-off flow */
          <>
            <p className="text-xs mb-3" style={{ color: '#888' }}>Coordinate timing with your host via Messages if needed.</p>
            <button
              type="button"
              onClick={markDroppedOff}
              disabled={saving}
              className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
              style={{ backgroundColor: 'var(--gold, #debb73)', color: 'var(--charcoal, #2b2b2b)' }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
              Mark as Dropped Off
            </button>
            <button type="button" onClick={() => setDeliveryMethod(null)} className="text-xs mt-2 hover:underline" style={{ color: '#aaa' }}>Back</button>
          </>
        )}
      </div>
    )
  }

  // Host view
  return (
    <div className="rounded-xl p-5 mb-4" style={{ backgroundColor: 'var(--light-gray, #f8f8f5)', border: '1px solid var(--border, #e0e0d8)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Truck className="w-4 h-4" style={{ color: 'var(--mint, #7ecfc0)' }} />
        <p className="text-sm font-semibold" style={{ color: 'var(--charcoal, #2b2b2b)' }}>Material Delivery</p>
      </div>
      {!booking.shipped_at && !booking.dropped_off_at ? (
        <p className="text-sm" style={{ color: '#888' }}>Printed materials are being prepared for delivery.</p>
      ) : !booking.received_at ? (
        <>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4" style={{ color: 'var(--mint, #7ecfc0)' }} />
            <p className="text-sm" style={{ color: '#555' }}>
              {booking.dropped_off_at
                ? `Materials dropped off on ${new Date(booking.dropped_off_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                : `Materials shipped on ${new Date(booking.shipped_at!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
            </p>
          </div>
          {booking.tracking_number && (
            <p className="text-xs mb-3" style={{ color: '#888' }}>Tracking: {booking.tracking_number}</p>
          )}
          <button
            type="button"
            onClick={markReceived}
            disabled={saving}
            className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
            style={{ backgroundColor: 'var(--mint, #7ecfc0)', color: '#fff' }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Mark as Received
          </button>
        </>
      ) : (
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4" style={{ color: '#16a34a' }} />
          <p className="text-sm" style={{ color: '#16a34a' }}>
            Materials received on {new Date(booking.received_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── POP (Proof of Posting) Section — Host only ────────────────────────────────

interface POPSectionProps {
  bookingId: string
  bookingStatus: string
  isHost: boolean
  advertiserId?: string
  hostId?: string
  listingTitle?: string
  hasCreativeFiles?: boolean
  startDate?: string
  endDate?: string
}

function POPSection({ bookingId, bookingStatus, isHost, advertiserId, hostId, listingTitle, hasCreativeFiles, startDate, endDate }: POPSectionProps) {
  const [files, setFiles] = useState<CollateralFile[]>([])
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [popLightbox, setPopLightbox] = useState<{ url: string; name: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const folderPath = `pop/${bookingId}`

  const alreadySubmitted = submitted || bookingStatus === 'completed'

  async function loadPOPFiles() {
    try {
      const res = await fetch(`/api/collateral/list?bookingId=pop-${bookingId}`)
      const json = await res.json()
      if (json.files && json.files.length > 0) {
        setFiles(json.files)
        setSubmitted(true)
      }
    } catch {
      // Fallback to direct storage list for host
      const { data } = await supabase.storage.from('booking-collateral').list(folderPath)
      if (!data || data.length === 0) return
      const withUrls: CollateralFile[] = await Promise.all(
        data.map(async (item) => {
          const { data: urlData } = await supabase.storage
            .from('booking-collateral')
            .createSignedUrl(`${folderPath}/${item.name}`, 3600)
          return {
            name: item.name,
            path: `${folderPath}/${item.name}`,
            size: item.metadata?.size ?? 0,
            type: item.metadata?.mimetype ?? '',
            url: urlData?.signedUrl,
          }
        })
      )
      setFiles(withUrls)
      if (withUrls.length > 0) setSubmitted(true)
    }
  }

  useEffect(() => {
    loadPOPFiles()
  }, [bookingId]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleStagePOPFiles(incoming: FileList | null) {
    if (!incoming || incoming.length === 0) return
    if (fileInputRef.current) fileInputRef.current.value = ''
    setPendingFiles(prev => [...prev, ...Array.from(incoming)])
    setError('')
  }

  function removePendingFile(index: number) {
    setPendingFiles(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmitPOP() {
    if (pendingFiles.length === 0 || uploading) return
    setUploading(true)
    setError('')

    const uploadedUrls: string[] = []
    const uploadedNames: string[] = []
    for (const file of pendingFiles) {
      const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const fd = new FormData()
      fd.append('file', file)
      fd.append('path', `${folderPath}/${safeName}`)
      const uploadRes = await fetch('/api/collateral/upload', { method: 'POST', body: fd })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) {
        setError(uploadData.error || 'Upload failed')
      } else {
        uploadedNames.push(safeName)
        if (uploadData.url) uploadedUrls.push(uploadData.url)
      }
    }

    // Update booking status → completed only if files actually uploaded
    if (uploadedUrls.length === 0) {
      setUploading(false)
      return
    }
    // Mark POP submitted — payout-eligible status; if the payout call below fails,
    // the booking stays here and the daily cron retries every 24h until it succeeds
    await supabase.from('bookings').update({ status: 'pop_pending', updated_at: new Date().toISOString() }).eq('id', bookingId)

    // Trigger payout immediately (escrow model — transfer from platform to host)
    // Payout route handles status transition to 'completed' after successful Stripe transfer
    try {
      const payoutRes = await fetch('/api/stripe/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId }),
      })
      const payoutData = await payoutRes.json()
      if (!payoutRes.ok) {
        console.error('[POP] Payout failed:', payoutData.error)
      } else {
        console.log('[POP] Payout success:', payoutData)
      }
    } catch (err) {
      console.error('[POP] Payout fetch error:', err)
    }

    setPendingFiles([])
    setUploading(false)
    setSubmitted(true)
    await loadPOPFiles()

    // Auto-send POP messages in chat — transparency for advertiser, confirmation for host
    if (advertiserId && hostId) {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // Use URLs returned from the upload API
          const photoUrls: string[] = uploadedUrls

          const photoText = photoUrls.length > 0
            ? `\n\n${photoUrls.join('\n')}`
            : ''

          // System message to advertiser — proof is uploaded (neutral, advertiser-only visibility)
          await systemMessage({
            booking_id: bookingId,
            to: 'advertiser',
            content: `📸 Your host has confirmed your ad placement is live! Here's the proof. If anything looks wrong, message your host directly.\n\nView booking: https://www.cityfeed.io/dashboard/bookings/${bookingId}${photoText}`,
            image_url: photoUrls[0] ?? null,
          })
          // Note: self-message (host → host) removed — host receives the pop_submitted notification instead

          // Notify advertiser — via /api/notify (RLS blocks cross-user inserts from client)
          await notify({
            user_id: advertiserId,
            type: 'pop_submitted',
            title: 'Your ad is live 🟢',
            body: `"${listingTitle ?? 'your booking'}" — proof of posting confirmed.`,
            href: `/dashboard/bookings/${bookingId}`,
          })
        }
      } catch { /* non-fatal */ }

      // Send email notification to advertiser about POP
      try {
        const { data: advProfile } = await supabase
          .from('profiles').select('email').eq('id', advertiserId).single()
        if (advProfile?.email) {
          await fetch('/api/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'pop_submitted',
              advertiserEmail: advProfile.email,
              listingTitle: listingTitle ?? 'your listing',
              bookingId,
              bookingUrl: `${window.location.origin}/dashboard/bookings/${bookingId}`,
              dates: startDate && endDate ? `${startDate} → ${endDate}` : undefined,
              popPhotoUrl: uploadedUrls[0] ?? undefined,
            }),
          })
        }
      } catch { /* email failure non-fatal */ }

      // Notify host — POP submitted + payout incoming.
      // NOTE (2026-08-15): host confirmation EMAIL now sends server-side from
      // /api/stripe/payout with the exact net payout amount — the old client-side
      // send was unreliable and never arrived. Only the in-app notification fires here.
      try {
        await notify({
          user_id: hostId,
          type: 'pop_submitted',
          title: 'Proof of posting submitted',
          body: `Your POP for "${listingTitle ?? 'your booking'}" is confirmed — payout incoming.`,
          href: `/dashboard/bookings/${bookingId}`,
        })
      } catch { /* host notification non-fatal */ }
    }
  }

  // Only show for relevant statuses (simplified flow: confirmed → completed)
  const showStatuses = ['confirmed', 'completed']
  if (!showStatuses.includes(bookingStatus)) return null

  // Advertiser view: show POP photos if they exist, or "awaiting proof" message
  if (!isHost) {
    if (files.length === 0 && ['confirmed', 'active'].includes(bookingStatus)) {
      return (
        <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: '1px solid var(--border, #e0e0d8)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl" style={{ backgroundColor: 'rgba(126,207,192,0.08)' }}>
              <Camera className="w-5 h-5" style={{ color: 'var(--mint, #7ecfc0)' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--charcoal, #2b2b2b)' }}>Proof of Posting</p>
              <p className="text-xs mt-0.5" style={{ color: '#888' }}>Your host will submit proof of posting once your ad is live.</p>
            </div>
          </div>
        </div>
      )
    }
    if (files.length === 0) return null
    return (
      <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: '1px solid var(--border, #e0e0d8)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl" style={{ backgroundColor: 'rgba(22,163,74,0.08)' }}>
            <Camera className="w-5 h-5" style={{ color: '#16a34a' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--charcoal, #2b2b2b)' }}>Proof of Posting</p>
            <p className="text-xs mt-0.5" style={{ color: '#888' }}>Your host uploaded these photos as proof your ad is live.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          {files.filter(f => f.type?.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(f.name)).map(f => (
            <button
              type="button"
              key={f.path}
              onClick={() => f.url && setPopLightbox({ url: f.url, name: f.name })}
              className="rounded-xl overflow-hidden aspect-video cursor-zoom-in"
              style={{ border: '1px solid var(--border, #e0e0d8)' }}
              title="Preview"
            >
              <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
        {popLightbox && (
          <Lightbox url={popLightbox.url} name={popLightbox.name} onClose={() => setPopLightbox(null)} />
        )}
        <div className="space-y-2">
          {files.map(f => (
            <div key={f.path} className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--light-gray, #f8f8f5)', border: '1px solid var(--border, #e0e0d8)' }}>
              <FileIcon type={f.type} name={f.name} />
              <span className="text-sm flex-1 truncate" style={{ color: '#555' }}>{f.name}</span>
              {f.url && (
                <button
                  type="button"
                  onClick={() => forceDownload(f.url!, f.name)}
                  className="p-1.5 rounded hover:bg-white transition-colors"
                  title="Download"
                >
                  <Download className="w-3.5 h-3.5" style={{ color: '#888' }} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (alreadySubmitted) {
    return (
      <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: '1px solid var(--border, #e0e0d8)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ backgroundColor: 'rgba(22,163,74,0.08)' }}>
            <CheckCircle className="w-5 h-5" style={{ color: '#16a34a' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--charcoal, #2b2b2b)' }}>Proof of Posting Submitted ✅</p>
            <p className="text-xs mt-0.5" style={{ color: '#888' }}>Payout initiated — expected within 2 business days</p>
          </div>
        </div>
        {files.length > 0 && (
          <div className="space-y-2 mt-4">
            {files.map(f => (
              <div key={f.path} className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--light-gray, #f8f8f5)', border: '1px solid var(--border, #e0e0d8)' }}>
                <FileIcon type={f.type} name={f.name} />
                <span className="text-sm flex-1 truncate" style={{ color: '#555' }}>{f.name}</span>
                {f.url && (
                  <button
                    type="button"
                    onClick={() => forceDownload(f.url!, f.name)}
                    className="p-1.5 rounded hover:bg-white transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" style={{ color: '#888' }} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: '1px solid var(--mint, #7ecfc0)', boxShadow: '0 4px 16px rgba(126,207,192,0.12)' }}>
      <div className="flex items-start gap-3 mb-5">
        <div className="p-2.5 rounded-xl flex-shrink-0" style={{ backgroundColor: 'rgba(126,207,192,0.1)' }}>
          <Camera className="w-5 h-5" style={{ color: 'var(--mint, #7ecfc0)' }} />
        </div>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--charcoal, #2b2b2b)' }}>{hasCreativeFiles ? 'Creative received — mark your ad as live' : 'Submit proof of posting'}</h2>
          <p className="text-sm mt-1 leading-relaxed" style={{ color: '#555' }}>
            {hasCreativeFiles
              ? 'Submit proof of posting to complete this campaign and unlock your payout.'
              : 'Upload photos showing the ad placement is live to complete the campaign and unlock your payout.'}
          </p>
        </div>
      </div>

      <div
        className="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer mb-4 transition-colors"
        style={{
          borderColor: isDragging ? 'var(--mint, #7ecfc0)' : 'var(--border, #e0e0d8)',
          backgroundColor: isDragging ? 'rgba(126,207,192,0.05)' : 'transparent',
        }}
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => { e.preventDefault(); setIsDragging(false); handleStagePOPFiles(e.dataTransfer.files) }}
        onClick={() => {
          // Programmatic file picker — works on iOS Safari, Chrome, all browsers
          const input = document.createElement('input')
          input.type = 'file'
          input.multiple = true
          input.accept = 'image/*,video/mp4'
          input.onchange = (e) => {
            const target = e.target as HTMLInputElement
            handleStagePOPFiles(target.files)
          }
          input.click()
        }}
      >
        <Upload className="w-7 h-7 mx-auto mb-2" style={{ color: isDragging ? 'var(--mint, #7ecfc0)' : '#ccc' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--charcoal, #2b2b2b)' }}>Upload proof photos or video</p>
        <p className="text-xs mt-1" style={{ color: '#aaa' }}>JPG, PNG, MP4 · Drag & drop or click to browse</p>
      </div>

      {/* Staged files preview */}
      {pendingFiles.length > 0 && (
        <div className="space-y-2 mb-4">
          <p className="text-xs font-medium" style={{ color: 'var(--charcoal, #2b2b2b)' }}>{pendingFiles.length} file{pendingFiles.length > 1 ? 's' : ''} ready to submit</p>
          {pendingFiles.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2 rounded-xl"
              style={{ backgroundColor: 'var(--light-gray, #f8f8f5)', border: '1px solid var(--border, #e0e0d8)' }}
            >
              {file.type.startsWith('image/') ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--border, #e0e0d8)' }}>
                  <Upload className="w-4 h-4" style={{ color: '#888' }} />
                </div>
              )}
              <span className="text-sm flex-1 truncate" style={{ color: '#555' }}>{file.name}</span>
              <button
                type="button"
                onClick={() => removePendingFile(i)}
                className="p-1.5 rounded hover:bg-white transition-colors"
                title="Remove"
              >
                <span style={{ color: '#dc2626', fontSize: '14px', fontWeight: 600 }}>×</span>
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={handleSubmitPOP}
            disabled={uploading}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-colors"
            style={{
              backgroundColor: uploading ? '#a0a0a0' : 'var(--mint, #7ecfc0)',
              color: '#fff',
              cursor: uploading ? 'not-allowed' : 'pointer',
            }}
          >
            {uploading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading & submitting...
              </span>
            ) : (
              `Submit Proof of Posting (${pendingFiles.length} file${pendingFiles.length > 1 ? 's' : ''})`
            )}
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs mb-3" style={{ color: '#dc2626' }}>{error}</p>
      )}

      <p className="text-xs" style={{ color: '#aaa' }}>
        Add all your proof photos, then hit submit. This completes the campaign and initiates your payout.
      </p>
    </div>
  )
}

// ─── Booking Progress Bar (copied from messages/[bookingId]/page.tsx) ─────────

function BookingProgressBar({ status, endDate, buyNow, hasCreative, hasProof }: { status: string; endDate?: string; buyNow?: boolean; hasCreative?: boolean; hasProof?: boolean }) {
  const now = new Date()
  const end = endDate ? new Date(endDate) : null
  const isLive = status === 'completed' && end && now < end
  const isFullyComplete = status === 'completed' && end != null && now >= end

  // Simplified flow: pending → confirmed → completed
  const approved = ['confirmed', 'completed'].includes(status) || !!buyNow
  const creative = hasCreative || status === 'completed'
  // proof = POP files exist OR status is completed
  const proof = hasProof || status === 'completed'

  const dots = [
    { label: 'Booked', color: 'var(--mint, #7ecfc0)' },
    { label: 'Accepted', color: approved ? 'var(--mint, #7ecfc0)' : '#ddd' },
    { label: 'Creative', color: creative ? 'var(--mint, #7ecfc0)' : '#ddd' },
    { label: isLive ? 'LIVE' : 'Proof', color: isLive ? '#16a34a' : proof ? 'var(--mint, #7ecfc0)' : '#ddd' },
    { label: 'Complete', color: isFullyComplete ? 'var(--mint, #7ecfc0)' : '#ddd' },
  ]

  const lines = [
    approved ? 'var(--mint, #7ecfc0)' : 'var(--border, #e0e0d8)',
    creative ? 'var(--mint, #7ecfc0)' : 'var(--border, #e0e0d8)',
    proof ? 'var(--mint, #7ecfc0)' : 'var(--border, #e0e0d8)',
    isFullyComplete ? 'var(--mint, #7ecfc0)' : 'var(--border, #e0e0d8)',
  ]

  return (
    <div style={{ padding: '14px 16px 8px', borderRadius: '16px', backgroundColor: '#fff', border: '1px solid var(--border, #e0e0d8)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '20px 1fr 20px 1fr 20px 1fr 20px 1fr 20px', alignItems: 'center', maxWidth: 360, margin: '0 auto' }}>
        {dots.map((d, i) => {
          const els = [<div key={`d${i}`} style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: d.color, margin: '0 auto' }} />]
          if (i < lines.length) els.push(<div key={`l${i}`} style={{ height: 2, backgroundColor: lines[i] }} />)
          return els
        }).flat()}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', maxWidth: 360, margin: '4px auto 0', textAlign: 'center' }}>
        {dots.map((d, i) => (
          <div key={i} style={{ fontSize: 8, color: d.color !== '#ddd' ? '#555' : '#bbb', whiteSpace: 'nowrap' }}>{d.label}</div>
        ))}
      </div>
    </div>
  )
}

// ─── Next Step Callout ─────────────────────────────────────────────────────────

function NextStepCallout({ isHost, status, hasCreative, hasProof, endDate, deliveryMode, materialsSent, materialsReceived, requiresPrint }: { isHost: boolean; status: string; hasCreative: boolean; hasProof: boolean; endDate?: string; deliveryMode?: string | null; materialsSent?: boolean; materialsReceived?: boolean; requiresPrint?: boolean }) {
  let message = ''
  const now = new Date()
  const end = endDate ? new Date(endDate + 'T00:00:00') : null
  const campaignLive = status === 'completed' && end != null && now < end

  if (isHost) {
    if (status === 'completed' && campaignLive) {
      message = 'Your campaign is live'
    } else if (status === 'completed') {
      message = 'Campaign complete \u2014 payout processed'
    } else if (status === 'pop_pending') {
      message = 'Proof submitted \u2014 awaiting review'
    } else if ((status === 'confirmed' || status === 'active') && materialsReceived) {
      message = 'Materials received \u2014 post the ad, then upload proof of posting'
    } else if ((status === 'confirmed' || status === 'active') && materialsSent) {
      message = 'Materials on the way \u2014 confirm receipt when they arrive'
    } else if ((status === 'confirmed' || status === 'active') && (deliveryMode === 'self_deliver' || (requiresPrint && !deliveryMode))) {
      message = 'Awaiting materials from your advertiser'
    } else if ((status === 'confirmed' || status === 'active') && hasCreative) {
      message = 'Upload proof of posting to confirm placement'
    } else if (status === 'confirmed') {
      message = 'Awaiting creative files'
    }
  } else {
    if (status === 'completed' && campaignLive) {
      message = 'Your campaign is live'
    } else if (status === 'completed') {
      message = 'Campaign complete \u2014 leave a review'
    } else if (status === 'pop_pending') {
      message = 'Proof of posting submitted \u2014 under review'
    } else if ((status === 'confirmed' || status === 'active') && materialsReceived) {
      message = 'Materials received by your host \u2014 awaiting posting'
    } else if ((status === 'confirmed' || status === 'active') && materialsSent) {
      message = 'Materials sent \u2014 your host will confirm receipt'
    } else if ((status === 'confirmed' || status === 'active') && deliveryMode === 'self_deliver') {
      message = 'Ship or drop off your printed materials to get started'
    } else if ((status === 'confirmed' || status === 'active') && requiresPrint && !deliveryMode) {
      message = 'Choose how your printed materials will get to your host'
    } else if ((status === 'confirmed' || status === 'active') && hasCreative) {
      message = 'Creative submitted \u2014 awaiting proof of posting from your host'
    } else if (status === 'confirmed') {
      message = 'Upload your creative file to get started'
    }
  }

  if (!message) return null

  return (
    <div style={{
      backgroundColor: 'rgba(126,207,192,0.08)',
      borderLeft: '3px solid var(--mint, #7ecfc0)',
      padding: '12px 16px',
      borderRadius: '8px',
      fontSize: '13px',
      color: '#555',
    }}>
      {message}
    </div>
  )
}

// ─── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  pending_payment: { bg: '#fef9ec', text: '#b45309', label: 'Pending Payment' },
  pending: { bg: '#fef9ec', text: '#b45309', label: 'Pending Review' },
  confirmed: { bg: '#eff6ff', text: '#1d4ed8', label: 'Confirmed' },
  active: { bg: '#f0fdf4', text: '#16a34a', label: 'Active — Live' },
  pop_pending: { bg: '#f0f8f5', text: 'var(--mint, #7ecfc0)', label: 'Proof of Posting Submitted' },
  pop_review: { bg: '#f0f8f5', text: 'var(--mint, #7ecfc0)', label: 'Proof of Posting Review' },
  completed: { bg: '#f0fdf4', text: '#16a34a', label: 'Completed ✓' },
  cancelled: { bg: '#fef2f2', text: '#dc2626', label: 'Cancelled' },
  disputed: { bg: '#fef2f2', text: '#dc2626', label: 'Disputed' },
}

function fmt(dateStr: string): string {
  if (!dateStr) return '—'
  // Date-only strings (YYYY-MM-DD) parse as UTC midnight and render a day early
  // in US timezones. Use formatBookingDate which appends T00:00:00 for local parsing.
  if (!dateStr.includes('T')) return formatBookingDate(dateStr)
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function BookingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const bookingId = params.id as string

  const [booking, setBooking] = useState<Booking | null>(null)
  const [listing, setListing] = useState<Listing | null>(null)
  const [hasCreativeFiles, setHasCreativeFiles] = useState(false)
  const [hasProofFiles, setHasProofFiles] = useState(false)
  const [popImageUrls, setPopImageUrls] = useState<string[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        router.push(`/login?redirect=/dashboard/bookings/${bookingId}`)
        return
      }
      setCurrentUserId(userData.user.id)

      const { data: bk, error: bkErr } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single()

      if (bkErr || !bk) {
        setLoading(false)
        return
      }
      setBooking(bk)

      // Check if creative files exist
      try {
        const filesRes = await fetch(`/api/collateral/list?bookingId=${bookingId}`)
        const filesJson = await filesRes.json()
        if (filesJson.files && filesJson.files.length > 0) {
          setHasCreativeFiles(true)
        }
      } catch { /* non-fatal */ }

      // Check if POP files exist
      try {
        const popRes = await fetch(`/api/collateral/list?bookingId=pop-${bookingId}`)
        const popJson = await popRes.json()
        if (popJson.files && popJson.files.length > 0) {
          setHasProofFiles(true)
          // Extract image URLs for gallery display
          const imageUrls = (popJson.files as CollateralFile[])
            .filter((f) => f.type?.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(f.name))
            .map((f) => f.url)
            .filter(Boolean) as string[]
          setPopImageUrls(imageUrls)
        }
      } catch { /* non-fatal */ }

      if (bk.listing_id) {
        const { data: lst } = await supabase
          .from('listings')
          .select('id, title, category, city, state, dimensions, production_time, delivery_instructions, creative_formats, creative_dimensions, creative_max_file_size, creative_video_duration, creative_audio_allowed, requires_print, offers_printing, print_fee, delivery_address, specs')
          .eq('id', bk.listing_id)
          .single()
        if (lst) setListing(lst)
      }

      setLoading(false)
    }
    load()
  }, [bookingId, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: 'var(--cream, #f0f0ec)' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--mint, #7ecfc0)' }} />
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: 'var(--cream, #f0f0ec)' }}>
        <div className="text-center">
          <p className="text-sm mb-4" style={{ color: '#888' }}>Booking not found</p>
          <Link href="/dashboard/bookings" className="text-sm font-medium" style={{ color: 'var(--mint, #7ecfc0)' }}>← Back to bookings</Link>
        </div>
      </div>
    )
  }

  // Respect the dashboard mode toggle when user is both host and advertiser on this booking
  const isBothParties = currentUserId === booking.host_id && currentUserId === booking.advertiser_id
  const dashMode = typeof window !== 'undefined' ? localStorage.getItem('cf_dash_mode') : null
  const isHost = isBothParties ? dashMode === 'host' : currentUserId === booking.host_id
  const statusCfg = STATUS_CONFIG[booking.status] ?? { bg: 'var(--light-gray, #f8f8f5)', text: '#888', label: booking.status }
  const now = new Date()
  const startD = booking.start_date ? new Date(booking.start_date + 'T00:00:00') : null
  const endD = booking.end_date ? new Date(booking.end_date + 'T00:00:00') : null
  // Completed (POP submitted) = live until end date, even if before start (early POP)
  const isLive = (booking.status === 'completed' && !!endD && now <= endD) ||
    (['confirmed', 'active'].includes(booking.status) && !!startD && !!endD && now >= startD && now < endD)
  const isConfirmedFuture = ['confirmed', 'active'].includes(booking.status) &&
    !!startD && now < startD
  const isPastComplete = booking.status === 'completed' && !!endD && now >= endD
  const days = booking.start_date && booking.end_date
    ? Math.max(1, Math.round((new Date(booking.end_date).getTime() - new Date(booking.start_date).getTime()) / 86400000) + 1)
    : 0

  const showCollateralSection = ['confirmed', 'completed'].includes(booking.status)

  return (
    <div className="min-h-screen pt-16 pb-20 w-full overflow-x-hidden" style={{ backgroundColor: 'var(--cream, #f0f0ec)' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 min-w-0">
        <Link href="/dashboard/bookings" className="flex items-center gap-2 text-sm mb-8 hover:opacity-70" style={{ color: '#888' }}>
          <ArrowLeft className="w-3.5 h-3.5" />
          All Bookings
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--charcoal, #2b2b2b)' }}>
              {listing?.title ?? 'Booking'}
            </h1>
            {listing && (
              <p className="text-sm" style={{ color: '#888' }}>{listing.city}, {listing.state}</p>
            )}
            <p className="text-xs font-mono font-semibold mt-1.5 tracking-wider" style={{ color: 'var(--mint, #7ecfc0)' }}>
              {confirmationCode(bookingId)}
            </p>
          </div>
          {isLive ? (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full mt-1 flex items-center gap-1.5" style={{ backgroundColor: '#dcfce7', color: '#15803d' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'inline-block', boxShadow: '0 0 6px #16a34a', animation: 'pulse 2s infinite' }} />
              LIVE
            </span>
          ) : isConfirmedFuture ? (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full mt-1" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
              Confirmed
            </span>
          ) : isPastComplete ? (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full mt-1" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
              Completed ✓
            </span>
          ) : (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full mt-1" style={{ backgroundColor: statusCfg.bg, color: statusCfg.text }}>
              {statusCfg.label}
            </span>
          )}
        </div>

        <div className="space-y-4">
          {/* POP Photo Gallery — shown when proof-of-posting images exist */}
          {popImageUrls.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border, #e0e0d8)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', backgroundColor: '#fff' }}>
              {popImageUrls.length === 1 ? (
                <img
                  src={popImageUrls[0]}
                  alt="Proof of posting"
                  className="w-full object-cover"
                  style={{ maxHeight: '400px', borderRadius: '16px' }}
                />
              ) : (
                <div className="flex gap-3 p-4 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
                  {popImageUrls.map((url, i) => (
                    <div key={i} className="flex-shrink-0 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border, #e0e0d8)' }}>
                      <img
                        src={url}
                        alt={`Proof of posting ${i + 1}`}
                        className="object-cover rounded-xl"
                        style={{ height: '192px', width: 'auto' }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Progress bar */}
          <BookingProgressBar
            status={booking.status}
            endDate={booking.end_date ?? undefined}
            hasCreative={hasCreativeFiles || !!booking.received_at}
            hasProof={hasProofFiles}
          />

          {/* Next step callout */}
          <NextStepCallout
            isHost={isHost}
            status={booking.status}
            hasCreative={hasCreativeFiles}
            hasProof={hasProofFiles}
            endDate={booking.end_date}
            deliveryMode={booking.delivery_mode}
            materialsSent={!!(booking.shipped_at || booking.dropped_off_at)}
            materialsReceived={!!booking.received_at}
            requiresPrint={!!listing?.requires_print}
          />

          {/* Booking details card */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: '1px solid var(--border, #e0e0d8)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <h2 className="text-sm font-semibold mb-4 uppercase tracking-wide" style={{ color: '#888' }}>Booking Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                { label: 'Start date', value: fmt(booking.start_date) },
                { label: 'End date', value: fmt(booking.end_date) },
                { label: 'Duration', value: days > 0 ? `${days} day${days !== 1 ? 's' : ''}` : '—' },
                { label: isHost ? 'Booking value' : 'Total paid', value: booking.total_price ? `$${booking.total_price.toLocaleString()}` : '—' },
              ].map(item => (
                <div key={item.label} className="flex flex-col gap-0.5">
                  <span style={{ color: '#aaa' }}>{item.label}</span>
                  <span className="font-medium" style={{ color: 'var(--charcoal, #2b2b2b)' }}>{item.value}</span>
                </div>
              ))}
            </div>
            {listing?.production_time && (
              <div className="mt-4 pt-4 text-sm" style={{ borderTop: '1px solid var(--cream, #f0f0ec)' }}>
                <span style={{ color: '#aaa' }}>Production window: </span>
                <span className="font-medium" style={{ color: 'var(--charcoal, #2b2b2b)' }}>{listing.production_time}</span>
              </div>
            )}
          </div>

          {/* Delivery instructions — hidden when host is printing (nothing physical ships) */}
          {listing?.delivery_instructions && booking?.delivery_mode !== 'host_prints' && !booking?.host_prints && (
            <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: '1px solid var(--border, #e0e0d8)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-4 h-4" style={{ color: 'var(--mint, #7ecfc0)' }} />
                <h2 className="text-sm font-semibold" style={{ color: 'var(--charcoal, #2b2b2b)' }}>Delivery Instructions</h2>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: '#555' }}>
                {listing.delivery_instructions}
              </p>
            </div>
          )}

          {/* Creative specs */}
          {showCollateralSection &&
            (listing?.dimensions || listing?.creative_formats?.length || listing?.creative_dimensions || listing?.creative_max_file_size) && (
            <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: '1px solid var(--border, #e0e0d8)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <h2 className="text-sm font-semibold mb-4 uppercase tracking-wide" style={{ color: '#888' }}>Creative Requirements</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {/* Physical size — the placement's real-world dimensions */}
                {(listing?.dimensions || listing?.specs?.dimensions) && (
                  <div>
                    <p style={{ color: '#aaa' }}>Physical Size</p>
                    <p className="font-medium mt-0.5" style={{ color: 'var(--charcoal, #2b2b2b)' }}>
                      {listing?.specs?.dimensions
                        ? `${listing.specs.dimensions.width} × ${listing.specs.dimensions.height} ${listing.specs.dimensions.unit}`
                        : listing.dimensions}
                    </p>
                  </div>
                )}
                {/* Creative file spec — artboard / resolution for the uploaded file */}
                {listing?.creative_dimensions && (
                  <div>
                    <p style={{ color: '#aaa' }}>{listing?.category && listing.category.toLowerCase().includes('digital') ? 'Resolution' : 'Creative File'}</p>
                    <p className="font-medium mt-0.5" style={{ color: 'var(--charcoal, #2b2b2b)' }}>{listing.creative_dimensions}</p>
                  </div>
                )}
                {listing?.creative_formats && listing.creative_formats.length > 0 && (
                  <div>
                    <p style={{ color: '#aaa' }}>Accepted Formats</p>
                    <p className="font-medium mt-0.5" style={{ color: 'var(--charcoal, #2b2b2b)' }}>{listing.creative_formats.join(', ')}</p>
                  </div>
                )}
                {listing?.creative_max_file_size && (
                  <div>
                    <p style={{ color: '#aaa' }}>Max File Size</p>
                    <p className="font-medium mt-0.5" style={{ color: 'var(--charcoal, #2b2b2b)' }}>{listing.creative_max_file_size}</p>
                  </div>
                )}
                {listing?.creative_video_duration && (
                  <div>
                    <p style={{ color: '#aaa' }}>Video Duration</p>
                    <p className="font-medium mt-0.5" style={{ color: 'var(--charcoal, #2b2b2b)' }}>{listing.creative_video_duration}</p>
                  </div>
                )}
                {listing?.creative_audio_allowed !== undefined && (
                  <div>
                    <p style={{ color: '#aaa' }}>Audio</p>
                    <p className="font-medium mt-0.5" style={{ color: 'var(--charcoal, #2b2b2b)' }}>{listing.creative_audio_allowed ? 'Allowed' : 'Not allowed'}</p>
                  </div>
                )}
                {typeof listing?.specs?.creative_notes === 'string' && listing.specs.creative_notes && (
                  <div className="col-span-2">
                    <p style={{ color: '#aaa' }}>Notes</p>
                    <p className="font-medium mt-0.5 whitespace-pre-wrap" style={{ color: 'var(--charcoal, #2b2b2b)' }}>{listing.specs.creative_notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Collateral upload / view */}
          {showCollateralSection && (
            <CollateralSection
              bookingId={bookingId}
              isHost={isHost}
              bookingStatus={booking.status}
              hostId={booking.host_id}
              advertiserId={booking.advertiser_id}
              listingTitle={listing?.title}
              listing={listing}
              booking={booking}
              onBookingUpdate={(partial) => setBooking(prev => prev ? { ...prev, ...partial } : prev)}
            />
          )}

          {/* Host POP submission */}
          {showCollateralSection && (
            <POPSection
              bookingId={bookingId}
              bookingStatus={booking.status}
              isHost={isHost}
              advertiserId={booking.advertiser_id}
              hostId={booking.host_id}
              listingTitle={listing?.title}
              hasCreativeFiles={hasCreativeFiles}
              startDate={booking.start_date}
              endDate={booking.end_date}
            />
          )}

          {/* ── Host Earnings Card ─────────────────────────────────── */}
          {isHost && booking.total_price > 0 && (
            <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: '1px solid var(--border, #e0e0d8)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-4 h-4" style={{ color: '#16a34a' }} />
                <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#888' }}>Earnings</h2>
              </div>
              {(() => {
                // Single source of truth — stored itemized amounts (lib/fees.ts)
                const fin = getBookingFinancials(booking)
                const payout = fin.hostPayout
                const transferSent = !!booking.stripe_transfer_id
                // The Stripe transfer fires on POP approval, but funds land in the host's
                // bank on Stripe's payout schedule (typically 2-5 business days). Until we
                // ingest payout.paid webhooks, approximate "landed" as 7 days post-transfer.
                const sentAtMs = booking.payout_at ? new Date(booking.payout_at).getTime() : null
                const isPaid = transferSent && sentAtMs != null && Date.now() - sentAtMs > 7 * 24 * 60 * 60 * 1000
                const isSent = transferSent && !isPaid
                const isProcessing = !transferSent && !!booking.payout_at
                // Pre-POP the money isn't "pending" — it's EARNED-ON-PROOF. Label accordingly.
                const awaitingProof = !transferSent && !isProcessing && !['pop_pending', 'pop_review', 'completed'].includes(booking.status)
                const payoutStatus = isPaid ? 'Paid' : isSent ? 'Payout sent' : isProcessing ? 'Processing' : awaitingProof ? 'Awaiting proof of posting' : 'Proof under review'
                const statusColor = isPaid ? '#16a34a' : isSent ? '#1d4ed8' : isProcessing ? '#d97706' : '#b45309'
                return (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between" style={{ color: '#555' }}>
                      <span>Listing price: ${(fin.pricePerDay ?? 0).toFixed(2)}/day × {fin.days ?? days} day{(fin.days ?? days) !== 1 ? 's' : ''}</span>
                      <span>${fin.subtotal.toFixed(2)}</span>
                    </div>
                    {fin.printFee > 0 && (
                      <div className="flex justify-between" style={{ color: '#555' }}>
                        <span>Print fee</span>
                        <span>${fin.printFee.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between" style={{ color: '#dc2626' }}>
                      <span>City Feed fee (7%)</span>
                      <span>-${fin.sellerFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-2" style={{ borderTop: '1px solid var(--border, #e0e0d8)', color: 'var(--charcoal, #2b2b2b)' }}>
                      <span>Your payout</span>
                      <span>${payout.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span style={{ color: '#888' }}>Status</span>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: isPaid ? '#dcfce7' : isSent ? '#eff6ff' : '#fef9ec', color: statusColor }}>
                        {payoutStatus}
                      </span>
                    </div>
                    {isSent && (
                      <p className="text-xs text-right" style={{ color: '#888' }}>
                        Arrives in your bank within 2–5 business days
                      </p>
                    )}
                  </div>
                )
              })()}
            </div>
          )}

          {/* Quick actions */}
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/dashboard/bookings/${bookingId}/receipt`}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl hover:opacity-80 transition-colors"
              style={{ backgroundColor: '#fff', border: '1px solid var(--border, #e0e0d8)', color: '#555' }}
            >
              View Receipt
            </Link>
            <Link
              href={`/dashboard/messages/${bookingId}`}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl hover:opacity-80 transition-colors"
              style={{ backgroundColor: '#fff', border: '1px solid var(--border, #e0e0d8)', color: '#555' }}
            >
              Messages
            </Link>
            {booking.status === 'completed' && !isHost && (
              <Link
                href={`/dashboard/messages/${bookingId}`}
                className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl hover:opacity-80 transition-colors"
                style={{ backgroundColor: '#fff', border: '1px solid var(--border, #e0e0d8)', color: '#888' }}
              >
                Report an issue
              </Link>
            )}
            {booking.status === 'completed' && !isHost && (
              <Link
                href={`/dashboard/bookings/${bookingId}/review`}
                className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl hover:opacity-80 transition-colors"
                style={{ backgroundColor: '#fff', border: '1px solid var(--border, #e0e0d8)', color: '#555' }}
              >
                Leave Review
              </Link>
            )}
            {booking.status === 'completed' && !isHost && booking.listing_id && (
              <Link
                href={`/marketplace/${booking.listing_id}`}
                className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-colors"
                style={{ backgroundColor: 'var(--gold, #debb73)', color: 'var(--charcoal, #2b2b2b)', boxShadow: '0 2px 8px rgba(222,187,115,0.3)' }}
              >
                🔁 Book Again
              </Link>
            )}
          </div>

          {/* Cancel — deliberately quiet, bottom of page (Airbnb-style).
              Advertisers: only before the campaign window starts (after that refund is $0).
              Hosts: any pending/confirmed booking (triggers 100% advertiser refund). */}
          {['pending', 'confirmed'].includes(booking.status) &&
            (isHost || new Date() < new Date(booking.start_date + 'T00:00:00')) && (
            <div className="pt-2 pb-1 text-center">
              <Link
                href={`/dashboard/bookings/${bookingId}/cancel`}
                className="text-xs hover:underline"
                style={{ color: '#aaa' }}
              >
                Need to cancel this booking?
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
