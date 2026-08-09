import { useEffect, useRef, useState } from 'react'

const DEFAULT_WIDTH = 680
const HEIGHT = 270
const PADDING = { top: 26, right: 20, bottom: 38, left: 54 }

const compactNumber = (value) => Intl.NumberFormat(undefined, {
  notation: Math.abs(value) >= 10000 ? 'compact' : 'standard',
  maximumFractionDigits: Math.abs(value) >= 100 ? 0 : 1,
}).format(value)

export default function LineChart({ values, labels, ariaLabel = 'Progress over time', formatTick = compactNumber }) {
  const containerRef = useRef(null)
  const [width, setWidth] = useState(DEFAULT_WIDTH)

  useEffect(() => {
    const element = containerRef.current
    if (!element || typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(1, Math.round(entry.contentRect.width))))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const numericValues = values.map((value) => Number(value)).filter(Number.isFinite)
  if (!numericValues.length) return <div className="empty-chart">Not enough data yet</div>

  const rawMin = Math.min(...numericValues)
  const rawMax = Math.max(...numericValues)
  const range = Math.max(rawMax - rawMin, Math.abs(rawMax) * .12, 1)
  const min = Math.max(0, rawMin - range * .12)
  const max = rawMax + range * .12
  const plotWidth = width - PADDING.left - PADDING.right
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom
  const xAt = (index) => values.length === 1 ? PADDING.left + plotWidth / 2 : PADDING.left + (index / (values.length - 1)) * plotWidth
  const yAt = (value) => PADDING.top + (1 - ((Number(value) - min) / (max - min || 1))) * plotHeight
  const points = values.map((value, index) => ({ x: xAt(index), y: yAt(value), value: Number(value), label: labels[index] }))
  const linePath = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ')
  const areaPath = `${linePath} L ${points.at(-1).x} ${PADDING.top + plotHeight} L ${points[0].x} ${PADDING.top + plotHeight} Z`
  const ticks = Array.from({ length: 4 }, (_, index) => min + ((max - min) * index / 3)).reverse()
  const labelStep = Math.max(1, Math.ceil(labels.length / 5))

  return (
    <div className="line-chart" ref={containerRef} role="img" aria-label={ariaLabel}>
      <svg viewBox={`0 0 ${width} ${HEIGHT}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
        {ticks.map((tick) => {
          const y = yAt(tick)
          return <g key={tick}><line className="line-chart-grid" x1={PADDING.left} y1={y} x2={width - PADDING.right} y2={y} /><text className="line-chart-y-label" x={PADDING.left - 10} y={y + 4}>{formatTick(tick)}</text></g>
        })}
        <path className="line-chart-area" d={areaPath} />
        <path className="line-chart-path" d={linePath} />
        {points.map((point, index) => <circle className={`line-chart-point ${index === points.length - 1 ? 'latest' : ''}`} key={`${point.label}-${index}`} cx={point.x} cy={point.y} r={index === points.length - 1 ? 5 : 3.5} />)}
        {points.map((point, index) => (index % labelStep === 0 || index === points.length - 1) && <text className={`line-chart-x-label ${index === points.length - 1 ? 'latest' : ''}`} key={`${point.label}-label`} x={point.x} y={HEIGHT - 12} textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}>{point.label}</text>)}
      </svg>
    </div>
  )
}
