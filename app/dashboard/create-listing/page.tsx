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
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, Loader2, CheckCircle, X, AlertCircle, ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const CATEGORIES = [
  { value: 'digital_billboards', label: 'Digital Billboard' },
  { value: 'static_billboards', label: 'Static Billboard' },
  { value: 'transit', label: 'Transit' },
  { value: 'outdoor_static', label: 'Outdoor Static' },
  { value: 'outdoor_digital', label: 'Outdoor Digital' },
  { value: 'display_on_premise', label: 'Display On-Premise' },
  { value: 'event_based', label: 'Event-Based' },
  { value: 'human_based', label: 'Human-Based' },
  { value: 'experiential', label: 'Experiential' },
  { value: 'street_furniture', label: 'Street Furniture' },
  { value: 'unique', label: 'Unique' },
  { value: 'other', label: 'Other' },
]

const STATIC_CATEGORIES = [
  'static_billboards',
  'outdoor_static',
  'event_based',
  'human_based',
  'street_furniture',
  'other',
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

const CREATIVE_FORMATS = ['PDF', 'JPG', 'PNG', 'MP4', 'HTML5', 'AI', 'PSD']

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
  // Delivery
  delivery_instructions: string
  // Creative specs
  creative_formats: string[]
  creative_dimensions: string
  creative_max_file_size: string
  // Video (any category when accepts_video)
  accepts_video: boolean
  creative_video_duration: string
  creative_audio_allowed: boolean
  creative_loop_count: string
  // Printing (static categories)
  creative_host_prints: boolean
  creative_print_cost: string
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
  daily_impressions: '',
  illuminated: false,
  production_time: '3 days',
  price_per_day: '',
  min_days: '7',
  max_days: '90',
  buy_now_enabled: false,
  content_restrictions: '',
  delivery_instructions: '',
  creative_formats: [],
  creative_dimensions: '',
  creative_max_file_size: '25MB',
  accepts_video: false,
  creative_video_duration: '15s',
  creative_audio_allowed: false,
  creative_loop_count: '',
  creative_host_prints: false,
  creative_print_cost: '',
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
          backgroundColor: value ? '#7ecfc0' : '#d1d5db',
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

export default function CreateListingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [photos, setPhotos] = useState<UploadedPhoto[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<FormData>(INITIAL_FORM)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/login?redirect=/dashboard/create-listing')
      } else {
        setUserId(data.user.id)
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
    const supabase = createClient()
    const urls: string[] = []

    for (let i = 0; i < photos.length; i++) {
      setPhotos(prev =>
        prev.map((p, idx) => (idx === i ? { ...p, uploading: true } : p))
      )
      const photo = photos[i]
      const ext = photo.file.name.split('.').pop() ?? 'jpg'
      const path = `${uid}/${Date.now()}-${i}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('listing-images')
        .upload(path, photo.file, { cacheControl: '3600', upsert: false })

      if (uploadError) {
        setPhotos(prev =>
          prev.map((p, idx) =>
            idx === i ? { ...p, uploading: false, error: uploadError.message } : p
          )
        )
        continue
      }

      const { data: urlData } = supabase.storage
        .from('listing-images')
        .getPublicUrl(path)

      urls.push(urlData.publicUrl)
      setPhotos(prev =>
        prev.map((p, idx) =>
          idx === i ? { ...p, uploading: false, url: urlData.publicUrl } : p
        )
      )
    }

    return urls
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return

    // Validate zip
    if (!form.zip.trim()) {
      setError('ZIP code is required.')
      return
    }

    setLoading(true)
    setError('')

    const imageUrls = await uploadPhotos(userId)

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
    const { error: insertError } = await supabase.from('listings').insert({
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
      dimensions: form.dimensions,
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
      creative_dimensions: form.creative_dimensions || null,
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
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
    } else {
      setSuccess(true)
    }
  }

  const inputClass =
    'w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors'
  const inputStyle = {
    backgroundColor: '#f8f8f5',
    border: '1px solid #e0e0d8',
    color: '#2b2b2b',
  }
  const cardStyle = {
    backgroundColor: '#fff',
    border: '1px solid #e0e0d8',
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
        style={{ backgroundColor: '#f0f0ec' }}
      >
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#7ecfc0' }} />
      </div>
    )
  }

  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center pt-20 px-6"
        style={{ backgroundColor: '#f0f0ec' }}
      >
        <div className="text-center max-w-md">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{
              backgroundColor: 'rgba(126,207,192,0.12)',
              border: '1px solid rgba(222,187,115,0.3)',
            }}
          >
            <CheckCircle className="w-8 h-8" style={{ color: '#7ecfc0' }} />
          </div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#2b2b2b' }}>
            Listing is now live!
          </h2>
          <p className="text-sm mb-8" style={{ color: '#888' }}>
            Your listing is now live on the marketplace. Advertisers can find and book it right away.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/dashboard/listings"
              className="font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 text-sm"
              style={{ backgroundColor: '#debb73', color: '#2b2b2b' }}
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
                border: '1px solid #e0e0d8',
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
    <div className="min-h-screen pt-16 pb-20" style={{ backgroundColor: '#f0f0ec' }}>
      <div className="max-w-2xl mx-auto px-6 py-8">
        <Link
          href="/dashboard/listings"
          className="flex items-center gap-2 text-sm mb-8 hover:opacity-70"
          style={{ color: '#888' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          My Listings
        </Link>

        <h1 className="text-2xl font-bold mb-2" style={{ color: '#2b2b2b' }}>
          List your space
        </h1>
        <p className="text-sm mb-8" style={{ color: '#888' }}>
          Fill out the details below. Your listing will be reviewed before going live.
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

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <div className="rounded-2xl p-6 space-y-5" style={cardStyle}>
            <h2 className="font-semibold" style={{ color: '#2b2b2b' }}>
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
            <h2 className="font-semibold" style={{ color: '#2b2b2b' }}>
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
            <h2 className="font-semibold mb-4" style={{ color: '#2b2b2b' }}>
              Photos
            </h2>
            <div
              className="border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer"
              style={{
                borderColor: isDragging ? '#7ecfc0' : '#e0e0d8',
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
                style={{ color: isDragging ? '#7ecfc0' : '#ccc' }}
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
                    style={{ border: '1px solid #e0e0d8' }}
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
                    style={{ borderColor: '#e0e0d8', color: '#aaa' }}
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
            <h2 className="font-semibold" style={{ color: '#2b2b2b' }}>
              Ad specs &amp; performance
            </h2>
            <FormField label="Dimensions" hint="e.g. 14ft × 48ft or 1920×1080px">
              <input
                type="text"
                value={form.dimensions}
                onChange={e => set('dimensions', e.target.value)}
                placeholder="14ft × 48ft"
                className={inputClass}
                style={inputStyle}
              />
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
            <h2 className="font-semibold" style={{ color: '#2b2b2b' }}>
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
              label="Enable Buy Now"
              hint="Allow instant booking without approval"
            />
          </div>

          {/* Content restrictions */}
          <div className="rounded-2xl p-6" style={cardStyle}>
            <h2 className="font-semibold mb-4" style={{ color: '#2b2b2b' }}>
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

          {/* Creative Specifications */}
          <div className="rounded-2xl p-6 space-y-5" style={cardStyle}>
            <div>
              <h2 className="font-semibold" style={{ color: '#2b2b2b' }}>
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
                        backgroundColor: checked ? '#7ecfc0' : '#f8f8f5',
                        color: checked ? '#fff' : '#555',
                        border: checked ? '1px solid #7ecfc0' : '1px solid #e0e0d8',
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
              <FormField
                label="Preferred dimensions"
                hint={'e.g. "1920x1080" or "24x36 inches"'}
              >
                <input
                  type="text"
                  value={form.creative_dimensions}
                  onChange={e => set('creative_dimensions', e.target.value)}
                  placeholder="1920x1080"
                  className={inputClass}
                  style={inputStyle}
                />
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

            {/* Video toggle — works for any category */}
            <div className="pt-3" style={{ borderTop: '1px solid #f0f0ec' }}>
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
                    label="How many times should the video repeat?"
                    hint="Set to 0 for continuous play"
                  >
                    <input
                      type="number"
                      value={form.creative_loop_count}
                      onChange={e => set('creative_loop_count', e.target.value)}
                      placeholder="0"
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

            {/* Printing service — static/physical categories only */}
            {showStaticFields && (
              <div className="space-y-4 pt-3" style={{ borderTop: '1px solid #f0f0ec' }}>
                <Toggle
                  value={form.creative_host_prints}
                  onChange={v => set('creative_host_prints', v)}
                  label="Do you offer printing?"
                  hint="You will handle printing for the advertiser"
                />
                {form.creative_host_prints && (
                  <FormField
                    label="Printing cost per unit ($)"
                    hint="This cost will be added to the advertiser's total"
                  >
                    <div className="relative">
                      <span
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-sm"
                        style={{ color: '#888' }}
                      >
                        $
                      </span>
                      <input
                        type="number"
                        value={form.creative_print_cost}
                        onChange={e => set('creative_print_cost', e.target.value)}
                        placeholder="150"
                        min="0"
                        step="0.01"
                        className={`${inputClass} pl-8`}
                        style={inputStyle}
                      />
                    </div>
                  </FormField>
                )}
              </div>
            )}
          </div>

          {/* Delivery Instructions — static/physical categories only */}
          {showStaticFields && (
            <div className="rounded-2xl p-6" style={cardStyle}>
              <h2 className="font-semibold mb-4" style={{ color: '#2b2b2b' }}>
                Delivery instructions
              </h2>
              <FormField
                label="Shipping or drop-off instructions"
                hint="Provide shipping address or drop-off instructions for physical materials (optional)"
              >
                <textarea
                  value={form.delivery_instructions}
                  onChange={e => set('delivery_instructions', e.target.value)}
                  placeholder="e.g. Ship to: 123 Main St, Las Vegas NV 89109. Attn: Marketing Dept. Materials must arrive 5 days before campaign start."
                  rows={4}
                  className={`${inputClass} resize-none`}
                  style={inputStyle}
                />
              </FormField>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full font-semibold py-4 rounded-xl hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
            style={{
              backgroundColor: '#debb73',
              color: '#2b2b2b',
              boxShadow: '0 4px 16px rgba(222,187,115,0.35)',
            }}
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            {loading ? 'Submitting...' : 'Submit listing for review'}
          </button>
        </form>
      </div>
    </div>
  )
}
