'use client'

/**
 * DateRangePicker — Phase 5b
 * Pure React date range picker, no external dependencies.
 * Brand colors: mint #7ecfc0, cream #f0f0ec, charcoal #2b2b2b
 *
 * Usage:
 *   <DateRangePicker
 *     startDate={startDate}
 *     endDate={endDate}
 *     onChange={(start, end) => { setStartDate(start); setEndDate(end) }}
 *   />
 *
 * Props:
 *   inline   — render calendar always-visible (no dropdown trigger)
 *   minDate  — earliest selectable date (YYYY-MM-DD), defaults to today
 */

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react'

// ─── Helpers ───────────────────────────────────────────────────────────────────

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function formatDisplay(dateStr: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function daysBetween(start: string, end: string): number {
  if (!start || !end) return 0
  const [sy, sm, sd] = start.split('-').map(Number)
  const [ey, em, ed] = end.split('-').map(Number)
  return Math.max(
    0,
    Math.ceil(
      (new Date(ey, em - 1, ed).getTime() - new Date(sy, sm - 1, sd).getTime()) / 86400000
    )
  )
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

// ─── Calendar Grid ─────────────────────────────────────────────────────────────

export interface DisabledRange {
  start: string // YYYY-MM-DD
  end: string   // YYYY-MM-DD
}

interface GridProps {
  year: number
  month: number // 0-indexed
  startDate: string
  endDate: string
  hoverDate: string
  minDate: string
  disabledRanges?: DisabledRange[]
  onSelect: (d: string) => void
  onHover: (d: string) => void
}

function isInDisabledRange(ds: string, ranges: DisabledRange[]): boolean {
  return ranges.some(r => ds >= r.start && ds <= r.end)
}

function CalendarGrid({ year, month, startDate, endDate, hoverDate, minDate, disabledRanges = [], onSelect, onHover }: GridProps) {
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date().toISOString().split('T')[0]

  // Preview range end: hoverDate when we have start but no end yet
  const rangeEnd = startDate && !endDate && hoverDate >= startDate ? hoverDate : endDate

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div>
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-xs font-medium py-1.5" style={{ color: '#aaa' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} className="h-9" />
          const ds = toDateStr(year, month, day)
          const isBooked = isInDisabledRange(ds, disabledRanges)
          const disabled = ds < minDate || isBooked
          const isStart = ds === startDate
          const isEnd = ds === endDate
          const inRange = !!(startDate && rangeEnd && ds > startDate && ds < rangeEnd)
          const isToday = ds === today

          return (
            <div
              key={ds}
              style={{ backgroundColor: inRange ? 'rgba(126,207,192,0.13)' : 'transparent' }}
              title={isBooked ? 'Booked' : undefined}
            >
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelect(ds)}
                onMouseEnter={() => !disabled && onHover(ds)}
                className="w-full h-9 flex items-center justify-center text-xs rounded-full transition-colors relative"
                style={{
                  backgroundColor: isBooked
                    ? 'rgba(230,57,70,0.08)'
                    : (isStart || isEnd) ? '#7ecfc0' : undefined,
                  color: isBooked
                    ? '#dc2626'
                    : disabled
                      ? '#d0d0c8'
                      : (isStart || isEnd)
                        ? '#fff'
                        : isToday
                          ? '#7ecfc0'
                          : '#2b2b2b',
                  fontWeight: (isStart || isEnd || isToday) ? '600' : '400',
                  border: isToday && !isStart && !isEnd ? '1px solid #7ecfc0' : 'none',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  textDecoration: isBooked ? 'line-through' : 'none',
                  opacity: isBooked ? 0.6 : 1,
                }}
              >
                {day}
              </button>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      {disabledRanges.length > 0 && (
        <div className="mt-2 flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(230,57,70,0.15)', border: '1px solid rgba(230,57,70,0.3)' }} />
          <span className="text-xs" style={{ color: '#888' }}>Booked / Unavailable</span>
        </div>
      )}
    </div>
  )
}

// ─── Date Range Picker ─────────────────────────────────────────────────────────

export interface DateRangePickerProps {
  startDate: string
  endDate: string
  onChange: (start: string, end: string) => void
  minDate?: string
  inline?: boolean
  placeholder?: string
  disabledRanges?: DisabledRange[]
}

export default function DateRangePicker({
  startDate,
  endDate,
  onChange,
  minDate,
  inline = false,
  placeholder = 'Select dates',
  disabledRanges = [],
}: DateRangePickerProps) {
  const todayStr = new Date().toISOString().split('T')[0]
  const effectiveMin = minDate ?? todayStr

  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [hoverDate, setHoverDate] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (inline) return
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setHoverDate('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [inline])

  function handleSelect(ds: string) {
    // Don't allow selecting a booked date
    if (isInDisabledRange(ds, disabledRanges)) return

    if (!startDate || (startDate && endDate)) {
      // Start fresh selection
      onChange(ds, '')
    } else {
      // We have start but no end
      if (ds > startDate) {
        // Check if the range crosses any booked dates — if so, block it
        const crossesBooked = disabledRanges.some(r => r.start <= ds && r.end >= startDate)
        if (crossesBooked) {
          // Restart selection from this date
          onChange(ds, '')
        } else {
          onChange(startDate, ds)
          if (!inline) setOpen(false)
        }
      } else if (ds < startDate) {
        // Clicked before start → new start
        onChange(ds, '')
      } else {
        // Same day → reset
        onChange('', '')
      }
    }
    setHoverDate('')
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const days = daysBetween(startDate, endDate)
  const rangeLabel = startDate && endDate
    ? `${formatDisplay(startDate)} → ${formatDisplay(endDate)} (${days} day${days !== 1 ? 's' : ''})`
    : startDate
      ? `${formatDisplay(startDate)} → pick end date`
      : ''

  const calendarPanel = (
    <div
      className="p-4"
      style={{
        backgroundColor: '#fff',
        borderRadius: inline ? '16px' : undefined,
        minWidth: '300px',
      }}
    >
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" style={{ color: '#2b2b2b' }} />
        </button>
        <span className="text-sm font-semibold" style={{ color: '#2b2b2b' }}>
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <ChevronRight className="w-4 h-4" style={{ color: '#2b2b2b' }} />
        </button>
      </div>

      <CalendarGrid
        year={viewYear}
        month={viewMonth}
        startDate={startDate}
        endDate={endDate}
        hoverDate={hoverDate}
        minDate={effectiveMin}
        disabledRanges={disabledRanges}
        onSelect={handleSelect}
        onHover={setHoverDate}
      />

      {/* Range summary row */}
      <div className="mt-3 pt-3 min-h-[28px]" style={{ borderTop: '1px solid #f0f0ec' }}>
        {rangeLabel ? (
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: '#7ecfc0' }}>
              {rangeLabel}
            </span>
            <button
              type="button"
              onClick={() => onChange('', '')}
              className="text-xs px-2 py-0.5 rounded-lg hover:bg-gray-100 transition-colors"
              style={{ color: '#888' }}
            >
              Clear
            </button>
          </div>
        ) : (
          <span className="text-xs" style={{ color: '#aaa' }}>
            {startDate ? 'Now click an end date' : 'Click a start date to begin'}
          </span>
        )}
      </div>
    </div>
  )

  if (inline) return calendarPanel

  // ── Dropdown mode ──────────────────────────────────────────────────────────
  const triggerLabel =
    startDate && endDate
      ? `${formatDisplay(startDate)} → ${formatDisplay(endDate)}`
      : startDate
        ? `${formatDisplay(startDate)} → pick end date`
        : placeholder

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-left transition-colors"
        style={{
          backgroundColor: '#f8f8f5',
          border: open ? '1px solid #7ecfc0' : '1px solid #e0e0d8',
          color: startDate ? '#2b2b2b' : '#aaa',
        }}
      >
        <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: '#888' }} />
        <span className="flex-1 truncate">{triggerLabel}</span>
        {(startDate || endDate) && (
          <span
            role="button"
            aria-label="Clear dates"
            onClick={e => { e.stopPropagation(); onChange('', '') }}
            className="p-0.5 rounded hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <X className="w-3 h-3" style={{ color: '#888' }} />
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute z-50 mt-2 left-0"
          style={{
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            borderRadius: '16px',
            border: '1px solid #e0e0d8',
            backgroundColor: '#fff',
          }}
        >
          {calendarPanel}
        </div>
      )}
    </div>
  )
}
