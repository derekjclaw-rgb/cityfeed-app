'use client'

/**
 * Edit Listing Page — pre-fills form with existing listing data
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
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

const isStaticCat = (cat: string) => STATIC_CATEGORIES.includes(cat)

const CREATIVE_FORMATS = ['PDF', 'JPG', 'PNG', 'MP4', 'HTML5', 'AI', 'PSD']

interface UploadedPhoto {
  file?: File
  preview: string
  url?: string
  uploading?: boolean
  error?: string
  isExisting?: boolean
}

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
  delivery_instructions: string
  creative_formats: string[]
  creative_dimensions: string
  creative_max_file_size: string
  accepts_video: boolean
  creative_video_duration: string
  creative_audio_allowed: boolean
  creative_loop_count: string
  creative_host_prints: boolean
  creative_print_cost: string
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

function Toggle({ value, onChange, label, hint }: { value: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(!value)}
        className="relative flex-shrink-0 rounded-full transition-colors"
        style={{ width: '48px', height: '28px', backgroundColor: value ? '#7ecfc0' : '#d1d5db', border: 'none', outline: 'none' }}
      >
        <span
          className="absolute rounded-full bg-white shadow-sm transition-transform"
          style={{ width: '20px', height: '20px', top: '4px', left: '4px', transform: value ? 'translateX(20px)' : 'translateX(0)' }}
        />
      </button>
      <div>
        <div className="text-sm font-medium" style={{ color: '#555' }}>{label}</div>
        {hint && <div className="text-xs" style={{ color: '#aaa' }}>{hint}</div>}
      </div>
    </div>
  )
}

export default function EditListingPage() {
  const router = useRouter()
  const params = useParams()
  const listingId = params.id as string

  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [photos, setPhotos] = useState<UploadedPhoto[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<FormData>({
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
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.push('/login?redirect=/dashboard/listings')
        return
      }
      setUserId(data.user.id)

      const { data: listing, error: fetchErr } = await supabase
        .from('listings')
        .select('*')
        .eq('id', listingId)
        .eq('host_id', data.user.id)
        .single()

      if (fetchErr || !listing) {
        setError('Listing not found or you do not have permission to edit it.')
        setPageLoading(false)
        return
      }

      // Pre-fill form
      setForm({
        title: listing.title ?? '',
        description: listing.description ?? '',
        category: listing.category ?? 'digital_billboards',
        address: listing.address ?? '',
        city: listing.city ?? '',
        state: listing.state ?? '',
        zip: listing.zip ?? '',
        dimensions: listing.dimensions ?? '',
        daily_impressions: listing.daily_impressions?.toString() ?? '',
        illuminated: listing.illuminated ?? false,
        production_time: listing.production_time ?? '3 days',
        price_per_day: listing.price_per_day?.toString() ?? '',
        min_days: listing.min_days?.toString() ?? '7',
        max_days: listing.max_days?.toString() ?? '90',
        buy_now_enabled: listing.buy_now_enabled ?? false,
        content_restrictions: listing.content_restrictions ?? '',
        delivery_instructions: listing.delivery_instructions ?? '',
        creative_formats: listing.creative_formats ?? [],
        creative_dimensions: listing.creative_dimensions ?? '',
        creative_max_file_size: listing.creative_max_file_size ?? '25MB',
        accepts_video: !!(listing.creative_video_duration),
        creative_video_duration: listing.creative_video_duration ?? '15s',
        creative_audio_allowed: listing.creative_audio_allowed ?? false,
        creative_loop_count: listing.creative_loop_count?.toString() ?? '',
        creative_host_prints: listing.creative_host_prints ?? false,
        creative_print_cost: listing.creative_print_cost?.toString() ?? '',
      })

      // Load existing images
      if (listing.images && listing.images.length > 0) {
        setPhotos(listing.images.map((url: string) => ({
          preview: url,
          url,
          isExisting: true,
        })))
      }

      setPageLoading(false)
    })
  }, [listingId, router])

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
      const photo = prev[index]
      if (!photo.isExisting && photo.preview) {
        URL.revokeObjectURL(photo.preview)
      }
      return prev.filter((_, i) => i !== index)
    })
  }

  async function uploadNewPhotos(uid: string): Promise<string[]> {
    const supabase = createClient()
    const urls: string[] = []

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i]
      if (photo.isExisting && photo.url) {
        urls.push(photo.url)
        continue
      }
      if (!photo.file) continue

      setPhotos(prev =>
        prev.map((p, idx) => (idx === i ? { ...p, uploading: true } : p))
      )

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

      const { data: urlData } = supabase.storage.from('listing-images').getPublicUrl(path)
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

    if (!form.zip.trim()) {
      setError('ZIP code is required.')
      return
    }

    setLoading(true)
    setError('')

    const imageUrls = await uploadNewPhotos(userId)

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
    const { error: updateError } = await supabase
      .from('listings')
      .update({
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
        illuminated: form.illuminated,
        production_time: form.production_time,
        price_per_day: parseFloat(form.price_per_day) || 0,
        min_days: parseInt(form.min_days) || 1,
        max_days: parseInt(form.max_days) || 365,
        buy_now_enabled: form.buy_now_enabled,
        content_restrictions: form.content_restrictions,
        images: imageUrls,
        delivery_instructions: isStaticCat(form.category)
          ? form.delivery_instructions || null
          : null,
        creative_formats: form.creative_formats.length > 0 ? form.creative_formats : null,
        creative_dimensions: form.creative_dimensions || null,
        creative_max_file_size: form.creative_max_file_size || null,
        ...(form.accepts_video
          ? {
              creative_video_duration: form.creative_video_duration || null,
              creative_audio_allowed: form.creative_audio_allowed,
              creative_loop_count: form.creative_loop_count
                ? parseInt(form.creative_loop_count)
                : null,
            }
          : {
              creative_video_duration: null,
              creative_audio_allowed: false,
              creative_loop_count: null,
            }),
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
      .eq('id', listingId)
      .eq('host_id', userId)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
    } else {
      setSuccess(true)
    }
  }

  const inputClass = 'w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors'
  const inputStyle = { backgroundColor: '#f8f8f5', border: '1px solid #e0e0d8', color: '#2b2b2b' }
  const cardStyle = { backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }

  const showStaticFields = isStaticCat(form.category)

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: '#f0f0ec' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#7ecfc0' }} />
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20 px-6" style={{ backgroundColor: '#f0f0ec' }}>
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'rgba(126,207,192,0.12)', border: '1px solid rgba(222,187,115,0.3)' }}>
            <CheckCircle className="w-8 h-8" style={{ color: '#7ecfc0' }} />
          </div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#2b2b2b' }}>Listing updated!</h2>
          <p className="text-sm mb-8" style={{ color: '#888' }}>Your changes have been saved.</p>
          <Link
            href="/dashboard/listings"
            className="font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 text-sm"
            style={{ backgroundColor: '#debb73', color: '#2b2b2b' }}
          >
            Back to my listings
          </Link>
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

        <h1 className="text-2xl font-bold mb-2" style={{ color: '#2b2b2b' }}>Edit listing</h1>
        <p className="text-sm mb-8" style={{ color: '#888' }}>Update your listing details below.</p>

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2 mb-6" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <div className="rounded-2xl p-6 space-y-5" style={cardStyle}>
            <h2 className="font-semibold" style={{ color: '#2b2b2b' }}>Basic information</h2>
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
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </FormField>
          </div>

          {/* Location */}
          <div className="rounded-2xl p-6 space-y-5" style={cardStyle}>
            <h2 className="font-semibold" style={{ color: '#2b2b2b' }}>Location</h2>
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
            <h2 className="font-semibold mb-4" style={{ color: '#2b2b2b' }}>Photos</h2>
            <div
              className="border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer"
              style={{ borderColor: isDragging ? '#7ecfc0' : '#e0e0d8', backgroundColor: isDragging ? 'rgba(126,207,192,0.05)' : 'transparent' }}
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files) }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-8 h-8 mx-auto mb-3" style={{ color: isDragging ? '#7ecfc0' : '#ccc' }} />
              <p className="text-sm mb-1" style={{ color: '#888' }}>Drag photos here or click to upload</p>
              <p className="text-xs" style={{ color: '#aaa' }}>Up to 10 photos · JPG, PNG, WEBP · Max 10MB each</p>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => addFiles(e.target.files)} />
            </div>
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-4">
                {photos.map((photo, i) => (
                  <div key={i} className="relative rounded-xl overflow-hidden aspect-square" style={{ border: '1px solid #e0e0d8' }}>
                    {photo.preview ? (
                      <img src={photo.preview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#f0f0ec' }}>
                        <ImageIcon className="w-6 h-6" style={{ color: '#ccc' }} />
                      </div>
                    )}
                    {photo.uploading && (
                      <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                        <Loader2 className="w-5 h-5 animate-spin text-white" />
                      </div>
                    )}
                    {photo.error && (
                      <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(220,38,38,0.6)' }}>
                        <AlertCircle className="w-5 h-5 text-white" />
                      </div>
                    )}
                    {!photo.uploading && (
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); removePhoto(i) }}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Specs */}
          <div className="rounded-2xl p-6 space-y-5" style={cardStyle}>
            <h2 className="font-semibold" style={{ color: '#2b2b2b' }}>Specs & pricing</h2>
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
            <FormField label="Daily impressions (estimated)">
              <input
                type="number"
                value={form.daily_impressions}
                onChange={e => set('daily_impressions', e.target.value)}
                placeholder="10000"
                min={0}
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
            <FormField label="Price per day ($)" required>
              <input
                type="number"
                value={form.price_per_day}
                onChange={e => set('price_per_day', e.target.value)}
                placeholder="250"
                min={1}
                step="0.01"
                className={inputClass}
                style={inputStyle}
                required
              />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Min booking days" required>
                <input
                  type="number"
                  value={form.min_days}
                  onChange={e => set('min_days', e.target.value)}
                  min={1}
                  className={inputClass}
                  style={inputStyle}
                  required
                />
              </FormField>
              <FormField label="Max booking days" required>
                <input
                  type="number"
                  value={form.max_days}
                  onChange={e => set('max_days', e.target.value)}
                  min={1}
                  className={inputClass}
                  style={inputStyle}
                  required
                />
              </FormField>
            </div>
            <FormField label="Production / installation time">
              <select
                value={form.production_time}
                onChange={e => set('production_time', e.target.value)}
                className={`${inputClass} cursor-pointer`}
                style={inputStyle}
              >
                {PRODUCTION_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </FormField>
            <Toggle
              value={form.illuminated}
              onChange={v => set('illuminated', v)}
              label="Illuminated"
              hint="Display is lit at night"
            />
            <Toggle
              value={form.buy_now_enabled}
              onChange={v => set('buy_now_enabled', v)}
              label="Allow instant booking"
              hint="Advertisers can book without prior approval"
            />
          </div>

          {/* Creative specs */}
          <div className="rounded-2xl p-6 space-y-5" style={cardStyle}>
            <h2 className="font-semibold" style={{ color: '#2b2b2b' }}>Creative specs</h2>
            <FormField label="Accepted file formats">
              <div className="flex flex-wrap gap-2">
                {CREATIVE_FORMATS.map(fmt => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => toggleFormat(fmt)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: form.creative_formats.includes(fmt) ? 'rgba(126,207,192,0.15)' : '#f8f8f5',
                      border: `1px solid ${form.creative_formats.includes(fmt) ? '#7ecfc0' : '#e0e0d8'}`,
                      color: form.creative_formats.includes(fmt) ? '#7ecfc0' : '#888',
                    }}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </FormField>
            <FormField label="Creative dimensions / resolution" hint="e.g. 1920×1080px, 300dpi">
              <input
                type="text"
                value={form.creative_dimensions}
                onChange={e => set('creative_dimensions', e.target.value)}
                placeholder="1920×1080px"
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
            <FormField label="Max file size">
              <input
                type="text"
                value={form.creative_max_file_size}
                onChange={e => set('creative_max_file_size', e.target.value)}
                placeholder="25MB"
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
            <Toggle
              value={form.accepts_video}
              onChange={v => set('accepts_video', v)}
              label="Accepts video content"
            />
            {form.accepts_video && (
              <div className="space-y-4 pl-2" style={{ borderLeft: '2px solid rgba(126,207,192,0.3)' }}>
                <FormField label="Max video duration">
                  <input
                    type="text"
                    value={form.creative_video_duration}
                    onChange={e => set('creative_video_duration', e.target.value)}
                    placeholder="15s"
                    className={inputClass}
                    style={inputStyle}
                  />
                </FormField>
                <Toggle
                  value={form.creative_audio_allowed}
                  onChange={v => set('creative_audio_allowed', v)}
                  label="Audio allowed"
                />
                <FormField label="Loop count (leave blank for unlimited)">
                  <input
                    type="number"
                    value={form.creative_loop_count}
                    onChange={e => set('creative_loop_count', e.target.value)}
                    placeholder="e.g. 3"
                    min={1}
                    className={inputClass}
                    style={inputStyle}
                  />
                </FormField>
              </div>
            )}
            {showStaticFields && (
              <>
                <Toggle
                  value={form.creative_host_prints}
                  onChange={v => set('creative_host_prints', v)}
                  label="Host handles printing"
                  hint="You print and install the creative on behalf of advertisers"
                />
                {form.creative_host_prints && (
                  <FormField label="Print cost ($)" hint="Added to advertiser's total">
                    <input
                      type="number"
                      value={form.creative_print_cost}
                      onChange={e => set('creative_print_cost', e.target.value)}
                      placeholder="150"
                      min={0}
                      step="0.01"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </FormField>
                )}
                <FormField label="Delivery instructions" hint="How the advertiser should send print files">
                  <textarea
                    value={form.delivery_instructions}
                    onChange={e => set('delivery_instructions', e.target.value)}
                    rows={2}
                    placeholder="Send files via WeTransfer to..."
                    className={`${inputClass} resize-none`}
                    style={inputStyle}
                  />
                </FormField>
              </>
            )}
          </div>

          {/* Content restrictions */}
          <div className="rounded-2xl p-6 space-y-5" style={cardStyle}>
            <h2 className="font-semibold" style={{ color: '#2b2b2b' }}>Content restrictions</h2>
            <FormField label="Any content you won't accept?" hint="e.g. no alcohol, no political ads, no adult content">
              <textarea
                value={form.content_restrictions}
                onChange={e => set('content_restrictions', e.target.value)}
                rows={3}
                placeholder="No tobacco, no alcohol, no adult content..."
                className={`${inputClass} resize-none`}
                style={inputStyle}
              />
            </FormField>
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: '#debb73', color: '#2b2b2b', boxShadow: '0 4px 16px rgba(222,187,115,0.35)' }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Save changes
            </button>
            <Link
              href="/dashboard/listings"
              className="px-5 py-3.5 rounded-xl text-sm font-semibold hover:opacity-80 transition-opacity flex items-center justify-center"
              style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', color: '#555' }}
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
