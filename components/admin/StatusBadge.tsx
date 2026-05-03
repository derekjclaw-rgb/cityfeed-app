const COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#f59e0b20', text: '#f59e0b' },
  confirmed: { bg: '#3b82f620', text: '#60a5fa' },
  completed: { bg: '#22c55e20', text: '#4ade80' },
  cancelled: { bg: '#ef444420', text: '#f87171' },
  pop_pending: { bg: '#7ecfc020', text: '#7ecfc0' },
  active: { bg: '#22c55e20', text: '#4ade80' },
  inactive: { bg: '#6b728020', text: '#9ca3af' },
}

export default function StatusBadge({ status }: { status: string }) {
  const color = COLORS[status] ?? COLORS.pending
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide"
      style={{ background: color.bg, color: color.text }}
    >
      {status.replace(/_/g, ' ')}
    </span>
  )
}
