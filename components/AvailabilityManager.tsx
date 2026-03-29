'use client'

/**
 * AvailabilityManager — Host can block date ranges for a listing
 * Stores blocked ranges in listings.availability jsonb column as:
 * { blocked: [{ start: "YYYY-MM-DD", end: "YYYY-MM-DD", reason?: string }] }
 */
import { useState, useEffect } from 'react'
import { X, CalendarOff, Plus, Loader2, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface BlockedRange {
  start: string
  end: string
  reason?: string
}

interface AvailabilityData {
  blocked?: BlockedRange[]
}

interface Props {
  listingId: string
  listingTitle: string
  onClose: () => void
}

function formatDate(d: string) {
  if (!d) return '—'
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AvailabilityManager({ listingId, listingTitle, onClose }: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [blockedRanges, setBlockedRanges] = useState<BlockedRange[]>([])

  const [newStart, setNewStart] = useState('')
  const [newEnd, setNewEnd] = useState('')
  const [newReason, setNewReason] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('listings')
        .select('availability')
        .eq('id', listingId)
        .single()

      if (data?.availability) {
        const avail = data.availability as AvailabilityData
        setBlockedRanges(avail.blocked ?? [])
      }
      setLoading(false)
    }
    load()
  }, [listingId])

  async function handleSave(newRanges: BlockedRange[]) {
    setSaving(true)
    setError('')

    const supabase = createClient()
    const { error: saveErr } = await supabase
      .from('listings')
      .update({ availability: { blocked: newRanges } })
      .eq('id', listingId)

    if (saveErr) {
      setError(saveErr.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  function handleAddRange() {
    if (!newStart || !newEnd) {
      setError('Please select both start and end dates.')
      return
    }
    if (newEnd < newStart) {
      setError('End date must be after start date.')
      return
    }
    setError('')
    const updated = [...blockedRanges, { start: newStart, end: newEnd, reason: newReason.trim() || undefined }]
    setBlockedRanges(updated)
    setNewStart('')
    setNewEnd('')
    setNewReason('')
    handleSave(updated)
  }

  function handleRemoveRange(i: number) {
    const updated = blockedRanges.filter((_, idx) => idx !== i)
    setBlockedRanges(updated)
    handleSave(updated)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #e0e0d8' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ backgroundColor: 'rgba(126,207,192,0.1)' }}>
              <CalendarOff className="w-5 h-5" style={{ color: '#7ecfc0' }} />
            </div>
            <div>
              <h2 className="font-bold text-base" style={{ color: '#2b2b2b' }}>Manage Availability</h2>
              <p className="text-xs mt-0.5 truncate max-w-xs" style={{ color: '#888' }}>{listingTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:opacity-70 p-1">
            <X className="w-5 h-5" style={{ color: '#888' }} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#7ecfc0' }} />
            </div>
          ) : (
            <>
              {/* Existing blocked ranges */}
              <div>
                <p className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: '#888' }}>Blocked Dates</p>
                {blockedRanges.length === 0 ? (
                  <p className="text-sm py-4 text-center" style={{ color: '#aaa' }}>No blocked dates — your listing is fully available</p>
                ) : (
                  <div className="space-y-2">
                    {blockedRanges.map((range, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-4 py-3 rounded-xl"
                        style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium" style={{ color: '#2b2b2b' }}>
                            {formatDate(range.start)} — {formatDate(range.end)}
                          </p>
                          {range.reason && (
                            <p className="text-xs mt-0.5 truncate" style={{ color: '#888' }}>{range.reason}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveRange(i)}
                          disabled={saving}
                          className="ml-3 flex-shrink-0 hover:opacity-70 transition-opacity disabled:opacity-40"
                        >
                          <X className="w-4 h-4" style={{ color: '#dc2626' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add new blocked range */}
              <div className="rounded-xl p-5" style={{ backgroundColor: '#f8f8f5', border: '1px solid #e0e0d8' }}>
                <p className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: '#888' }}>Block New Dates</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: '#555' }}>From</label>
                    <input
                      type="date"
                      value={newStart}
                      onChange={e => setNewStart(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                      style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', color: '#2b2b2b' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: '#555' }}>To</label>
                    <input
                      type="date"
                      value={newEnd}
                      onChange={e => setNewEnd(e.target.value)}
                      min={newStart || new Date().toISOString().split('T')[0]}
                      className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                      style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', color: '#2b2b2b' }}
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#555' }}>Reason (optional)</label>
                  <input
                    type="text"
                    value={newReason}
                    onChange={e => setNewReason(e.target.value)}
                    placeholder="e.g. Maintenance, Seasonal closure, Personal use"
                    className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                    style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', color: '#2b2b2b' }}
                  />
                </div>

                {error && (
                  <p className="text-xs mb-3" style={{ color: '#dc2626' }}>{error}</p>
                )}

                <button
                  onClick={handleAddRange}
                  disabled={saving || !newStart || !newEnd}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: '#2b2b2b', color: '#fff' }}
                >
                  {saving
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Plus className="w-4 h-4" />
                  }
                  Block These Dates
                </button>
              </div>

              {saved && (
                <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <CheckCircle className="w-4 h-4" style={{ color: '#16a34a' }} />
                  <span style={{ color: '#16a34a' }}>Availability saved</span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl text-sm font-medium hover:opacity-80 transition-opacity"
            style={{ backgroundColor: '#f8f8f5', border: '1px solid #e0e0d8', color: '#555' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
