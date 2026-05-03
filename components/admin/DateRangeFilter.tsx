'use client'

import { useState } from 'react'
import { Calendar } from 'lucide-react'

export type DateRange = {
  label: string
  startDate: string | null // ISO date string or null for all time
  endDate: string | null
}

const PRESETS = [
  { label: 'All time', value: 'all' },
  { label: 'This week', value: 'week' },
  { label: 'This month', value: 'month' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
  { label: 'Custom', value: 'custom' },
]

function getPresetRange(value: string): { start: string | null; end: string | null } {
  const now = new Date()
  const today = now.toISOString().split('T')[0]

  switch (value) {
    case 'week': {
      const day = now.getDay()
      const diff = day === 0 ? 6 : day - 1 // Monday start
      const start = new Date(now)
      start.setDate(now.getDate() - diff)
      return { start: start.toISOString().split('T')[0], end: today }
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      return { start: start.toISOString().split('T')[0], end: today }
    }
    case '30d': {
      const start = new Date(now)
      start.setDate(now.getDate() - 30)
      return { start: start.toISOString().split('T')[0], end: today }
    }
    case '90d': {
      const start = new Date(now)
      start.setDate(now.getDate() - 90)
      return { start: start.toISOString().split('T')[0], end: today }
    }
    default:
      return { start: null, end: null }
  }
}

interface Props {
  onChange: (range: DateRange) => void
  current: DateRange
}

export default function DateRangeFilter({ onChange, current }: Props) {
  const [preset, setPreset] = useState('all')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  function handlePreset(value: string) {
    setPreset(value)
    if (value === 'custom') return
    const range = getPresetRange(value)
    onChange({
      label: PRESETS.find(p => p.value === value)?.label ?? value,
      startDate: range.start,
      endDate: range.end,
    })
  }

  function handleCustomApply() {
    if (!customStart || !customEnd) return
    onChange({
      label: `${customStart} → ${customEnd}`,
      startDate: customStart,
      endDate: customEnd,
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Calendar className="w-4 h-4" style={{ color: '#888' }} />
      {PRESETS.map(p => (
        <button
          key={p.value}
          onClick={() => handlePreset(p.value)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{
            background: preset === p.value ? '#debb7330' : '#2b2b2b',
            color: preset === p.value ? '#debb73' : '#aaa',
            border: `1px solid ${preset === p.value ? '#debb7350' : '#3a3a3a'}`,
          }}
        >
          {p.label}
        </button>
      ))}
      {preset === 'custom' && (
        <div className="flex items-center gap-2 ml-2">
          <input
            type="date"
            value={customStart}
            onChange={e => setCustomStart(e.target.value)}
            className="px-2 py-1.5 rounded-lg text-xs outline-none"
            style={{ background: '#2b2b2b', color: '#ccc', border: '1px solid #3a3a3a' }}
          />
          <span style={{ color: '#666' }}>→</span>
          <input
            type="date"
            value={customEnd}
            onChange={e => setCustomEnd(e.target.value)}
            className="px-2 py-1.5 rounded-lg text-xs outline-none"
            style={{ background: '#2b2b2b', color: '#ccc', border: '1px solid #3a3a3a' }}
          />
          <button
            onClick={handleCustomApply}
            disabled={!customStart || !customEnd}
            className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
            style={{ background: '#debb73', color: '#2b2b2b' }}
          >
            Apply
          </button>
        </div>
      )}
      {current.startDate && (
        <span className="text-xs ml-2" style={{ color: '#666' }}>
          Showing: {current.label}
        </span>
      )}
    </div>
  )
}
