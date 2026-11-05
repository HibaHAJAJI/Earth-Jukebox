export default function EarthVisual() {
  return (
    <div className="earth-visual" aria-hidden="true">
      <div className="earth-halo" />
      <div className="earth-orbit earth-orbit--outer">
        <span className="orbit-node orbit-node--one" />
      </div>
      <div className="earth-orbit earth-orbit--inner">
        <span className="orbit-node orbit-node--two" />
      </div>
      <div className="earth-sphere">
        <span className="earth-land earth-land--one" />
        <span className="earth-land earth-land--two" />
        <span className="earth-land earth-land--three" />
        <span className="earth-cloud earth-cloud--one" />
        <span className="earth-cloud earth-cloud--two" />
        <span className="earth-shine" />
      </div>
      <div className="earth-chip earth-chip--source">
        <span className="earth-chip-dot" />
        GISTEMP v4
      </div>
      <div className="earth-chip earth-chip--baseline">
        <span className="earth-chip-label">BASELINE</span>
        1951–1980
      </div>
      <div className="earth-chip earth-chip--range">
        <span className="earth-chip-label">RECORD</span>
        1880 → present
      </div>
    </div>
  )
}
