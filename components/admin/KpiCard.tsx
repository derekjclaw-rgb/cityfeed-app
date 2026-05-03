interface KpiCardProps {
  label: string
  value: string
  sub?: string
  accent?: boolean
}

export default function KpiCard({ label, value, sub, accent }: KpiCardProps) {
  return (
    <div
      className="rounded-xl p-5 border"
      style={{
        background: accent ? '#debb7315' : '#2b2b2b',
        borderColor: accent ? '#debb7340' : '#3a3a3a',
      }}
    >
      <div className="text-xs font-medium mb-2" style={{ color: '#888' }}>
        {label}
      </div>
      <div className="text-2xl font-bold" style={{ color: accent ? '#debb73' : '#fff' }}>
        {value}
      </div>
      {sub && (
        <div className="text-xs mt-1" style={{ color: '#666' }}>
          {sub}
        </div>
      )}
    </div>
  )
}
