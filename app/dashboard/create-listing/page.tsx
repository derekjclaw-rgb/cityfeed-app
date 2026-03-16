'use client'

/**
 * Create Listing Page — host form to add a new ad placement
 */
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Upload, Loader2, CheckCircle, ImagePlus, AlertCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const CATEGORIES = [
  { value: 'billboard', label: 'Billboard' },
  { value: 'digital_screen', label: 'Digital Screen' },
  { value: 'window', label: 'Window Wrap' },
  { value: 'storefront', label: 'Storefront Banner' },
  { value: 'vehicle_wrap', label: 'Vehicle Wrap' },
  { value: 'event_space', label: 'Event Space' },
  { value: 'transit', label: 'Transit Shelter' },
  { value: 'other', label: 'Other' },
]

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

function FormField({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
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

  const [form, setForm] = useState<FormData>({
    title: '',
    description: '',
    category: 'billboard',
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
        router.push('/login')
      } else {
        setUserId(data.user.id)
        setAuthLoading(false)
      }
    })
  }, [router])

  function set(field: keyof FormData, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const inputClass = 'w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#22c55e] focus:ring-2 focus:ring-green-100 transition-colors'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.from('listings').insert({
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
      status: 'pending',
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#22c55e]" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20 px-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-[#22c55e]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Listing submitted!</h2>
          <p className="text-gray-500 text-sm mb-8">
            Your listing is under review. We&apos;ll notify you once it&apos;s approved and live on the marketplace.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/dashboard/listings"
              className="bg-[#22c55e] text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-[#16a34a] transition-colors text-sm"
            >
              View my listings
            </Link>
            <button
              onClick={() => { setSuccess(false); setForm({ title: '', description: '', category: 'billboard', address: '', city: '', state: '', zip: '', dimensions: '', daily_impressions: '', daily_traffic: '', production_time: '3-5 business days', price_per_day: '', min_days: '7', max_days: '90', buy_now_enabled: false, content_restrictions: '' }) }}
              className="bg-white border border-gray-200 text-gray-600 font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm"
            >
              Add another
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16 pb-20">
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <Link href="/dashboard/listings" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-8 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          My Listings
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">List your space</h1>
        <p className="text-gray-500 text-sm mb-8">Fill out the details below. Your listing will be reviewed before going live.</p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm flex items-center gap-2 mb-6">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section: Basic Info */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-5">
            <h2 className="font-semibold text-gray-900">Basic information</h2>

            <FormField label="Listing title" required>
              <input
                type="text"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="e.g. Downtown Storefront Banner — Main St"
                className={inputClass}
                required
              />
            </FormField>

            <FormField label="Description" required>
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Describe your space, visibility, audience, and unique selling points..."
                rows={4}
                className={`${inputClass} resize-none`}
                required
              />
            </FormField>

            <FormField label="Category" required>
              <select
                value={form.category}
                onChange={e => set('category', e.target.value)}
                className={`${inputClass} cursor-pointer`}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </FormField>
          </div>

          {/* Section: Location */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-5">
            <h2 className="font-semibold text-gray-900">Location</h2>

            <FormField label="Street address" required>
              <input
                type="text"
                value={form.address}
                onChange={e => set('address', e.target.value)}
                placeholder="123 Main Street"
                className={inputClass}
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
                  required
                />
              </FormField>
            </div>

            <FormField label="ZIP code">
              <input
                type="text"
                value={form.zip}
                onChange={e => set('zip', e.target.value)}
                placeholder="89109"
                maxLength={10}
                className={inputClass}
              />
            </FormField>
          </div>

          {/* Section: Photos */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4">Photos</h2>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-green-300 transition-colors">
              <ImagePlus className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-2">Drag photos here or click to upload</p>
              <p className="text-xs text-gray-400">Up to 10 photos · JPG, PNG, WEBP · Max 10MB each</p>
              <button
                type="button"
                className="mt-4 inline-flex items-center gap-2 bg-gray-50 border border-gray-200 text-gray-600 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Choose files
              </button>
              <p className="text-xs text-gray-400 mt-2">(Photo upload coming soon)</p>
            </div>
          </div>

          {/* Section: Ad specs */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-5">
            <h2 className="font-semibold text-gray-900">Ad specs & performance</h2>

            <FormField label="Dimensions" hint="e.g. 14ft × 48ft or 1920×1080px">
              <input
                type="text"
                value={form.dimensions}
                onChange={e => set('dimensions', e.target.value)}
                placeholder="14ft × 48ft"
                className={inputClass}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Daily impressions" hint="Estimated daily views">
                <input
                  type="number"
                  value={form.daily_impressions}
                  onChange={e => set('daily_impressions', e.target.value)}
                  placeholder="15000"
                  min="0"
                  className={inputClass}
                />
              </FormField>
              <FormField label="Daily traffic" hint="Vehicles or pedestrians">
                <input
                  type="number"
                  value={form.daily_traffic}
                  onChange={e => set('daily_traffic', e.target.value)}
                  placeholder="8000"
                  min="0"
                  className={inputClass}
                />
              </FormField>
            </div>

            <FormField label="Production time" hint="How long does it take to install/print?">
              <input
                type="text"
                value={form.production_time}
                onChange={e => set('production_time', e.target.value)}
                placeholder="3-5 business days"
                className={inputClass}
              />
            </FormField>
          </div>

          {/* Section: Pricing */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-5">
            <h2 className="font-semibold text-gray-900">Pricing & availability</h2>

            <FormField label="Price per day (USD)" required>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  value={form.price_per_day}
                  onChange={e => set('price_per_day', e.target.value)}
                  placeholder="250"
                  min="1"
                  step="0.01"
                  className={`${inputClass} pl-8`}
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
                  className={inputClass}
                />
              </FormField>
              <FormField label="Max. days">
                <input
                  type="number"
                  value={form.max_days}
                  onChange={e => set('max_days', e.target.value)}
                  min="1"
                  className={inputClass}
                />
              </FormField>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => set('buy_now_enabled', !form.buy_now_enabled)}
                className={`relative w-11 h-6 rounded-full transition-colors ${form.buy_now_enabled ? 'bg-[#22c55e]' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${form.buy_now_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <div>
                <div className="text-sm font-medium text-gray-700">Enable Buy Now</div>
                <div className="text-xs text-gray-400">Allow instant booking without approval</div>
              </div>
            </div>
          </div>

          {/* Section: Content restrictions */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4">Content restrictions</h2>
            <FormField label="What content will you NOT accept?" hint="e.g. No adult content, tobacco, competing brands">
              <textarea
                value={form.content_restrictions}
                onChange={e => set('content_restrictions', e.target.value)}
                placeholder="List any content types or brands you will not display..."
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </FormField>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#22c55e] text-white font-semibold py-4 rounded-xl hover:bg-[#16a34a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-green-200 text-base"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            {loading ? 'Submitting...' : 'Submit listing for review'}
          </button>
        </form>
      </div>
    </div>
  )
}
