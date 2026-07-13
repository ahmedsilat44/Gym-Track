export default function MiniChart({ values, labels, activeIndex = values.length - 1, format = (value) => value }) {
  const max = Math.max(...values, 1)
  return (
    <div className="bar-chart" role="img" aria-label="Performance chart">
      {values.map((value, index) => (
        <div className={`bar-column ${index === activeIndex ? 'active' : ''}`} key={`${labels[index]}-${index}`}>
          {index === activeIndex && <span className="bar-tip">{format(value)}</span>}
          <div className="bar-track"><span style={{ height: `${Math.max(12, (value / max) * 100)}%` }} /></div>
          <small>{labels[index]}</small>
        </div>
      ))}
    </div>
  )
}
