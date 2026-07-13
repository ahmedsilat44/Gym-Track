export default function ProgressRing({ value, size = 64, label = `${Math.round(value)}%`, color = 'var(--primary)' }) {
  const radius = 25
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.max(0, Math.min(100, value)) / 100) * circumference
  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 60 60" aria-hidden="true">
        <circle className="ring-track" cx="30" cy="30" r={radius} />
        <circle className="ring-value" cx="30" cy="30" r={radius} style={{ stroke: color, strokeDasharray: circumference, strokeDashoffset: offset }} />
      </svg>
      <span>{label}</span>
    </div>
  )
}
