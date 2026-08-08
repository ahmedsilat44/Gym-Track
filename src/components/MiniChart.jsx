export default function MiniChart({ values, labels, activeIndex = values.length - 1, format = (value) => value, scrollable = false, ariaLabel = 'Performance chart' }) {
  const max = Math.max(...values, 1)
  return (
    <div className={`bar-chart ${scrollable ? 'scrollable' : ''}`} style={scrollable ? { width: `max(100%, ${values.length * 56}px)` } : undefined} role="img" aria-label={ariaLabel}>
      {values.map((value, index) => (
        <div className={`bar-column ${index === activeIndex ? 'active' : ''}`} key={`${labels[index]}-${index}`}>
          {index === activeIndex && <span className="bar-tip">{format(value)}</span>}
          <div className="bar-track"><span style={{ height: value > 0 ? `${Math.max(6, (value / max) * 100)}%` : '0%' }} /></div>
          <small>{labels[index]}</small>
        </div>
      ))}
    </div>
  )
}
