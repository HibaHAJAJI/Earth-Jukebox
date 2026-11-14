import { useId } from 'react'

/**
 * Original CSS/SVG Earth–Sun artwork created for Earth Symphony.
 * It is not NASA imagery and should not be presented as an official
 * scientific visualisation.
 */
export default function CelestialVisual({
  variant = 'hero',
  sourceLabel = 'Earth climate record',
  baseline = '1951–1980',
}) {
  const uid = useId().replace(/:/g, '')
  const oceanId = `celestial-ocean-${uid}`
  const landId = `celestial-land-${uid}`
  const shadowId = `celestial-shadow-${uid}`
  const cloudId = `celestial-cloud-${uid}`
  const clipId = `celestial-clip-${uid}`

  return (
    <div className={`celestial-visual celestial-visual--${variant}`} aria-hidden="true">
      <div className="celestial-stars" />

      <div className="celestial-sun">
        <span className="celestial-sun-rays" />
        <span className="celestial-sun-corona" />
        <span className="celestial-sun-core" />
      </div>

      <div className="celestial-orbit celestial-orbit--outer">
        <span className="celestial-satellite" />
      </div>
      <div className="celestial-orbit celestial-orbit--inner">
        <span className="celestial-satellite celestial-satellite--two" />
      </div>

      <div className="celestial-earth-wrap">
        <svg className="celestial-earth" viewBox="0 0 420 420" role="presentation">
          <defs>
            <radialGradient id={oceanId} cx="34%" cy="27%" r="76%">
              <stop offset="0%" stopColor="#bae6fd" />
              <stop offset="24%" stopColor="#38bdf8" />
              <stop offset="54%" stopColor="#0ea5e9" />
              <stop offset="78%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#081a45" />
            </radialGradient>
            <linearGradient id={landId} x1="30%" y1="15%" x2="80%" y2="90%">
              <stop offset="0%" stopColor="#6ee7b7" />
              <stop offset="46%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#166534" />
            </linearGradient>
            <radialGradient id={shadowId} cx="30%" cy="24%" r="78%">
              <stop offset="52%" stopColor="#020617" stopOpacity="0" />
              <stop offset="82%" stopColor="#020617" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#020617" stopOpacity="0.88" />
            </radialGradient>
            <radialGradient id={cloudId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f8fafc" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#f8fafc" stopOpacity="0" />
            </radialGradient>
            <clipPath id={clipId}>
              <circle cx="210" cy="210" r="170" />
            </clipPath>
          </defs>

          <circle cx="210" cy="210" r="178" fill="none" stroke="#67e8f9" strokeOpacity="0.18" />
          <circle cx="210" cy="210" r="170" fill={`url(#${oceanId})`} />

          <g clipPath={`url(#${clipId})`}>
            <g stroke="#bae6fd" strokeOpacity="0.1" fill="none">
              <ellipse cx="210" cy="210" rx="170" ry="66" />
              <ellipse cx="210" cy="210" rx="170" ry="118" />
              <ellipse cx="210" cy="210" rx="66" ry="170" />
              <ellipse cx="210" cy="210" rx="118" ry="170" />
              <path d="M40 210h340M210 40v340" />
            </g>

            <g fill={`url(#${landId})`}>
              <path d="M92 132c18-31 54-50 89-47 21 2 33 16 24 33-7 13-27 15-37 27-10 13-5 28-17 37-18 13-42 8-52-10-9-17-16-25-7-40z" />
              <path d="M137 221c16-8 35-3 43 12 7 14 4 33-7 47-7 9-20 15-31 10-12-5-16-19-14-32 2-14 1-28 9-37z" />
              <path d="M228 116c24-13 56-8 70 12 9 13 6 31-9 37-17 7-35-4-49 6-12 9-9 27-22 32-17 7-31-7-31-25 0-24 17-50 41-62z" />
              <path d="M261 214c21-9 47 2 55 22 8 20-3 44-24 51-17 6-34-3-41-19-8-17-8-41 10-54z" />
              <path d="M295 309c12-7 27-2 31 11 4 12-3 25-15 28-12 3-24-5-25-17-1-9 3-17 9-22z" />
            </g>

            <g fill={`url(#${cloudId})`} opacity="0.74">
              <ellipse cx="137" cy="119" rx="57" ry="14" transform="rotate(-12 137 119)" />
              <ellipse cx="293" cy="176" rx="66" ry="12" transform="rotate(11 293 176)" />
              <ellipse cx="162" cy="287" rx="49" ry="11" transform="rotate(19 162 287)" />
              <ellipse cx="264" cy="322" rx="74" ry="10" transform="rotate(-8 264 322)" />
            </g>

            <circle cx="210" cy="210" r="170" fill={`url(#${shadowId})`} />
          </g>

          <circle cx="210" cy="210" r="171" fill="none" stroke="#bae6fd" strokeOpacity="0.46" strokeWidth="1.5" />
          <circle cx="210" cy="210" r="184" fill="none" stroke="#38bdf8" strokeOpacity="0.16" strokeWidth="6" />
        </svg>
      </div>

      <div className="celestial-chip celestial-chip--source">
        <span className="celestial-chip-dot" />
        {sourceLabel}
      </div>
      <div className="celestial-chip celestial-chip--baseline">
        <span className="celestial-chip-label">BASE</span>
        {baseline}
      </div>
      <div className="celestial-chip celestial-chip--range">
        <span className="celestial-chip-label">RECORD</span>
        1880 → present
      </div>
    </div>
  )
}
