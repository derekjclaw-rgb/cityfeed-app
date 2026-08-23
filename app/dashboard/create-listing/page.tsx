'use client'

/**
 * Create Listing Page — Phase 5c: Video Toggle + Smart Category Hints
 *
 * IMPORTANT — Run this migration before deploying:
 * -- alter table public.listings add column if not exists daily_traffic integer default 0;
 * -- alter table public.listings add column if not exists delivery_instructions text;
 * -- alter table public.listings add column if not exists creative_formats text[];
 * -- alter table public.listings add column if not exists creative_dimensions text;
 * -- alter table public.listings add column if not exists creative_max_file_size text;
 * -- alter table public.listings add column if not exists creative_video_duration text;
 * -- alter table public.listings add column if not exists creative_audio_allowed boolean default false;
 * -- alter table public.listings add column if not exists creative_loop_count integer;
 * -- alter table public.listings add column if not exists creative_host_prints boolean default false;
 * -- alter table public.listings add column if not exists creative_print_cost numeric;
 * -- alter table public.listings add column if not exists requires_print boolean default false;
 * -- alter table public.listings add column if not exists offers_printing boolean default false;
 * -- alter table public.listings add column if not exists print_fee numeric default null;
 * -- alter table public.listings add column if not exists delivery_address text default null;
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, Loader2, CheckCircle, X, AlertCircle, ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CATEGORY_OPTIONS as CATEGORIES } from '@/lib/design'

const STATIC_CATEGORIES = [
  'outdoor_static',
  'static_billboards',
  'billboard',
  'storefront',
  'window',
  'vehicle_wrap',
  'indoor_static',
]

const PRODUCTION_TIMES = [
  'Less than a day',
  '1 day',
  '2 days',
  '3 days',
  '5 days',
  '7 days',
  '10 days',
  '14 days',
  '21 days',
  '30 days',
]

// Category is "digital" if its value contains digital/display/transit
const isDigitalCat = (cat: string) =>
  cat.toLowerCase().includes('digital') ||
  cat.toLowerCase().includes('display') ||
  cat.toLowerCase().includes('transit')

const isStaticCat = (cat: string) => STATIC_CATEGORIES.includes(cat)

interface UploadedPhoto {
  file: File
  preview: string
  url?: string
  uploading?: boolean
  error?: string
}

const CREATIVE_FORMATS = ['PDF', 'JPG', 'PNG', 'MP4']

interface FormData {
  title: string
  description: string
  category: string
  address: string
  city: string
  state: string
  zip: string
  dimensions: string
  daily_impressions: string
  illuminated: boolean
  production_time: string
  price_per_day: string
  min_days: string
  max_days: string
  buy_now_enabled: boolean
  content_restrictions: string
  // Physical dimensions (structured)
  dim_width: string
  dim_height: string
  dim_unit: string
  // Delivery
  delivery_instructions: string
  // Creative specs
  creative_formats: string[]
  creative_dimensions: string
  creative_width: string
  creative_height: string
  creative_unit: string
  creative_max_file_size: string
  // Video (any category when accepts_video)
  accepts_video: boolean
  creative_video_duration: string
  creative_audio_allowed: boolean
  creative_loop_count: string
  // Printing (static categories)
  creative_host_prints: boolean
  creative_print_cost: string
  // Static ads / print flow
  requires_print: boolean
  offers_printing: boolean
  print_fee: string
  delivery_address: string
}

const INITIAL_FORM: FormData = {
  title: '',
  description: '',
  category: 'digital_billboards',
  address: '',
  city: '',
  state: '',
  zip: '',
  dimensions: '',
  dim_width: '',
  dim_height: '',
  dim_unit: 'ft',
  daily_impressions: '',
  illuminated: false,
  production_time: '3 days',
  price_per_day: '',
  min_days: '7',
  max_days: '90',
  buy_now_enabled: true,
  content_restrictions: '',
  delivery_instructions: '',
  creative_formats: [],
  creative_dimensions: '',
  creative_width: '',
  creative_height: '',
  creative_unit: 'px',
  creative_max_file_size: '25MB',
  accepts_video: false,
  creative_video_duration: '15s',
  creative_audio_allowed: false,
  creative_loop_count: '',
  creative_host_prints: false,
  creative_print_cost: '',
  requires_print: false,
  offers_printing: false,
  print_fee: '',
  delivery_address: '',
}

function FormField({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: '#555' }}>
        {label}{required && <span className="ml-1" style={{ color: '#dc2626' }}>*</span>}
      </label>
      {children}
      {hint && <p className="text-xs mt-1" style={{ color: '#aaa' }}>{hint}</p>}
    </div>
  )
}

function Toggle({
  value,
  onChange,
  label,
  hint,
}: {
  value: boolean
  onChange: (v: boolean) => void
  label: string
  hint?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(!value)}
        className="relative flex-shrink-0 rounded-full transition-colors"
        style={{
          width: '48px',
          height: '28px',
          backgroundColor: value ? 'var(--mint, #7ecfc0)' : '#d1d5db',
          border: 'none',
          outline: 'none',
        }}
      >
        <span
          className="absolute rounded-full bg-white shadow-sm transition-transform"
          style={{
            width: '20px',
            height: '20px',
            top: '4px',
            left: '4px',
            transform: value ? 'translateX(20px)' : 'translateX(0)',
          }}
        />
      </button>
      <div>
        <div className="text-sm font-medium" style={{ color: '#555' }}>
          {label}
        </div>
        {hint && (
          <div className="text-xs" style={{ color: '#aaa' }}>
            {hint}
          </div>
        )}
      </div>
    </div>
  )
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--mint, #7ecfc0)' }}>
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="flex-shrink-0" style={{ color: '#888' }}>{label}</span>
      <span className="text-right" style={{ color: 'var(--charcoal, #2b2b2b)' }}>{value}</span>
    </div>
  )
}

export default function CreateListingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [hasStripeConnected, setHasStripeConnected] = useState<boolean | null>(null)
  const [photos, setPhotos] = useState<UploadedPhoto[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<FormData>(INITIAL_FORM)
  const [blockedDates, setBlockedDates] = useState<string[]>([])
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [showReviewModal, setShowReviewModal] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.push('/login?redirect=/dashboard/create-listing')
      } else {
        setUserId(data.user.id)
        // Check if the host has connected their Stripe account
        const { data: profile } = await supabase
          .from('profiles')
          .select('stripe_account_id')
          .eq('id', data.user.id)
          .single()
        setHasStripeConnected(!!profile?.stripe_account_id)
        setAuthLoading(false)
      }
    })
  }, [router])

  function set(field: keyof FormData, value: string | boolean | string[]) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleFormat(fmt: string) {
    setForm(prev => {
      const has = prev.creative_formats.includes(fmt)
      return {
        ...prev,
        creative_formats: has
          ? prev.creative_formats.filter(f => f !== fmt)
          : [...prev.creative_formats, fmt],
      }
    })
  }

  const addFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return
      const newPhotos: UploadedPhoto[] = Array.from(files)
        .filter(f => f.type.startsWith('image/'))
        .slice(0, 10 - photos.length)
        .map(file => ({
          file,
          preview: URL.createObjectURL(file),
        }))
      setPhotos(prev => [...prev, ...newPhotos])
    },
    [photos.length]
  )

  function removePhoto(index: number) {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  async function uploadPhotos(uid: string): Promise<string[]> {
    if (photos.length === 0) return []
    const urls: string[] = []

    for (let i = 0; i < photos.length; i++) {
      setPhotos(prev =>
        prev.map((p, idx) => (idx === i ? { ...p, uploading: true } : p))
      )
      const photo = photos[i]
      const ext = photo.file.name.split('.').pop() ?? 'jpg'
      const path = `${uid}/${Date.now()}-${i}.${ext}`

      const fd = new FormData()
      fd.append('file', photo.file)
      fd.append('path', path)
      const res = await fetch('/api/listings/upload-image', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok) {
        setPhotos(prev =>
          prev.map((p, idx) =>
            idx === i ? { ...p, uploading: false, error: data.error || 'Upload failed' } : p
          )
        )
        continue
      }

      urls.push(data.url)
      setPhotos(prev =>
        prev.map((p, idx) =>
          idx === i ? { ...p, uploading: false, url: data.url } : p
        )
      )
    }

    return urls
  }

  function handleReview(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    if (!form.zip.trim()) {
      setError('ZIP code is required.')
      return
    }
    setError('')
    setShowReviewModal(true)
  }

  async function handlePublish() {
    if (!userId) return
    setShowReviewModal(false)
    setLoading(true)
    setError('')

    const imageUrls = await uploadPhotos(userId)

    // Warn if some photos failed to upload
    if (imageUrls.length < photos.length) {
      const failed = photos.length - imageUrls.length
      setError(`${failed} photo${failed > 1 ? 's' : ''} failed to upload. The listing will be created with ${imageUrls.length} photo${imageUrls.length !== 1 ? 's' : ''}.`)
    }

    // Geocode
    let lat: number | null = null
    let lng: number | null = null
    const fullAddress = `${form.address}, ${form.city}, ${form.state} ${form.zip}`.trim()
    try {
      const geoRes = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&limit=1`
      )
      const geoData = await geoRes.json()
      if (geoData.features && geoData.features.length > 0) {
        const [lngVal, latVal] = geoData.features[0].center
        lat = latVal
        lng = lngVal
      }
    } catch (geoErr) {
      console.warn('Geocoding failed:', geoErr)
    }

    const supabase = createClient()
    const { data: insertedListing, error: insertError } = await supabase.from('listings').insert({
      host_id: userId,
      title: form.title,
      description: form.description,
      category: form.category,
      address: form.address,
      city: form.city,
      state: form.state,
      zip: form.zip,
      lat,
      lng,
      dimensions: (form.dim_width && form.dim_height)
        ? `${form.dim_width} × ${form.dim_height} ${form.dim_unit}`
        : form.dimensions || null,
      specs: (form.dim_width && form.dim_height)
        ? { dimensions: { width: parseFloat(form.dim_width), height: parseFloat(form.dim_height), unit: form.dim_unit } }
        : null,
      daily_impressions: parseInt(form.daily_impressions) || 0,
      // NOTE: DB migration needed — alter table public.listings add column if not exists illuminated boolean default null;
      illuminated: form.illuminated,
      production_time: form.production_time,
      price_per_day: parseFloat(form.price_per_day) || 0,
      min_days: parseInt(form.min_days) || 1,
      max_days: parseInt(form.max_days) || 365,
      buy_now_enabled: form.buy_now_enabled,
      content_restrictions: form.content_restrictions,
      images: imageUrls,
      status: 'active',
      // Delivery instructions (static categories only)
      delivery_instructions: isStaticCat(form.category)
        ? form.delivery_instructions || null
        : null,
      // Creative specs
      creative_formats: form.creative_formats.length > 0 ? form.creative_formats : null,
      creative_dimensions: (form.creative_width && form.creative_height)
        ? `${form.creative_width}x${form.creative_height} ${form.creative_unit}`
        : null,
      creative_max_file_size: form.creative_max_file_size || null,
      // Video specs (any category when accepts_video)
      ...(form.accepts_video
        ? {
            creative_video_duration: form.creative_video_duration || null,
            creative_audio_allowed: form.creative_audio_allowed,
            creative_loop_count: form.creative_loop_count
              ? parseInt(form.creative_loop_count)
              : null,
          }
        : {}),
      // Availability — blocked individual dates
      availability: blockedDates.length > 0 ? { blocked: blockedDates } : null,
      // Printing (static categories only)
      ...(isStaticCat(form.category)
        ? {
            creative_host_prints: form.creative_host_prints,
            creative_print_cost:
              form.creative_host_prints && form.creative_print_cost
                ? parseFloat(form.creative_print_cost)
                : null,
          }
        : {}),
      // Static ads / print flow
      requires_print: form.requires_print,
      offers_printing: form.requires_print ? form.offers_printing : false,
      print_fee: form.requires_print && form.offers_printing && form.print_fee
        ? parseFloat(form.print_fee)
        : null,
      delivery_address: form.requires_print && form.delivery_address
        ? form.delivery_address
        : null,
    }).select('id').single()

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
    } else {
      // Fire listing-published email to host (non-blocking)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.email) {
          fetch('/api/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'listing_published',
              hostEmail: user.email,
              listingTitle: form.title,
              listingId: insertedListing?.id ?? '',
              listingImage: imageUrls[0],
              pricePerDay: parseFloat(form.price_per_day) || undefined,
            }),
          }).catch(() => {})
        }
      } catch { /* non-fatal */ }
      setSuccess(true)
    }
  }

  const inputClass =
    'w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors'
  const inputStyle = {
    backgroundColor: 'var(--light-gray, #f8f8f5)',
    border: '1px solid var(--border, #e0e0d8)',
    color: 'var(--charcoal, #2b2b2b)',
  }
  const cardStyle = {
    backgroundColor: '#fff',
    border: '1px solid var(--border, #e0e0d8)',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
  }

  // Derived flags
  const showDigitalNote =
    isDigitalCat(form.category) || form.accepts_video
  const showStaticFields = isStaticCat(form.category)

  if (authLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center pt-20"
        style={{ backgroundColor: 'var(--cream, #f0f0ec)' }}
      >
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--mint, #7ecfc0)' }} />
      </div>
    )
  }

  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center pt-20 px-6"
        style={{ backgroundColor: 'var(--cream, #f0f0ec)' }}
      >
        <div className="text-center max-w-md">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{
              backgroundColor: 'rgba(126,207,192,0.12)',
              border: '1px solid rgba(222,187,115,0.3)',
            }}
          >
            <CheckCircle className="w-8 h-8" style={{ color: 'var(--mint, #7ecfc0)' }} />
          </div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--charcoal, #2b2b2b)' }}>
            Listing is now live!
          </h2>
          <p className="text-sm mb-8" style={{ color: '#888' }}>
            Your listing is now live on the marketplace. Advertisers can find and book it right away.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/dashboard/listings"
              className="font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 text-sm"
              style={{ backgroundColor: 'var(--gold, #debb73)', color: 'var(--charcoal, #2b2b2b)' }}
            >
              View my listings
            </Link>
            <button
              onClick={() => {
                setSuccess(false)
                setPhotos([])
                setForm(INITIAL_FORM)
              }}
              className="font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 text-sm"
              style={{
                backgroundColor: '#fff',
                border: '1px solid var(--border, #e0e0d8)',
                color: '#555',
              }}
            >
              Add another
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-16 pb-20" style={{ backgroundColor: 'var(--cream, #f0f0ec)' }}>
      <div className="max-w-2xl mx-auto px-6 py-8">
        <Link
          href="/dashboard/listings"
          className="flex items-center gap-2 text-sm mb-8 hover:opacity-70"
          style={{ color: '#888' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          My Listings
        </Link>

        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--charcoal, #2b2b2b)' }}>
          List your space
        </h1>
        <p className="text-sm mb-8" style={{ color: '#888' }}>
          Fill out the details below. You'll review everything before publishing.
        </p>

        {error && (
          <div
            className="rounded-xl px-4 py-3 text-sm flex items-center gap-2 mb-6"
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
            }}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleReview} className="space-y-8">
          {/* Basic Info */}
          <div className="rounded-2xl p-6 space-y-5" style={cardStyle}>
            <h2 className="font-semibold" style={{ color: 'var(--charcoal, #2b2b2b)' }}>
              Basic information
            </h2>
            <FormField label="Listing title" required>
              <input
                type="text"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="e.g. Downtown Storefront Banner — Main St"
                className={inputClass}
                style={inputStyle}
                required
              />
            </FormField>
            <FormField label="Description" required>
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Describe your space, visibility, audience..."
                rows={4}
                className={`${inputClass} resize-none`}
                style={inputStyle}
                required
              />
            </FormField>
            <FormField label="Category" required>
              <select
                value={form.category}
                onChange={e => set('category', e.target.value)}
                className={`${inputClass} cursor-pointer`}
                style={inputStyle}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          {/* Location */}
          <div className="rounded-2xl p-6 space-y-5" style={cardStyle}>
            <h2 className="font-semibold" style={{ color: 'var(--charcoal, #2b2b2b)' }}>
              Location
            </h2>
            <FormField label="Street address" required>
              <input
                type="text"
                value={form.address}
                onChange={e => set('address', e.target.value)}
                placeholder="123 Main Street"
                className={inputClass}
                style={inputStyle}
                required
              />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="City" required>
                <input
                  type="text"
                  value={form.city}
                  onChange={e => set('city', e.target.value)}
                  placeholder="Las Vegas"
                  className={inputClass}
                  style={inputStyle}
                  required
                />
              </FormField>
              <FormField label="State" required>
                <input
                  type="text"
                  value={form.state}
                  onChange={e => set('state', e.target.value)}
                  placeholder="NV"
                  maxLength={2}
                  className={inputClass}
                  style={inputStyle}
                  required
                />
              </FormField>
            </div>
            <FormField label="ZIP code" required>
              <input
                type="text"
                value={form.zip}
                onChange={e => set('zip', e.target.value)}
                placeholder="89109"
                maxLength={10}
                className={inputClass}
                style={inputStyle}
                required
              />
            </FormField>
          </div>

          {/* Photos */}
          <div className="rounded-2xl p-6" style={cardStyle}>
            <h2 className="font-semibold mb-4" style={{ color: 'var(--charcoal, #2b2b2b)' }}>
              Photos
            </h2>
            <div
              className="border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer"
              style={{
                borderColor: isDragging ? 'var(--mint, #7ecfc0)' : 'var(--border, #e0e0d8)',
                backgroundColor: isDragging ? 'rgba(126,207,192,0.05)' : 'transparent',
              }}
              onDragOver={e => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => {
                e.preventDefault()
                setIsDragging(false)
                addFiles(e.dataTransfer.files)
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload
                className="w-8 h-8 mx-auto mb-3"
                style={{ color: isDragging ? 'var(--mint, #7ecfc0)' : '#ccc' }}
              />
              <p className="text-sm mb-1" style={{ color: '#888' }}>
                Drag photos here or click to upload
              </p>
              <p className="text-xs" style={{ color: '#aaa' }}>
                Up to 10 photos · JPG, PNG, WEBP · Max 10MB each
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => addFiles(e.target.files)}
              />
            </div>

            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-4">
                {photos.map((photo, i) => (
                  <div
                    key={i}
                    className="relative rounded-xl overflow-hidden aspect-square"
                    style={{ border: '1px solid var(--border, #e0e0d8)' }}
                  >
                    <img src={photo.preview} alt="" className="w-full h-full object-cover" />
                    {photo.uploading && (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
                      >
                        <Loader2 className="w-5 h-5 animate-spin text-white" />
                      </div>
                    )}
                    {photo.error && (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(220,38,38,0.6)' }}
                      >
                        <AlertCircle className="w-5 h-5 text-white" />
                      </div>
                    )}
                    {!photo.uploading && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          removePhoto(i)
                        }}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    )}
                  </div>
                ))}
                {photos.length < 10 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-xl flex flex-col items-center justify-center border-2 border-dashed transition-colors"
                    style={{ borderColor: 'var(--border, #e0e0d8)', color: '#aaa' }}
                  >
                    <ImageIcon className="w-5 h-5 mb-1" />
                    <span className="text-xs">Add more</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Ad Specs */}
          <div className="rounded-2xl p-6 space-y-5" style={cardStyle}>
            <h2 className="font-semibold" style={{ color: 'var(--charcoal, #2b2b2b)' }}>
              Ad specs &amp; performance
            </h2>
            <FormField label="Physical dimensions" hint={isDigitalCat(form.category) ? 'Physical size of the screen — or resolution if you prefer px' : 'Width and height of the ad placement'}>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={form.dim_width}
                  onChange={e => set('dim_width', e.target.value)}
                  placeholder="W"
                  min="0"
                  className={inputClass}
                  style={inputStyle}
                />
                <span className="text-xs flex-shrink-0" style={{ color: '#888' }}>×</span>
                <input
                  type="number"
                  value={form.dim_height}
                  onChange={e => set('dim_height', e.target.value)}
                  placeholder="H"
                  min="0"
                  className={inputClass}
                  style={inputStyle}
                />
                <select
                  value={form.dim_unit}
                  onChange={e => set('dim_unit', e.target.value)}
                  className={`${inputClass} cursor-pointer`}
                  style={{ ...inputStyle, maxWidth: 72, paddingLeft: 8, paddingRight: 8 }}
                >
                  {(isDigitalCat(form.category) ? ['px', 'ft', 'in', 'm', 'cm'] : ['ft', 'in', 'm', 'cm', 'px']).map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Estimated daily impressions" hint="Approximate daily views">
                <input
                  type="number"
                  value={form.daily_impressions}
                  onChange={e => set('daily_impressions', e.target.value)}
                  placeholder="15000"
                  min="0"
                  className={inputClass}
                  style={inputStyle}
                />
              </FormField>
              <div className="flex flex-col justify-center pt-1">
                <Toggle
                  value={form.illuminated}
                  onChange={v => set('illuminated', v)}
                  label="Illuminated?"
                  hint={form.illuminated ? 'Yes — lit at night' : 'No — not lit at night'}
                />
              </div>
            </div>
            <FormField
              label="Production time"
              hint="How long does it take to install/print?"
            >
              <select
                value={form.production_time}
                onChange={e => set('production_time', e.target.value)}
                className={`${inputClass} cursor-pointer`}
                style={inputStyle}
              >
                {PRODUCTION_TIMES.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          {/* Pricing */}
          <div className="rounded-2xl p-6 space-y-5" style={cardStyle}>
            <h2 className="font-semibold" style={{ color: 'var(--charcoal, #2b2b2b)' }}>
              Pricing &amp; availability
            </h2>
            <FormField label="Price per day (USD)" required>
              <div className="relative">
                <span
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-sm"
                  style={{ color: '#888' }}
                >
                  $
                </span>
                <input
                  type="number"
                  value={form.price_per_day}
                  onChange={e => set('price_per_day', e.target.value)}
                  placeholder="250"
                  min="1"
                  step="0.01"
                  className={`${inputClass} pl-8`}
                  style={inputStyle}
                  required
                />
              </div>
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Min. days">
                <input
                  type="number"
                  value={form.min_days}
                  onChange={e => set('min_days', e.target.value)}
                  min="1"
                  max="10"
                  className={inputClass}
                  style={inputStyle}
                />
              </FormField>
              <FormField label="Max. days">
                <input
                  type="number"
                  value={form.max_days}
                  onChange={e => set('max_days', e.target.value)}
                  min="1"
                  className={inputClass}
                  style={inputStyle}
                />
              </FormField>
            </div>
            <Toggle
              value={form.buy_now_enabled}
              onChange={v => set('buy_now_enabled', v)}
              label="Instant booking"
              hint="Bookings are confirmed automatically. Turn off to review and approve each request first."
            />
          </div>

          {/* Content restrictions */}
          <div className="rounded-2xl p-6" style={cardStyle}>
            <h2 className="font-semibold mb-4" style={{ color: 'var(--charcoal, #2b2b2b)' }}>
              Content restrictions
            </h2>
            <FormField
              label="What content will you NOT accept?"
              hint="e.g. No adult content, tobacco, competing brands"
            >
              <textarea
                value={form.content_restrictions}
                onChange={e => set('content_restrictions', e.target.value)}
                placeholder="List any content types or brands you will not display..."
                rows={3}
                className={`${inputClass} resize-none`}
                style={inputStyle}
              />
            </FormField>
          </div>

          {/* Printed Materials — static categories only */}
          {isStaticCat(form.category) && (
          <div className="rounded-2xl p-6 space-y-5" style={cardStyle}>
            <h2 className="font-semibold" style={{ color: 'var(--charcoal, #2b2b2b)' }}>
              Printed materials
            </h2>
            <Toggle
              value={form.requires_print}
              onChange={v => {
                set('requires_print', v)
                if (!v) { set('offers_printing', false); set('print_fee', ''); set('delivery_address', '') }
              }}
              label="This placement requires printed materials"
              hint="The advertiser will need to provide physical prints for this placement"
            />
            {form.requires_print && (
              <div className="space-y-4">
                <Toggle
                  value={form.offers_printing}
                  onChange={v => {
                    set('offers_printing', v)
                    if (!v) set('print_fee', '')
                  }}
                  label="Do you offer printing?"
                  hint={form.offers_printing ? 'Advertisers can pay you to print their materials' : 'Advertisers will print and ship their own materials'}
                />
                {form.offers_printing && (
                  <FormField label="Print fee ($)" hint="One-time fee charged to the advertiser for printing">
                    <div className="relative">
                      <span
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-sm"
                        style={{ color: '#888' }}
                      >
                        $
                      </span>
                      <input
                        type="number"
                        value={form.print_fee}
                        onChange={e => set('print_fee', e.target.value)}
                        placeholder="150"
                        min="0"
                        step="0.01"
                        className={`${inputClass} pl-8`}
                        style={inputStyle}
                      />
                    </div>
                  </FormField>
                )}
                <FormField
                  label="Delivery instructions"
                  hint="Where and how should the advertiser ship or deliver printed materials?"
                  required
                >
                  <textarea
                    value={form.delivery_address}
                    onChange={e => set('delivery_address', e.target.value)}
                    placeholder="e.g. 123 Main St, Suite 200, Las Vegas NV 89109. Attn: Marketing. Ring buzzer at loading dock."
                    rows={3}
                    className={`${inputClass} resize-none`}
                    style={inputStyle}
                    required
                  />
                </FormField>
                <p className="text-xs" style={{ color: '#aaa' }}>
                  This address is only shown to advertisers after they book — never on the public listing.
                </p>
              </div>
            )}
          </div>
          )}

          {/* Creative Specifications */}
          <div className="rounded-2xl p-6 space-y-5" style={cardStyle}>
            <div>
              <h2 className="font-semibold" style={{ color: 'var(--charcoal, #2b2b2b)' }}>
                Creative specifications
              </h2>
              <p className="text-xs mt-1" style={{ color: '#aaa' }}>
                Help advertisers prepare the right files for your placement.
              </p>
            </div>

            {/* Accepted file formats */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#555' }}>
                Accepted file formats
              </label>
              <p className="text-xs mb-2" style={{ color: '#aaa' }}>
                Select all that apply
              </p>
              <div className="flex flex-wrap gap-2">
                {CREATIVE_FORMATS.map(fmt => {
                  const checked = form.creative_formats.includes(fmt)
                  return (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => toggleFormat(fmt)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      style={{
                        backgroundColor: checked ? 'var(--mint, #7ecfc0)' : 'var(--light-gray, #f8f8f5)',
                        color: checked ? '#fff' : '#555',
                        border: checked ? '1px solid var(--mint, #7ecfc0)' : '1px solid var(--border, #e0e0d8)',
                        flexShrink: 0,
                      }}
                    >
                      {fmt}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Dimensions + max file size */}
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Required dimensions" hint="Width × height + units">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={form.creative_width}
                    onChange={e => set('creative_width', e.target.value)}
                    placeholder="W"
                    min="0"
                    className={inputClass}
                    style={inputStyle}
                  />
                  <span className="text-xs flex-shrink-0" style={{ color: '#888' }}>×</span>
                  <input
                    type="number"
                    value={form.creative_height}
                    onChange={e => set('creative_height', e.target.value)}
                    placeholder="H"
                    min="0"
                    className={inputClass}
                    style={inputStyle}
                  />
                  <select
                    value={form.creative_unit}
                    onChange={e => set('creative_unit', e.target.value)}
                    className={`${inputClass} cursor-pointer`}
                    style={{ ...inputStyle, maxWidth: 72, paddingLeft: 8, paddingRight: 8 }}
                  >
                    {['px', 'in', 'ft', 'cm', 'mm'].map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </FormField>
              <FormField label="Max file size">
                <select
                  value={form.creative_max_file_size}
                  onChange={e => set('creative_max_file_size', e.target.value)}
                  className={`${inputClass} cursor-pointer`}
                  style={inputStyle}
                >
                  {['5MB', '10MB', '25MB', '50MB', '100MB'].map(s => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            {/* Video toggle — hidden for static categories */}
            {!isStaticCat(form.category) && (
            <div className="pt-3" style={{ borderTop: '1px solid var(--cream, #f0f0ec)' }}>
              <Toggle
                value={form.accepts_video}
                onChange={v => set('accepts_video', v)}
                label="Does this placement accept video?"
                hint={form.accepts_video ? 'Video options shown below' : 'Turn on to configure video ad options'}
              />

              {form.accepts_video && (
                <div className="mt-5 space-y-4 pl-0">
                  <FormField label="How long can each video ad be?">
                    <select
                      value={form.creative_video_duration}
                      onChange={e => set('creative_video_duration', e.target.value)}
                      className={`${inputClass} cursor-pointer`}
                      style={inputStyle}
                    >
                      {['10s', '15s', '30s', '60s', '90s', '120s'].map(d => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField
                    label="How many times will the ad play per day?"
                    hint="Daily plays for each advertiser's spot — leave 0 for continuous rotation"
                  >
                    <input
                      type="number"
                      value={form.creative_loop_count}
                      onChange={e => set('creative_loop_count', e.target.value)}
                      placeholder="e.g. 240"
                      min="0"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </FormField>
                  <Toggle
                    value={form.creative_audio_allowed}
                    onChange={v => set('creative_audio_allowed', v)}
                    label="Can the advertiser's video include sound?"
                    hint={form.creative_audio_allowed ? 'Audio is allowed' : 'Audio is muted'}
                  />
                </div>
              )}
            </div>
            )}

            {/* Digital upload note */}
            {showDigitalNote && (
              <div
                className="rounded-xl px-4 py-3 text-sm"
                style={{
                  backgroundColor: 'rgba(126,207,192,0.08)',
                  border: '1px solid rgba(126,207,192,0.3)',
                  color: '#555',
                }}
              >
                💡 Advertisers will upload digital files through the platform after booking.
              </div>
            )}

            {/* Printing handled by Printed Materials section below */}
          </div>

          {/* Delivery Instructions — static/physical categories only */}
          {/* Delivery instructions handled by Printed Materials section below */}

          {/* Restricted Dates Calendar */}
          <div className="rounded-2xl p-6 space-y-5" style={cardStyle}>
            <div>
              <h2 className="font-semibold" style={{ color: 'var(--charcoal, #2b2b2b)' }}>
                Restricted Dates
              </h2>
              <p className="text-xs mt-1" style={{ color: '#aaa' }}>
                Click dates when your space is unavailable. Advertisers won&apos;t be able to book these dates.
              </p>
            </div>

            {(() => {
              const { year, month } = calendarMonth
              const firstDay = new Date(year, month, 1).getDay()
              const daysInMonth = new Date(year, month + 1, 0).getDate()
              const monthLabel = new Date(year, month).toLocaleString('en-US', { month: 'long', year: 'numeric' })
              const today = new Date()
              today.setHours(0, 0, 0, 0)

              return (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <button
                      type="button"
                      onClick={() => setCalendarMonth(prev => {
                        const d = new Date(prev.year, prev.month - 1)
                        return { year: d.getFullYear(), month: d.getMonth() }
                      })}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-sm font-medium"
                      style={{ color: '#555' }}
                    >
                      ‹
                    </button>
                    <span className="text-sm font-semibold" style={{ color: 'var(--charcoal, #2b2b2b)' }}>{monthLabel}</span>
                    <button
                      type="button"
                      onClick={() => setCalendarMonth(prev => {
                        const d = new Date(prev.year, prev.month + 1)
                        return { year: d.getFullYear(), month: d.getMonth() }
                      })}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-sm font-medium"
                      style={{ color: '#555' }}
                    >
                      ›
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                      <div key={d} className="text-xs font-medium py-1" style={{ color: '#aaa' }}>{d}</div>
                    ))}
                    {Array.from({ length: firstDay }).map((_, i) => (
                      <div key={`empty-${i}`} />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1
                      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                      const isBlocked = blockedDates.includes(dateStr)
                      const dateObj = new Date(year, month, day)
                      const isPast = dateObj < today

                      return (
                        <button
                          key={dateStr}
                          type="button"
                          disabled={isPast}
                          onClick={() => {
                            setBlockedDates(prev =>
                              prev.includes(dateStr)
                                ? prev.filter(d => d !== dateStr)
                                : [...prev, dateStr]
                            )
                          }}
                          className="w-full aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-colors"
                          style={{
                            backgroundColor: isBlocked ? '#ef4444' : isPast ? '#f5f5f5' : 'var(--light-gray, #f8f8f5)',
                            color: isBlocked ? '#fff' : isPast ? '#ccc' : 'var(--charcoal, #2b2b2b)',
                            cursor: isPast ? 'default' : 'pointer',
                            border: isBlocked ? '1px solid #dc2626' : '1px solid var(--border, #e0e0d8)',
                          }}
                        >
                          {day}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

            {blockedDates.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: '#555' }}>
                  {blockedDates.length} date{blockedDates.length !== 1 ? 's' : ''} restricted
                </p>
                <button
                  type="button"
                  onClick={() => setBlockedDates([])}
                  className="text-xs font-medium hover:underline"
                  style={{ color: '#dc2626' }}
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* Stripe Connect warning — show if host hasn't connected their bank account */}
          {hasStripeConnected === false && (
            <div
              className="rounded-xl px-4 py-4 text-sm flex items-start gap-3"
              style={{
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                color: '#92400e',
              }}
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#d97706' }} />
              <div>
                <p className="font-semibold mb-1">Connect your bank account to receive payouts</p>
                <p className="mb-2" style={{ color: '#b45309' }}>
                  You can create this listing, but advertisers&apos; payments won&apos;t be automatically sent to you until you connect Stripe. Set it up before your listing goes live.
                </p>
                <Link
                  href="/dashboard/stripe-onboarding"
                  className="font-semibold underline"
                  style={{ color: '#d97706' }}
                >
                  Connect bank account →
                </Link>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full font-semibold py-4 rounded-xl hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
            style={{
              backgroundColor: 'var(--gold, #debb73)',
              color: 'var(--charcoal, #2b2b2b)',
              boxShadow: '0 4px 16px rgba(222,187,115,0.35)',
            }}
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            {loading ? 'Publishing...' : 'Review & publish'}
          </button>
        </form>

        {/* Review Modal */}
        {showReviewModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
            onClick={() => setShowReviewModal(false)}
          >
            <div
              className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6"
              style={{ backgroundColor: '#fff', boxShadow: '0 24px 48px rgba(0,0,0,0.18)' }}
              onClick={e => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" style={{ color: '#888' }} />
              </button>

              <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--charcoal, #2b2b2b)' }}>
                Review your listing
              </h2>
              <p className="text-sm mb-6" style={{ color: '#888' }}>
                Make sure everything looks good before going live.
              </p>

              {photos.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto mb-6 pb-1">
                  {photos.map((photo, i) => (
                    <img
                      key={i}
                      src={photo.preview}
                      alt=""
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      style={{ border: '1px solid var(--border, #e0e0d8)' }}
                    />
                  ))}
                  <span className="self-center text-xs flex-shrink-0 ml-1" style={{ color: '#aaa' }}>
                    {photos.length} photo{photos.length !== 1 ? 's' : ''}
                  </span>
                </div>
              ) : (
                <div
                  className="rounded-xl px-4 py-3 text-sm mb-6"
                  style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}
                >
                  No photos uploaded
                </div>
              )}

              <div className="space-y-5">
                <ReviewSection title="Basic information">
                  <ReviewRow label="Title" value={form.title} />
                  <ReviewRow label="Category" value={CATEGORIES.find(c => c.value === form.category)?.label || form.category} />
                  {form.description && (
                    <div className="text-sm pt-1">
                      <span style={{ color: '#888' }}>Description</span>
                      <p className="mt-1 leading-relaxed" style={{ color: 'var(--charcoal, #2b2b2b)' }}>
                        {form.description}
                      </p>
                    </div>
                  )}
                </ReviewSection>

                <div style={{ borderTop: '1px solid var(--border, #e0e0d8)' }} />

                <ReviewSection title="Location">
                  <ReviewRow label="Address" value={form.address} />
                  <ReviewRow label="City" value={form.city} />
                  <ReviewRow label="State" value={form.state} />
                  <ReviewRow label="ZIP" value={form.zip} />
                </ReviewSection>

                <div style={{ borderTop: '1px solid var(--border, #e0e0d8)' }} />

                <ReviewSection title="Ad specs & performance">
                  <ReviewRow label="Physical dimensions" value={(form.dim_width && form.dim_height) ? `${form.dim_width} × ${form.dim_height} ${form.dim_unit}` : form.dimensions || '—'} />
                  <ReviewRow label="Daily impressions" value={form.daily_impressions ? parseInt(form.daily_impressions).toLocaleString() : '—'} />
                  <ReviewRow label="Illuminated" value={form.illuminated ? 'Yes' : 'No'} />
                  <ReviewRow label="Production time" value={form.production_time} />
                </ReviewSection>

                <div style={{ borderTop: '1px solid var(--border, #e0e0d8)' }} />

                <ReviewSection title="Pricing & availability">
                  <ReviewRow label="Price per day" value={form.price_per_day ? `$${parseFloat(form.price_per_day).toFixed(2)}` : '—'} />
                  <ReviewRow label="Min. days" value={form.min_days} />
                  <ReviewRow label="Max. days" value={form.max_days} />
                  <ReviewRow label="Buy now" value={form.buy_now_enabled ? 'Enabled' : 'Disabled'} />
                </ReviewSection>

                {form.content_restrictions && (
                  <>
                    <div style={{ borderTop: '1px solid var(--border, #e0e0d8)' }} />
                    <ReviewSection title="Content restrictions">
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--charcoal, #2b2b2b)' }}>
                        {form.content_restrictions}
                      </p>
                    </ReviewSection>
                  </>
                )}

                {(form.creative_formats.length > 0 || form.creative_width || form.creative_max_file_size) && (
                  <>
                    <div style={{ borderTop: '1px solid var(--border, #e0e0d8)' }} />
                    <ReviewSection title="Creative specifications">
                      {form.creative_formats.length > 0 && (
                        <ReviewRow label="Formats" value={form.creative_formats.join(', ')} />
                      )}
                      {form.creative_width && form.creative_height && (
                        <ReviewRow label="Required dimensions" value={`${form.creative_width} × ${form.creative_height} ${form.creative_unit}`} />
                      )}
                      <ReviewRow label="Max file size" value={form.creative_max_file_size} />
                      {form.accepts_video && (
                        <>
                          <ReviewRow label="Video duration" value={form.creative_video_duration} />
                          <ReviewRow label="Audio" value={form.creative_audio_allowed ? 'Allowed' : 'Muted'} />
                          <ReviewRow label="Plays per day" value={form.creative_loop_count && form.creative_loop_count !== '0' ? `${form.creative_loop_count}/day` : 'Continuous rotation'} />
                        </>
                      )}
                    </ReviewSection>
                  </>
                )}

                {form.requires_print && (
                  <>
                    <div style={{ borderTop: '1px solid var(--border, #e0e0d8)' }} />
                    <ReviewSection title="Printed materials">
                      <ReviewRow label="Offers printing" value={form.offers_printing ? 'Yes' : 'No'} />
                      {form.offers_printing && form.print_fee && (
                        <ReviewRow label="Print fee" value={`$${parseFloat(form.print_fee).toFixed(2)}`} />
                      )}
                      {!form.offers_printing && form.delivery_address && (
                        <ReviewRow label="Delivery address" value={form.delivery_address} />
                      )}
                    </ReviewSection>
                  </>
                )}

                {blockedDates.length > 0 && (
                  <>
                    <div style={{ borderTop: '1px solid var(--border, #e0e0d8)' }} />
                    <ReviewSection title="Restricted dates">
                      <ReviewRow label="Dates blocked" value={`${blockedDates.length} date${blockedDates.length !== 1 ? 's' : ''}`} />
                    </ReviewSection>
                  </>
                )}
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 font-semibold py-3 rounded-xl text-sm transition-colors hover:opacity-80"
                  style={{
                    backgroundColor: 'var(--light-gray, #f8f8f5)',
                    color: '#555',
                    border: '1px solid var(--border, #e0e0d8)',
                  }}
                >
                  Go back
                </button>
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={loading}
                  className="flex-1 font-semibold py-3 rounded-xl text-sm hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: 'var(--gold, #debb73)',
                    color: 'var(--charcoal, #2b2b2b)',
                    boxShadow: '0 4px 16px rgba(222,187,115,0.35)',
                  }}
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Publishing...' : 'Publish listing'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
