'use client'

/**
 * Booking Detail Page — Phase 5b
 *
 * Features:
 * - Full booking details
 * - Collateral upload flow (post-booking)
 * - Delivery instructions (for physical placements)
 * - Host can view and download uploaded collateral
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
  CheckCircle, Clock, Download, X, AlertCircle, Package
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Booking {
  id: string
  status: string
  start_date: string
  end_date: string
  total_price: number
  payout_amount?: number
  created_at: string
  listing_id: string
  advertiser_id: string
  host_id?: string
}

interface Listing {
  id: string
  title: string
  category: string
  city: string
  state: string
  production_time?: string
  delivery_instructions?: string
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

// ─── Collateral Upload Section ─────────────────────────────────────────────────

interface CollateralSectionProps {
  bookingId: string
  isHost: boolean
  bookingStatus: string
  hostId?: string
  advertiserId?: string
  listingTitle?: string
}

function CollateralSection({ bookingId, isHost, bookingStatus, hostId, advertiserId, listingTitle }: CollateralSectionProps) {
  const [files, setFiles] = useState<CollateralFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()
  const folderPath = `bookings/${bookingId}`

  async function loadFiles() {
    setLoading(true)
    const { data, error } = await supabase.storage
      .from('booking-collateral')
      .list(folderPath, { sortBy: { column: 'created_at', order: 'desc' } })

    if (error) {
      // Bucket may not exist yet — silently degrade
      console.warn('[Collateral] Storage list error:', error.message)
      setFiles([])
      setLoading(false)
      return
    }

    const withUrls: CollateralFile[] = await Promise.all(
      (data ?? []).map(async (item) => {
        const { data: urlData } = await supabase.storage
          .from('booking-collateral')
          .createSignedUrl(`${folderPath}/${item.name}`, 3600)
        return {
          name: item.name,
          path: `${folderPath}/${item.name}`,
          size: item.metadata?.size ?? 0,
          type: item.metadata?.mimetype ?? '',
          created_at: item.created_at,
          url: urlData?.signedUrl,
        }
      })
    )
    setFiles(withUrls)
    setLoading(false)
  }

  useEffect(() => { loadFiles() }, [bookingId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFiles = useCallback(async (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return
    setUploading(true)
    setUploadError('')

    for (const file of Array.from(incoming)) {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
      const isAllowed = ACCEPTED_MIME.includes(file.type) ||
        ['pdf', 'jpg', 'jpeg', 'png', 'mp4', 'ai', 'psd', 'zip'].includes(ext)

      if (!isAllowed) {
        setUploadError(`"${file.name}" is not an accepted format. Allowed: ${ACCEPTED_FORMATS.join(', ')}`)
        continue
      }

      const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { error } = await supabase.storage
        .from('booking-collateral')
        .upload(`${folderPath}/${safeName}`, file, { cacheControl: '3600', upsert: false })

      if (error) {
        setUploadError(error.message)
        console.error('[Collateral] Upload error:', error)
      }
    }

    setUploading(false)
    await loadFiles()

    // After successful upload (advertiser only), send auto-message to host + notification
    if (!isHost && hostId && advertiserId) {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('messages').insert({
            booking_id: bookingId,
            sender_id: user.id,
            recipient_id: hostId,
            content: `📎 Creative files have been uploaded for "${listingTitle ?? 'your listing'}"\n\nPlease review and begin setup when ready.`,
          })
          // Notify host
          await supabase.from('notifications').insert({
            user_id: hostId,
            type: 'collateral_uploaded',
            title: `Creative files uploaded`,
            body: `For "${listingTitle ?? 'booking'}"`,
            href: `/dashboard/bookings/${bookingId}`,
          })
          // Email host
          const { data: hostProfile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', hostId)
            .single()
          const { data: advProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', advertiserId)
            .single()
          if (hostProfile?.email) {
            const { sendEmail } = await import('@/lib/email')
            await sendEmail({
              type: 'collateral_uploaded',
              hostEmail: hostProfile.email,
              listingTitle: listingTitle ?? 'your listing',
              advertiserName: advProfile?.full_name ?? 'The advertiser',
              bookingId,
            })
          }
        }
      } catch { /* non-fatal */ }
    }
  }, [folderPath, isHost, hostId, advertiserId, bookingId, listingTitle]) // eslint-disable-line react-hooks/exhaustive-deps

  async function deleteFile(path: string) {
    const { error } = await supabase.storage.from('booking-collateral').remove([path])
    if (!error) await loadFiles()
  }

  const hasFiles = files.length > 0
  const canUpload = !isHost && ['confirmed', 'active', 'pop_pending', 'pop_review'].includes(bookingStatus)

  return (
    <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold" style={{ color: '#2b2b2b' }}>
          {isHost ? 'Advertiser Collateral' : 'Upload Your Collateral'}
        </h2>
        {hasFiles ? (
          <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(22,163,74,0.1)', color: '#16a34a' }}>
            <CheckCircle className="w-3 h-3" />
            Collateral Uploaded ✅
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(180,83,9,0.08)', color: '#b45309' }}>
            <Clock className="w-3 h-3" />
            Awaiting Collateral
          </span>
        )}
      </div>

      {/* Advertiser note */}
      {!isHost && (
        <p className="text-sm mb-5 leading-relaxed" style={{ color: '#555' }}>
          Please deliver your collateral within the production window listed on this placement.
          The host will begin setup once received.
        </p>
      )}

      {/* Host note */}
      {isHost && !hasFiles && (
        <p className="text-sm mb-5" style={{ color: '#888' }}>
          The advertiser hasn&apos;t uploaded collateral yet. You&apos;ll be notified when files arrive.
        </p>
      )}

      {/* Upload area — advertisers only */}
      {canUpload && (
        <div
          className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors mb-5"
          style={{
            borderColor: isDragging ? '#7ecfc0' : '#e0e0d8',
            backgroundColor: isDragging ? 'rgba(126,207,192,0.05)' : 'transparent',
          }}
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files) }}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#7ecfc0' }} />
              <p className="text-sm" style={{ color: '#888' }}>Uploading...</p>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: isDragging ? '#7ecfc0' : '#ccc' }} />
              <p className="text-sm font-medium mb-1" style={{ color: '#2b2b2b' }}>
                Drag & drop or <span style={{ color: '#7ecfc0' }}>click to browse</span>
              </p>
              <p className="text-xs" style={{ color: '#aaa' }}>
                Accepted formats: {ACCEPTED_FORMATS.join(', ')} · Max 100MB per file
              </p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.mp4,.ai,.psd,.zip"
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
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
                {file.url && (
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
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
    </div>
  )
}

// ─── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  pending_payment: { bg: '#fef9ec', text: '#b45309', label: 'Pending Payment' },
  pending: { bg: '#fef9ec', text: '#b45309', label: 'Pending Review' },
  confirmed: { bg: '#eff6ff', text: '#1d4ed8', label: 'Confirmed' },
  active: { bg: '#f0fdf4', text: '#16a34a', label: 'Active — Live' },
  pop_pending: { bg: '#f0f8f5', text: '#7ecfc0', label: 'POP Submitted' },
  pop_review: { bg: '#f0f8f5', text: '#7ecfc0', label: 'POP Review' },
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

      if (bk.listing_id) {
        const { data: lst } = await supabase
          .from('listings')
          .select('id, title, category, city, state, production_time, delivery_instructions')
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
  const days = booking.start_date && booking.end_date
    ? Math.ceil((new Date(booking.end_date).getTime() - new Date(booking.start_date).getTime()) / 86400000)
    : 0

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
          </div>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full mt-1" style={{ backgroundColor: statusCfg.bg, color: statusCfg.text }}>
            {statusCfg.label}
          </span>
        </div>

        <div className="space-y-4">
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

          {/* Delivery instructions (physical placements) */}
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

          {/* Collateral upload — only for confirmed/active/etc. bookings */}
          {['confirmed', 'active', 'pop_pending', 'pop_review', 'completed'].includes(booking.status) && (
            <CollateralSection
              bookingId={bookingId}
              isHost={isHost}
              bookingStatus={booking.status}
              hostId={booking.host_id}
              advertiserId={booking.advertiser_id}
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
                href={`/dashboard/bookings/${bookingId}/review`}
                className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl hover:opacity-80 transition-colors"
                style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', color: '#555' }}
              >
                Leave Review
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
