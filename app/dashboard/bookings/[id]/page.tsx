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

/** Derive a human-readable confirmation code from a booking UUID */
function confirmationCode(bookingId: string): string {
  return 'CF-' + bookingId.replace(/-/g, '').substring(0, 6).toUpperCase()
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
    return <Image className="w-5 h-5" style={{ color: '#7ecfc0' }} />
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

    // Notify host
    if (!isHost && hostId && advertiserId) {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('messages').insert({
            booking_id: bookingId,
            sender_id: user.id,
            recipient_id: hostId,
            content: `📎 Creative files have been uploaded for "${listingTitle ?? 'your listing'}"\n\nPlease review and begin setup when ready.\n\nView booking: https://www.cityfeed.io/dashboard/bookings/${bookingId}`,
          })
          await supabase.from('notifications').insert({
            user_id: hostId,
            type: 'collateral_uploaded',
            title: `Creative files uploaded`,
            body: `For "${listingTitle ?? 'booking'}"`,
            href: `/dashboard/bookings/${bookingId}`,
          })
          const { data: hostProfile } = await supabase
            .from('profiles').select('email, full_name').eq('id', hostId).single()
          const { data: advProfile } = await supabase
            .from('profiles').select('full_name').eq('id', advertiserId).single()
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
  }, [folderPath]) // eslint-disable-line react-hooks/exhaustive-deps

  async function deleteFile(path: string) {
    const { error } = await supabase.storage.from('booking-collateral').remove([path])
    if (!error) await loadFiles()
  }

  const hasFiles = files.length > 0
  const canUpload = !isHost && ['confirmed'].includes(bookingStatus)
  // For requires_print listings: only show upload when delivery_mode is host_prints (or not yet set for non-print listings)
  const isSelfDeliver = listing?.requires_print && booking?.delivery_mode === 'self_deliver'
  const needsChoice = listing?.requires_print && !booking?.delivery_mode
  const showUploadArea = canUpload && !isSelfDeliver && !needsChoice
  // Show success state if upload was just completed OR if files already exist (returning to page)
  const showSuccessState = showUploadArea && (uploadComplete || hasFiles)

  return (
    <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold" style={{ color: '#2b2b2b' }}>
          {isHost ? 'Advertiser Creative Files' : 'Upload Your Creative Files'}
        </h2>
        {hasFiles ? (
          <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(22,163,74,0.1)', color: '#16a34a' }}>
            <CheckCircle className="w-3 h-3" />
            Creative Files Uploaded ✅
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(180,83,9,0.08)', color: '#b45309' }}>
            <Clock className="w-3 h-3" />
            Awaiting Creative Files
          </span>
        )}
      </div>

      {/* ── PRINT CHOICE — for requires_print listings, advertiser picks delivery mode ── */}
      {!isHost && listing?.requires_print && !booking?.delivery_mode && canUpload && !showSuccessState && (
        <div className="mb-5 rounded-xl p-5" style={{ backgroundColor: '#f8f8f5', border: '1px solid #e0e0d8' }}>
          <p className="text-sm font-semibold mb-3" style={{ color: '#2b2b2b' }}>How would you like to deliver your creative?</p>
          <div className="space-y-2">
            <button
              type="button"
              onClick={async () => {
                const supabase = createClient()
                await supabase.from('bookings').update({ delivery_mode: 'self_deliver' }).eq('id', bookingId)
                onBookingUpdate?.({ delivery_mode: 'self_deliver' })
              }}
              className="w-full text-left px-4 py-3 rounded-xl text-sm transition-colors hover:bg-white flex items-center gap-3"
              style={{ border: '1px solid #e0e0d8' }}
            >
              <Truck className="w-4 h-4 flex-shrink-0" style={{ color: '#7ecfc0' }} />
              <div>
                <span className="font-medium" style={{ color: '#2b2b2b' }}>I&apos;ll provide my own printed materials</span>
                <p className="text-xs mt-0.5" style={{ color: '#888' }}>Ship or deliver prints to the host&apos;s address</p>
              </div>
            </button>
            {listing.offers_printing && (
              <button
                type="button"
                onClick={async () => {
                  const supabase = createClient()
                  await supabase.from('bookings').update({ delivery_mode: 'host_prints' }).eq('id', bookingId)
                  onBookingUpdate?.({ delivery_mode: 'host_prints' })
                }}
                className="w-full text-left px-4 py-3 rounded-xl text-sm transition-colors hover:bg-white flex items-center gap-3"
                style={{ border: '1px solid #e0e0d8' }}
              >
                <Upload className="w-4 h-4 flex-shrink-0" style={{ color: '#7ecfc0' }} />
                <div>
                  <span className="font-medium" style={{ color: '#2b2b2b' }}>Have the host print for me{listing.print_fee ? ` (+$${Number(listing.print_fee).toFixed(2)})` : ''}</span>
                  <p className="text-xs mt-0.5" style={{ color: '#888' }}>Upload your digital files and the host will print them</p>
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Advertiser intro text — only before upload */}
      {!isHost && !showSuccessState && (!listing?.requires_print || booking?.delivery_mode === 'host_prints') && (
        <p className="text-sm mb-5 leading-relaxed" style={{ color: '#555' }}>
          Please deliver your creative files within the production window listed on this placement.
          The host will begin setup once received.
        </p>
      )}

      {/* Host note — no files yet */}
      {isHost && !hasFiles && (
        <p className="text-sm mb-5" style={{ color: '#888' }}>
          The advertiser hasn&apos;t uploaded creative files yet. You&apos;ll be notified when files arrive.
        </p>
      )}

      {/* ── SELF-DELIVER VIEW — show host address + shipping actions ── */}
      {canUpload && isSelfDeliver && listing?.delivery_address && (
        <ShippingSection
          bookingId={bookingId}
          isHost={isHost}
          booking={booking!}
          deliveryAddress={listing.delivery_address}
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
              borderColor: isDragging ? '#7ecfc0' : '#e0e0d8',
              backgroundColor: isDragging ? 'rgba(126,207,192,0.05)' : 'transparent',
            }}
            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => { e.preventDefault(); setIsDragging(false); handleStagedFiles(e.dataTransfer.files) }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: isDragging ? '#7ecfc0' : '#ccc' }} />
            <p className="text-sm font-medium mb-1" style={{ color: '#2b2b2b' }}>
              Drag & drop or <span style={{ color: '#7ecfc0' }}>click to browse</span>
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
                  style={{ backgroundColor: '#f8f8f5', border: '1px solid #e0e0d8' }}
                >
                  <FileIcon type={file.type} name={file.name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#2b2b2b' }}>{file.name}</p>
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
              style={{ backgroundColor: '#debb73', color: '#2b2b2b' }}
            >
              {uploading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
              ) : (
                <><Upload className="w-4 h-4" /> Upload {pendingFiles.length} file{pendingFiles.length !== 1 ? 's' : ''}</>
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
              <p className="text-sm font-semibold" style={{ color: '#16a34a' }}>Creative Files Uploaded ✅</p>
              <p className="text-xs mt-0.5" style={{ color: '#555' }}>Host will get this live and send you proof of posting</p>
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
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#7ecfc0' }} />
        </div>
      ) : hasFiles ? (
        <div className="space-y-2">
          {files.map(file => (
            <div
              key={file.path}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ backgroundColor: '#f8f8f5', border: '1px solid #e0e0d8' }}
            >
              <FileIcon type={file.type} name={file.name} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: '#2b2b2b' }}>{file.name}</p>
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
                  borderColor: isDraggingAdditional ? '#7ecfc0' : '#e0e0d8',
                  backgroundColor: isDraggingAdditional ? 'rgba(126,207,192,0.05)' : 'transparent',
                }}
                onDragOver={e => { e.preventDefault(); setIsDraggingAdditional(true) }}
                onDragLeave={() => setIsDraggingAdditional(false)}
                onDrop={e => { e.preventDefault(); setIsDraggingAdditional(false); handleAdditionalFiles(e.dataTransfer.files) }}
                onClick={() => additionalInputRef.current?.click()}
              >
                {uploading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#7ecfc0' }} />
                    <span className="text-xs" style={{ color: '#888' }}>Uploading...</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mx-auto mb-1.5" style={{ color: '#ccc' }} />
                    <p className="text-xs" style={{ color: '#888' }}>
                      Drop files or <span style={{ color: '#7ecfc0' }}>click to browse</span>
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
      await supabase.from('notifications').insert({
        user_id: hostId,
        type: 'materials_shipped',
        title: 'Materials shipped',
        body: `Printed materials for "${listingTitle ?? 'booking'}" have been shipped${trackingNumber ? ` (tracking: ${trackingNumber})` : ''}.`,
        href: `/dashboard/bookings/${bookingId}`,
      })
      await supabase.from('messages').insert({
        booking_id: bookingId,
        sender_id: advertiserId ?? hostId,
        recipient_id: hostId,
        content: `📦 Printed materials have been shipped!${trackingNumber ? `\n\nTracking: ${trackingNumber}` : ''}\n\nView booking: https://www.cityfeed.io/dashboard/bookings/${bookingId}`,
      })
    }
    setSaving(false)
  }

  async function markReceived() {
    setSaving(true)
    const now = new Date().toISOString()
    await supabase.from('bookings').update({ received_at: now }).eq('id', bookingId)
    onBookingUpdate?.({ received_at: now })

    // Notify advertiser
    if (advertiserId) {
      await supabase.from('notifications').insert({
        user_id: advertiserId,
        type: 'materials_received',
        title: 'Materials received',
        body: `Your host has confirmed receipt of materials for "${listingTitle ?? 'booking'}".`,
        href: `/dashboard/bookings/${bookingId}`,
      })
      await supabase.from('messages').insert({
        booking_id: bookingId,
        sender_id: hostId ?? advertiserId,
        recipient_id: advertiserId,
        content: `✅ Your printed materials have been received! The host will proceed with installation and submit proof of posting once your ad is live.\n\nView booking: https://www.cityfeed.io/dashboard/bookings/${bookingId}`,
      })
    }
    setSaving(false)
  }

  // Advertiser view
  if (!isHost) {
    return (
      <div className="rounded-xl p-5 mb-4" style={{ backgroundColor: '#f8f8f5', border: '1px solid #e0e0d8' }}>
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-4 h-4" style={{ color: '#7ecfc0' }} />
          <p className="text-sm font-semibold" style={{ color: '#2b2b2b' }}>Delivery Address</p>
        </div>
        <p className="text-sm mb-4 leading-relaxed" style={{ color: '#555' }}>{deliveryAddress}</p>

        {booking.shipped_at ? (
          <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.2)' }}>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" style={{ color: '#16a34a' }} />
              <p className="text-sm font-medium" style={{ color: '#16a34a' }}>
                Marked as shipped on {new Date(booking.shipped_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
            {booking.tracking_number && (
              <p className="text-xs mt-1 ml-6" style={{ color: '#888' }}>Tracking: {booking.tracking_number}</p>
            )}
            {booking.received_at ? (
              <div className="flex items-center gap-2 mt-2 ml-6">
                <CheckCircle className="w-3.5 h-3.5" style={{ color: '#16a34a' }} />
                <p className="text-xs" style={{ color: '#16a34a' }}>
                  Host confirmed receipt on {new Date(booking.received_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            ) : (
              <p className="text-xs mt-2 ml-6" style={{ color: '#888' }}>Awaiting host confirmation of receipt</p>
            )}
          </div>
        ) : (
          <>
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1" style={{ color: '#888' }}>Tracking number (optional)</label>
              <input
                type="text"
                value={trackingNumber}
                onChange={e => setTrackingNumber(e.target.value)}
                placeholder="e.g. 1Z999AA10123456784"
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', color: '#2b2b2b' }}
              />
            </div>
            <button
              type="button"
              onClick={markShipped}
              disabled={saving}
              className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
              style={{ backgroundColor: '#debb73', color: '#2b2b2b' }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
              Mark as Shipped
            </button>
          </>
        )}
      </div>
    )
  }

  // Host view
  return (
    <div className="rounded-xl p-5 mb-4" style={{ backgroundColor: '#f8f8f5', border: '1px solid #e0e0d8' }}>
      <div className="flex items-center gap-2 mb-3">
        <Truck className="w-4 h-4" style={{ color: '#7ecfc0' }} />
        <p className="text-sm font-semibold" style={{ color: '#2b2b2b' }}>Material Delivery</p>
      </div>
      {!booking.shipped_at ? (
        <p className="text-sm" style={{ color: '#888' }}>The advertiser is preparing their printed materials for delivery.</p>
      ) : !booking.received_at ? (
        <>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4" style={{ color: '#7ecfc0' }} />
            <p className="text-sm" style={{ color: '#555' }}>
              Materials shipped on {new Date(booking.shipped_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
            style={{ backgroundColor: '#7ecfc0', color: '#fff' }}
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
}

function POPSection({ bookingId, bookingStatus, isHost, advertiserId, hostId, listingTitle }: POPSectionProps) {
  const [files, setFiles] = useState<CollateralFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
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

  async function handlePOPUpload(incoming: FileList | null) {
    if (!incoming || incoming.length === 0 || uploading) return
    setUploading(true)
    setError('')
    // Reset input so same file can be re-selected if needed
    if (fileInputRef.current) fileInputRef.current.value = ''

    const uploadedUrls: string[] = []
    const uploadedNames: string[] = []
    for (const file of Array.from(incoming)) {
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
    await supabase.from('bookings').update({ status: 'completed' }).eq('id', bookingId)

    // Trigger payout immediately (escrow model — transfer from platform to host)
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

          // Message to advertiser — host informs them proof is uploaded
          await supabase.from('messages').insert({
            booking_id: bookingId,
            sender_id: hostId,
            recipient_id: advertiserId,
            content: `📸 Your host has confirmed your ad placement is live! Here's the proof. If anything looks wrong, message your host directly.\n\nView booking: https://www.cityfeed.io/dashboard/bookings/${bookingId}${photoText}`,
            image_url: photoUrls[0] ?? null,
          })
          // Note: self-message (host → host) removed — host receives the pop_submitted notification instead

          // Notify advertiser
          await supabase.from('notifications').insert({
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
            }),
          })
        }
      } catch { /* email failure non-fatal */ }
    }
  }

  // Only show for relevant statuses (simplified flow: confirmed → completed)
  const showStatuses = ['confirmed', 'completed']
  if (!showStatuses.includes(bookingStatus)) return null

  // Advertiser view: show POP photos if they exist
  if (!isHost) {
    if (files.length === 0) return null
    return (
      <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl" style={{ backgroundColor: 'rgba(22,163,74,0.08)' }}>
            <Camera className="w-5 h-5" style={{ color: '#16a34a' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#2b2b2b' }}>Proof of Posting</p>
            <p className="text-xs mt-0.5" style={{ color: '#888' }}>Your host uploaded these photos as proof your ad is live.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          {files.filter(f => f.type?.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(f.name)).map(f => (
            <div key={f.path} className="rounded-xl overflow-hidden aspect-video" style={{ border: '1px solid #e0e0d8' }}>
              <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {files.map(f => (
            <div key={f.path} className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ backgroundColor: '#f8f8f5', border: '1px solid #e0e0d8' }}>
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
      <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ backgroundColor: 'rgba(22,163,74,0.08)' }}>
            <CheckCircle className="w-5 h-5" style={{ color: '#16a34a' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#2b2b2b' }}>Proof of Posting Submitted ✅</p>
            <p className="text-xs mt-0.5" style={{ color: '#888' }}>Payout initiated — expected within 2 business days</p>
          </div>
        </div>
        {files.length > 0 && (
          <div className="space-y-2 mt-4">
            {files.map(f => (
              <div key={f.path} className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ backgroundColor: '#f8f8f5', border: '1px solid #e0e0d8' }}>
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
    <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: '1px solid #7ecfc0', boxShadow: '0 4px 16px rgba(126,207,192,0.12)' }}>
      <div className="flex items-start gap-3 mb-5">
        <div className="p-2.5 rounded-xl flex-shrink-0" style={{ backgroundColor: 'rgba(126,207,192,0.1)' }}>
          <Camera className="w-5 h-5" style={{ color: '#7ecfc0' }} />
        </div>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: '#2b2b2b' }}>Creative received — mark your ad as live</h2>
          <p className="text-sm mt-1 leading-relaxed" style={{ color: '#555' }}>
            Submit proof of posting to complete this campaign and unlock your payout.
          </p>
        </div>
      </div>

      <div
        className="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer mb-4 transition-colors relative"
        style={{
          borderColor: isDragging ? '#7ecfc0' : '#e0e0d8',
          backgroundColor: isDragging ? 'rgba(126,207,192,0.05)' : 'transparent',
        }}
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => { e.preventDefault(); setIsDragging(false); handlePOPUpload(e.dataTransfer.files) }}
        onClick={() => {
          console.log('[POP] Drop zone clicked, fileInputRef:', fileInputRef.current)
          if (fileInputRef.current) fileInputRef.current.click()
        }}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#7ecfc0' }} />
            <p className="text-sm" style={{ color: '#888' }}>Uploading proof...</p>
          </div>
        ) : (
          <>
            <Upload className="w-7 h-7 mx-auto mb-2" style={{ color: '#ccc' }} />
            <p className="text-sm font-medium" style={{ color: '#2b2b2b' }}>Upload proof photos or video</p>
            <p className="text-xs mt-1" style={{ color: '#aaa' }}>JPG, PNG, MP4 · Drag & drop or click to browse</p>
          </>
        )}
        <label style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, cursor: 'pointer', opacity: 0 }}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/mp4"
            style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
            onChange={e => handlePOPUpload(e.target.files)}
          />
        </label>
      </div>

      {error && (
        <p className="text-xs mb-3" style={{ color: '#dc2626' }}>{error}</p>
      )}

      <p className="text-xs" style={{ color: '#aaa' }}>
        Uploading proof completes the campaign and initiates your payout. Expected within 2 business days.
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
    { label: 'Booked', color: '#7ecfc0' },
    { label: 'Approved', color: approved ? '#7ecfc0' : '#ddd' },
    { label: 'Creative', color: creative ? '#7ecfc0' : '#ddd' },
    { label: isLive ? 'LIVE' : 'Proof', color: isLive ? '#16a34a' : proof ? '#7ecfc0' : '#ddd' },
    { label: 'Complete', color: isFullyComplete ? '#7ecfc0' : '#ddd' },
  ]

  const lines = [
    approved ? '#7ecfc0' : '#e0e0d8',
    creative ? '#7ecfc0' : '#e0e0d8',
    proof ? '#7ecfc0' : '#e0e0d8',
    isFullyComplete ? '#7ecfc0' : '#e0e0d8',
  ]

  return (
    <div style={{ padding: '14px 16px 8px', borderRadius: '16px', backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
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

// ─── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  pending_payment: { bg: '#fef9ec', text: '#b45309', label: 'Pending Payment' },
  pending: { bg: '#fef9ec', text: '#b45309', label: 'Pending Review' },
  confirmed: { bg: '#eff6ff', text: '#1d4ed8', label: 'Confirmed' },
  active: { bg: '#f0fdf4', text: '#16a34a', label: 'Active — Live' },
  pop_pending: { bg: '#f0f8f5', text: '#7ecfc0', label: 'Proof of Posting Submitted' },
  pop_review: { bg: '#f0f8f5', text: '#7ecfc0', label: 'Proof of Posting Review' },
  completed: { bg: '#f0fdf4', text: '#16a34a', label: 'Completed ✓' },
  cancelled: { bg: '#fef2f2', text: '#dc2626', label: 'Cancelled' },
  disputed: { bg: '#fef2f2', text: '#dc2626', label: 'Disputed' },
}

function fmt(dateStr: string): string {
  if (!dateStr) return '—'
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
        }
      } catch { /* non-fatal */ }

      if (bk.listing_id) {
        const { data: lst } = await supabase
          .from('listings')
          .select('id, title, category, city, state, dimensions, production_time, delivery_instructions, creative_formats, creative_dimensions, creative_max_file_size, creative_video_duration, creative_audio_allowed, requires_print, offers_printing, print_fee, delivery_address')
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
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: '#f0f0ec' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#7ecfc0' }} />
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: '#f0f0ec' }}>
        <div className="text-center">
          <p className="text-sm mb-4" style={{ color: '#888' }}>Booking not found</p>
          <Link href="/dashboard/bookings" className="text-sm font-medium" style={{ color: '#7ecfc0' }}>← Back to bookings</Link>
        </div>
      </div>
    )
  }

  const isHost = currentUserId === booking.host_id
  const statusCfg = STATUS_CONFIG[booking.status] ?? { bg: '#f8f8f5', text: '#888', label: booking.status }
  const now = new Date()
  const startD = booking.start_date ? new Date(booking.start_date + 'T00:00:00') : null
  const endD = booking.end_date ? new Date(booking.end_date + 'T00:00:00') : null
  const isLive = ['confirmed', 'active', 'completed'].includes(booking.status) &&
    !!startD && !!endD && now >= startD && now < endD
  const isConfirmedFuture = ['confirmed', 'completed'].includes(booking.status) &&
    !!startD && now < startD
  const isPastComplete = booking.status === 'completed' && !!endD && now >= endD
  const days = booking.start_date && booking.end_date
    ? Math.ceil((new Date(booking.end_date).getTime() - new Date(booking.start_date).getTime()) / 86400000)
    : 0

  const showCollateralSection = ['confirmed', 'completed'].includes(booking.status)

  return (
    <div className="min-h-screen pt-16 pb-20" style={{ backgroundColor: '#f0f0ec' }}>
      <div className="max-w-2xl mx-auto px-6 py-8">
        <Link href="/dashboard/bookings" className="flex items-center gap-2 text-sm mb-8 hover:opacity-70" style={{ color: '#888' }}>
          <ArrowLeft className="w-3.5 h-3.5" />
          All Bookings
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: '#2b2b2b' }}>
              {listing?.title ?? 'Booking'}
            </h1>
            {listing && (
              <p className="text-sm" style={{ color: '#888' }}>{listing.city}, {listing.state}</p>
            )}
            <p className="text-xs font-mono font-semibold mt-1.5 tracking-wider" style={{ color: '#7ecfc0' }}>
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
          {/* Progress bar */}
          <BookingProgressBar
            status={booking.status}
            endDate={booking.end_date ?? undefined}
            hasCreative={hasCreativeFiles}
            hasProof={hasProofFiles}
          />

          {/* Booking details card */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <h2 className="text-sm font-semibold mb-4 uppercase tracking-wide" style={{ color: '#888' }}>Booking Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                { label: 'Start date', value: fmt(booking.start_date) },
                { label: 'End date', value: fmt(booking.end_date) },
                { label: 'Duration', value: days > 0 ? `${days} day${days !== 1 ? 's' : ''}` : '—' },
                { label: 'Total paid', value: booking.total_price ? `$${booking.total_price.toLocaleString()}` : '—' },
              ].map(item => (
                <div key={item.label} className="flex flex-col gap-0.5">
                  <span style={{ color: '#aaa' }}>{item.label}</span>
                  <span className="font-medium" style={{ color: '#2b2b2b' }}>{item.value}</span>
                </div>
              ))}
            </div>
            {listing?.production_time && (
              <div className="mt-4 pt-4 text-sm" style={{ borderTop: '1px solid #f0f0ec' }}>
                <span style={{ color: '#aaa' }}>Production window: </span>
                <span className="font-medium" style={{ color: '#2b2b2b' }}>{listing.production_time}</span>
              </div>
            )}
          </div>

          {/* Delivery instructions */}
          {listing?.delivery_instructions && (
            <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-4 h-4" style={{ color: '#7ecfc0' }} />
                <h2 className="text-sm font-semibold" style={{ color: '#2b2b2b' }}>Delivery Instructions</h2>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: '#555' }}>
                {listing.delivery_instructions}
              </p>
            </div>
          )}

          {/* Creative specs */}
          {showCollateralSection &&
            (listing?.dimensions || listing?.creative_formats?.length || listing?.creative_dimensions || listing?.creative_max_file_size) && (
            <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <h2 className="text-sm font-semibold mb-4 uppercase tracking-wide" style={{ color: '#888' }}>Creative Requirements</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {listing?.dimensions && (
                  <div>
                    <p style={{ color: '#aaa' }}>Listing Dimensions</p>
                    <p className="font-medium mt-0.5" style={{ color: '#2b2b2b' }}>{listing.dimensions}</p>
                  </div>
                )}
                {listing?.creative_formats && listing.creative_formats.length > 0 && (
                  <div>
                    <p style={{ color: '#aaa' }}>Accepted Formats</p>
                    <p className="font-medium mt-0.5" style={{ color: '#2b2b2b' }}>{listing.creative_formats.join(', ')}</p>
                  </div>
                )}
                {listing?.creative_dimensions && (
                  <div>
                    <p style={{ color: '#aaa' }}>Dimensions</p>
                    <p className="font-medium mt-0.5" style={{ color: '#2b2b2b' }}>{listing.creative_dimensions}</p>
                  </div>
                )}
                {listing?.creative_max_file_size && (
                  <div>
                    <p style={{ color: '#aaa' }}>Max File Size</p>
                    <p className="font-medium mt-0.5" style={{ color: '#2b2b2b' }}>{listing.creative_max_file_size}</p>
                  </div>
                )}
                {listing?.creative_video_duration && (
                  <div>
                    <p style={{ color: '#aaa' }}>Video Duration</p>
                    <p className="font-medium mt-0.5" style={{ color: '#2b2b2b' }}>{listing.creative_video_duration}</p>
                  </div>
                )}
                {listing?.creative_audio_allowed !== undefined && (
                  <div>
                    <p style={{ color: '#aaa' }}>Audio</p>
                    <p className="font-medium mt-0.5" style={{ color: '#2b2b2b' }}>{listing.creative_audio_allowed ? 'Allowed' : 'Not allowed'}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Host Earnings Card ─────────────────────────────────── */}
          {isHost && booking.total_price > 0 && (
            <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-4 h-4" style={{ color: '#16a34a' }} />
                <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#888' }}>Earnings</h2>
              </div>
              {(() => {
                const pricePerDay = days > 0 ? booking.total_price / 1.07 / days : 0
                const subtotal = pricePerDay * days
                const platformFee = Math.round(subtotal * 0.07 * 100) / 100
                const payout = booking.payout_amount ?? Math.round((subtotal - platformFee) * 100) / 100
                const isPaid = !!booking.stripe_transfer_id
                const isProcessing = !isPaid && !!booking.payout_at
                const payoutStatus = isPaid ? 'Paid' : isProcessing ? 'Processing' : 'Pending'
                const statusColor = isPaid ? '#16a34a' : isProcessing ? '#d97706' : '#b45309'
                return (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between" style={{ color: '#555' }}>
                      <span>Listing price: ${pricePerDay.toFixed(2)}/day × {days} day{days !== 1 ? 's' : ''}</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between" style={{ color: '#dc2626' }}>
                      <span>City Feed fee (7%)</span>
                      <span>-${platformFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-2" style={{ borderTop: '1px solid #e0e0d8', color: '#2b2b2b' }}>
                      <span>Your payout</span>
                      <span>${payout.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span style={{ color: '#888' }}>Status</span>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: isPaid ? '#dcfce7' : isProcessing ? '#fef9ec' : '#fef9ec', color: statusColor }}>
                        {payoutStatus}
                      </span>
                    </div>
                  </div>
                )
              })()}
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
            />
          )}

          {/* Quick actions */}
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/dashboard/bookings/${bookingId}/receipt`}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl hover:opacity-80 transition-colors"
              style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', color: '#555' }}
            >
              View Receipt
            </Link>
            <Link
              href={`/dashboard/messages/${bookingId}`}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl hover:opacity-80 transition-colors"
              style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', color: '#555' }}
            >
              Messages
            </Link>
            {booking.status === 'completed' && !isHost && (
              <Link
                href={`/dashboard/messages/${bookingId}`}
                className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl hover:opacity-80 transition-colors"
                style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', color: '#888' }}
              >
                Report an issue
              </Link>
            )}
            {booking.status === 'completed' && !isHost && (
              <Link
                href={`/dashboard/bookings/${bookingId}/review`}
                className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl hover:opacity-80 transition-colors"
                style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', color: '#555' }}
              >
                Leave Review
              </Link>
            )}
            {booking.status === 'completed' && !isHost && booking.listing_id && (
              <Link
                href={`/marketplace/${booking.listing_id}/book`}
                className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-colors"
                style={{ backgroundColor: '#debb73', color: '#2b2b2b', boxShadow: '0 2px 8px rgba(222,187,115,0.3)' }}
              >
                🔁 Book Again
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
