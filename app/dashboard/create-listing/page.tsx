'use client'

/**
 * Create Listing Page — Phase 3: real Supabase insert + photo upload
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, Loader2, CheckCircle, X, AlertCircle, ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const CATEGORIES = [
  { value: 'digital_billboards', label: 'Digital Billboards' },
  { value: 'static_billboards', label: 'Static Billboards' },
  { value: 'transit', label: 'Transit' },
  { value: 'outdoor_static', label: 'Outdoor Static' },
  { value: 'outdoor_digital', label: 'Outdoor Digital' },
  { value: 'display_on_premise', label: 'Display On-Premise' },
  { value: 'event_based', label: 'Event-Based' },
  { value: 'human_based', label: 'Human-Based' },
  { value: 'experiential', label: 'Experiential' },
  { value: 'street_furniture', label: 'Street Furniture' },
  { value: 'unique', label: 'Unique' },
]

interface UploadedPhoto {
  file: File
  preview: string
  url?: string
  uploading?: boolean
  error?: string
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
  daily_traffic: string
  production_time: string
  price_per_day: string
  min_days: string
  max_days: string
  buy_now_enabled: boolean
  content_restrictions: string
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
    daily_traffic: '',
    production_time: '3-5 business days',
    price_per_day: '',
    min_days: '7',
    max_days: '90',
    buy_now_enabled: false,
    content_restrictions: '',
  })

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

  function set(field: keyof FormData, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return
    const newPhotos: UploadedPhoto[] = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .slice(0, 10 - photos.length)
      .map(file => ({
        file,
        preview: URL.createObjectURL(file),
      }))
    setPhotos(prev => [...prev, ...newPhotos])
  }, [photos.length])

  function removePhoto(index: number) {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  async function uploadPhotos(userId: string): Promise<string[]> {
    if (photos.length === 0) return []
    const supabase = createClient()
    const urls: string[] = []

    for (let i = 0; i < photos.length; i++) {
      setPhotos(prev => prev.map((p, idx) => idx === i ? { ...p, uploading: true } : p))
      const photo = photos[i]
      const ext = photo.file.name.split('.').pop() ?? 'jpg'
      const path = `${userId}/${Date.now()}-${i}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('listing-images')
        .upload(path, photo.file, { cacheControl: '3600', upsert: false })

      if (uploadError) {
        setPhotos(prev => prev.map((p, idx) => idx === i ? { ...p, uploading: false, error: uploadError.message } : p))
        continue
      }

      const { data: urlData } = supabase.storage
        .from('listing-images')
        .getPublicUrl(path)

      urls.push(urlData.publicUrl)
      setPhotos(prev => prev.map((p, idx) => idx === i ? { ...p, uploading: false, url: urlData.publicUrl } : p))
    }

    return urls
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setLoading(true)
    setError('')

    // Upload photos first
    const imageUrls = await uploadPhotos(userId)

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
      dimensions: form.dimensions,
      daily_impressions: parseInt(form.daily_impressions) || 0,
      daily_traffic: parseInt(form.daily_traffic) || 0,
      production_time: form.production_time,
      price_per_day: parseFloat(form.price_per_day) || 0,
      min_days: parseInt(form.min_days) || 1,
      max_days: parseInt(form.max_days) || 365,
      buy_now_enabled: form.buy_now_enabled,
      content_restrictions: form.content_restrictions,
      images: imageUrls,
      status: 'pending',
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
    } else {
      setSuccess(true)
    }
  }

  const inputClass = 'w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors'
  const inputStyle = { backgroundColor: '#f4f4f0', border: '1px solid #d4d4c9', color: '#2b2b2b' }
  const cardStyle = { backgroundColor: '#fff', border: '1px solid #d4d4c9', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: '#e6e6dd' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#e6964d' }} />
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20 px-6" style={{ backgroundColor: '#e6e6dd' }}>
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'rgba(230,150,77,0.12)', border: '1px solid rgba(230,150,77,0.3)' }}>
            <CheckCircle className="w-8 h-8" style={{ color: '#e6964d' }} />
          </div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#2b2b2b' }}>Listing submitted!</h2>
          <p className="text-sm mb-8" style={{ color: '#888' }}>
            Your listing is under review. We&apos;ll notify you once it&apos;s approved and live on the marketplace.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/dashboard/listings" className="font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 text-sm" style={{ backgroundColor: '#e6964d', color: '#fff' }}>
              View my listings
            </Link>
            <button
              onClick={() => { setSuccess(false); setPhotos([]); setForm({ title: '', description: '', category: 'digital_billboards', address: '', city: '', state: '', zip: '', dimensions: '', daily_impressions: '', daily_traffic: '', production_time: '3-5 business days', price_per_day: '', min_days: '7', max_days: '90', buy_now_enabled: false, content_restrictions: '' }) }}
              className="font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 text-sm"
              style={{ backgroundColor: '#fff', border: '1px solid #d4d4c9', color: '#555' }}
            >
              Add another
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-16 pb-20" style={{ backgroundColor: '#e6e6dd' }}>
      <div className="max-w-2xl mx-auto px-6 py-8">
        <Link href="/dashboard/listings" className="flex items-center gap-2 text-sm mb-8 hover:opacity-70" style={{ color: '#888' }}>
          <ArrowLeft className="w-3.5 h-3.5" />
          My Listings
        </Link>

        <h1 className="text-2xl font-bold mb-2" style={{ color: '#2b2b2b' }}>List your space</h1>
        <p className="text-sm mb-8" style={{ color: '#888' }}>Fill out the details below. Your listing will be reviewed before going live.</p>

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
              <input type="text" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Downtown Storefront Banner — Main St" className={inputClass} style={inputStyle} required />
            </FormField>
            <FormField label="Description" required>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe your space, visibility, audience..." rows={4} className={`${inputClass} resize-none`} style={inputStyle} required />
            </FormField>
            <FormField label="Category" required>
              <select value={form.category} onChange={e => set('category', e.target.value)} className={`${inputClass} cursor-pointer`} style={inputStyle}>
                {CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
              </select>
            </FormField>
          </div>

          {/* Location */}
          <div className="rounded-2xl p-6 space-y-5" style={cardStyle}>
            <h2 className="font-semibold" style={{ color: '#2b2b2b' }}>Location</h2>
            <FormField label="Street address" required>
              <input type="text" value={form.address} onChange={e => set('address', e.target.value)} placeholder="123 Main Street" className={inputClass} style={inputStyle} required />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="City" required>
                <input type="text" value={form.city} onChange={e => set('city', e.target.value)} placeholder="Las Vegas" className={inputClass} style={inputStyle} required />
              </FormField>
              <FormField label="State" required>
                <input type="text" value={form.state} onChange={e => set('state', e.target.value)} placeholder="NV" maxLength={2} className={inputClass} style={inputStyle} required />
              </FormField>
            </div>
            <FormField label="ZIP code">
              <input type="text" value={form.zip} onChange={e => set('zip', e.target.value)} placeholder="89109" maxLength={10} className={inputClass} style={inputStyle} />
            </FormField>
          </div>

          {/* Photos */}
          <div className="rounded-2xl p-6" style={cardStyle}>
            <h2 className="font-semibold mb-4" style={{ color: '#2b2b2b' }}>Photos</h2>
            {/* Drop zone */}
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer`}
              style={{ borderColor: isDragging ? '#e6964d' : '#d4d4c9', backgroundColor: isDragging ? 'rgba(230,150,77,0.05)' : 'transparent' }}
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files) }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-8 h-8 mx-auto mb-3" style={{ color: isDragging ? '#e6964d' : '#ccc' }} />
              <p className="text-sm mb-1" style={{ color: '#888' }}>Drag photos here or click to upload</p>
              <p className="text-xs" style={{ color: '#aaa' }}>Up to 10 photos · JPG, PNG, WEBP · Max 10MB each</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => addFiles(e.target.files)}
              />
            </div>

            {/* Preview grid */}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-4">
                {photos.map((photo, i) => (
                  <div key={i} className="relative rounded-xl overflow-hidden aspect-square" style={{ border: '1px solid #d4d4c9' }}>
                    <img src={photo.preview} alt="" className="w-full h-full object-cover" />
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
                        onClick={(e) => { e.stopPropagation(); removePhoto(i) }}
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
                    style={{ borderColor: '#d4d4c9', color: '#aaa' }}
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
            <h2 className="font-semibold" style={{ color: '#2b2b2b' }}>Ad specs & performance</h2>
            <FormField label="Dimensions" hint="e.g. 14ft × 48ft or 1920×1080px">
              <input type="text" value={form.dimensions} onChange={e => set('dimensions', e.target.value)} placeholder="14ft × 48ft" className={inputClass} style={inputStyle} />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Daily impressions" hint="Estimated daily views">
                <input type="number" value={form.daily_impressions} onChange={e => set('daily_impressions', e.target.value)} placeholder="15000" min="0" className={inputClass} style={inputStyle} />
              </FormField>
              <FormField label="Daily traffic" hint="Vehicles or pedestrians">
                <input type="number" value={form.daily_traffic} onChange={e => set('daily_traffic', e.target.value)} placeholder="8000" min="0" className={inputClass} style={inputStyle} />
              </FormField>
            </div>
            <FormField label="Production time" hint="How long does it take to install/print?">
              <input type="text" value={form.production_time} onChange={e => set('production_time', e.target.value)} placeholder="3-5 business days" className={inputClass} style={inputStyle} />
            </FormField>
          </div>

          {/* Pricing */}
          <div className="rounded-2xl p-6 space-y-5" style={cardStyle}>
            <h2 className="font-semibold" style={{ color: '#2b2b2b' }}>Pricing & availability</h2>
            <FormField label="Price per day (USD)" required>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#888' }}>$</span>
                <input type="number" value={form.price_per_day} onChange={e => set('price_per_day', e.target.value)} placeholder="250" min="1" step="0.01" className={`${inputClass} pl-8`} style={inputStyle} required />
              </div>
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Min. days">
                <input type="number" value={form.min_days} onChange={e => set('min_days', e.target.value)} min="1" className={inputClass} style={inputStyle} />
              </FormField>
              <FormField label="Max. days">
                <input type="number" value={form.max_days} onChange={e => set('max_days', e.target.value)} min="1" className={inputClass} style={inputStyle} />
              </FormField>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => set('buy_now_enabled', !form.buy_now_enabled)}
                className="relative w-11 h-6 rounded-full transition-colors"
                style={{ backgroundColor: form.buy_now_enabled ? '#e6964d' : '#d4d4c9' }}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${form.buy_now_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <div>
                <div className="text-sm font-medium" style={{ color: '#555' }}>Enable Buy Now</div>
                <div className="text-xs" style={{ color: '#aaa' }}>Allow instant booking without approval</div>
              </div>
            </div>
          </div>

          {/* Content restrictions */}
          <div className="rounded-2xl p-6" style={cardStyle}>
            <h2 className="font-semibold mb-4" style={{ color: '#2b2b2b' }}>Content restrictions</h2>
            <FormField label="What content will you NOT accept?" hint="e.g. No adult content, tobacco, competing brands">
              <textarea value={form.content_restrictions} onChange={e => set('content_restrictions', e.target.value)} placeholder="List any content types or brands you will not display..." rows={3} className={`${inputClass} resize-none`} style={inputStyle} />
            </FormField>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full font-semibold py-4 rounded-xl hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
            style={{ backgroundColor: '#e6964d', color: '#fff', boxShadow: '0 4px 16px rgba(230,150,77,0.35)' }}
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            {loading ? 'Submitting...' : 'Submit listing for review'}
          </button>
        </form>
      </div>
    </div>
  )
}
