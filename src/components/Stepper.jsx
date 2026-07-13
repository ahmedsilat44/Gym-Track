import { Minus, Plus } from 'lucide-react'

export default function Stepper({ label, value, onChange, step = 1, min = 0, suffix, decimals = 0 }) {
  const change = (direction) => {
    const next = Math.max(min, Number(value) + step * direction)
    onChange(Number(next.toFixed(decimals)))
  }

  return (
    <div className="stepper">
      <span className="eyebrow">{label}</span>
      <div className="stepper-controls">
        <button onClick={() => change(-1)} aria-label={`Decrease ${label}`}><Minus /></button>
        <div className="stepper-value"><strong>{Number(value).toFixed(decimals)}</strong><span>{suffix}</span></div>
        <button onClick={() => change(1)} aria-label={`Increase ${label}`}><Plus /></button>
      </div>
    </div>
  )
}
