import { useId } from 'react'

/**
 * Original CSS/SVG climate-domain illustrations.
 * These are editorial visuals, not NASA imagery or charts of real values.
 */

function EarthArt({ uid }) {
  return (
    <svg viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice" role="presentation">
      <defs>
        <radialGradient id={`earth-bg-${uid}`} cx="72%" cy="22%" r="90%">
          <stop offset="0%" stopColor="#123a5e" />
          <stop offset="48%" stopColor="#071a35" />
          <stop offset="100%" stopColor="#020610" />
        </radialGradient>
        <radialGradient id={`earth-ocean-${uid}`} cx="34%" cy="26%" r="78%">
          <stop offset="0%" stopColor="#bae6fd" />
          <stop offset="28%" stopColor="#38bdf8" />
          <stop offset="60%" stopColor="#0284c7" />
          <stop offset="82%" stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#081733" />
        </radialGradient>
        <linearGradient id={`earth-land-${uid}`} x1="20%" y1="12%" x2="86%" y2="90%">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="48%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#14532d" />
        </linearGradient>
        <radialGradient id={`earth-shadow-${uid}`} cx="30%" cy="24%" r="80%">
          <stop offset="54%" stopColor="#020617" stopOpacity="0" />
          <stop offset="82%" stopColor="#020617" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#020617" stopOpacity="0.92" />
        </radialGradient>
        <radialGradient id={`earth-cloud-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f8fafc" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#f8fafc" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`earth-clip-${uid}`}>
          <circle cx="340" cy="208" r="150" />
        </clipPath>
      </defs>

      <rect width="600" height="400" fill={`url(#earth-bg-${uid})`} />
      <g fill="#e0f2fe">
        <circle cx="72" cy="62" r="1.8" opacity="0.8" />
        <circle cx="145" cy="116" r="1" opacity="0.55" />
        <circle cx="490" cy="52" r="1.5" opacity="0.7" />
        <circle cx="548" cy="142" r="1" opacity="0.5" />
        <circle cx="92" cy="254" r="1.2" opacity="0.6" />
        <circle cx="228" cy="62" r="0.9" opacity="0.5" />
        <circle cx="530" cy="306" r="1.4" opacity="0.6" />
        <circle cx="468" cy="360" r="0.9" opacity="0.45" />
      </g>

      <ellipse
        cx="340"
        cy="208"
        rx="214"
        ry="92"
        fill="none"
        stroke="#67e8f9"
        strokeOpacity="0.18"
        transform="rotate(-16 340 208)"
      />
      <circle cx="340" cy="208" r="158" fill="none" stroke="#67e8f9" strokeOpacity="0.18" />
      <circle cx="340" cy="208" r="150" fill={`url(#earth-ocean-${uid})`} />

      <g clipPath={`url(#earth-clip-${uid})`}>
        <g fill={`url(#earth-land-${uid})`}>
          <path d="M235 128c19-28 54-43 84-37 19 4 28 20 16 34-11 13-31 15-41 27-11 14-6 28-19 37-16 12-38 4-46-13-7-15-3-33 6-48z" />
          <path d="M286 235c14-9 34-4 42 11 7 14 1 34-11 44-10 8-24 8-33-1-10-10-8-25-6-36 2-8 3-14 8-18z" />
          <path d="M363 130c24-10 51-2 61 18 7 15 1 32-14 36-15 4-30-5-42 5-11 9-7 24-19 29-14 6-28-5-28-21 0-22 18-56 42-67z" />
          <path d="M393 221c18-7 38 3 45 21 6 17-3 37-21 42-15 4-29-5-34-19-6-15-4-35 10-44z" />
        </g>
        <g fill={`url(#earth-cloud-${uid})`} opacity="0.72">
          <ellipse cx="267" cy="139" rx="52" ry="12" transform="rotate(-12 267 139)" />
          <ellipse cx="412" cy="170" rx="60" ry="11" transform="rotate(10 412 170)" />
          <ellipse cx="292" cy="296" rx="42" ry="9" transform="rotate(18 292 296)" />
          <ellipse cx="390" cy="319" rx="66" ry="9" transform="rotate(-7 390 319)" />
        </g>
        <circle cx="340" cy="208" r="150" fill={`url(#earth-shadow-${uid})`} />
      </g>

      <circle cx="340" cy="208" r="151" fill="none" stroke="#bae6fd" strokeOpacity="0.42" />
      <circle cx="340" cy="208" r="162" fill="none" stroke="#38bdf8" strokeOpacity="0.14" strokeWidth="7" />
      <circle cx="522" cy="84" r="26" fill="#fbbf24" opacity="0.9" />
      <circle cx="522" cy="84" r="45" fill="#fbbf24" opacity="0.16" />
    </svg>
  )
}

function SunArt({ uid }) {
  const rays = Array.from({ length: 18 }, (_, index) => {
    const angle = (index / 18) * Math.PI * 2
    const inner = 96
    const outer = index % 2 === 0 ? 168 : 142
    return {
      x1: 300 + Math.cos(angle) * inner,
      y1: 192 + Math.sin(angle) * inner,
      x2: 300 + Math.cos(angle) * outer,
      y2: 192 + Math.sin(angle) * outer,
      opacity: index % 2 === 0 ? 0.5 : 0.24,
    }
  })

  return (
    <svg viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice" role="presentation">
      <defs>
        <radialGradient id={`sun-bg-${uid}`} cx="50%" cy="45%" r="75%">
          <stop offset="0%" stopColor="#2a1608" />
          <stop offset="44%" stopColor="#110b0a" />
          <stop offset="100%" stopColor="#02040b" />
        </radialGradient>
        <radialGradient id={`sun-halo-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.75" />
          <stop offset="42%" stopColor="#fb923c" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#fb923c" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`sun-core-${uid}`} cx="38%" cy="34%" r="70%">
          <stop offset="0%" stopColor="#fffbe8" />
          <stop offset="24%" stopColor="#fde68a" />
          <stop offset="54%" stopColor="#fbbf24" />
          <stop offset="80%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#b91c1c" />
        </radialGradient>
      </defs>

      <rect width="600" height="400" fill={`url(#sun-bg-${uid})`} />
      <circle cx="300" cy="192" r="230" fill={`url(#sun-halo-${uid})`} />
      <g stroke="#fbbf24" strokeWidth="2" strokeLinecap="round">
        {rays.map((ray, index) => (
          <line
            key={index}
            x1={ray.x1}
            y1={ray.y1}
            x2={ray.x2}
            y2={ray.y2}
            opacity={ray.opacity}
          />
        ))}
      </g>
      <circle cx="300" cy="192" r="108" fill="none" stroke="#fbbf24" strokeOpacity="0.18" strokeDasharray="4 10" />
      <circle cx="300" cy="192" r="78" fill={`url(#sun-core-${uid})`} />
      <circle cx="300" cy="192" r="78" fill="none" stroke="#fff7d6" strokeOpacity="0.55" />

      <g fill="none" strokeLinecap="round">
        <path d="M88 316c88 26 176 38 282 30 63-5 110-17 152-34" stroke="#fb923c" strokeOpacity="0.25" strokeWidth="2" />
        <path d="M68 342c106 22 204 28 306 19 66-6 116-18 160-34" stroke="#fbbf24" strokeOpacity="0.18" strokeWidth="1.5" />
      </g>
      <circle cx="494" cy="306" r="38" fill="#0ea5e9" opacity="0.75" />
      <circle cx="494" cy="306" r="45" fill="none" stroke="#67e8f9" strokeOpacity="0.28" />
    </svg>
  )
}

function WarmingArt({ uid }) {
  return (
    <svg viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice" role="presentation">
      <defs>
        <linearGradient id={`warm-bg-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#08121f" />
          <stop offset="55%" stopColor="#160d16" />
          <stop offset="100%" stopColor="#290c0b" />
        </linearGradient>
        <linearGradient id={`warm-mercury-${uid}`} x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="28%" stopColor="#fbbf24" />
          <stop offset="58%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
        <linearGradient id={`warm-glow-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0.08" />
        </linearGradient>
      </defs>

      <rect width="600" height="400" fill={`url(#warm-bg-${uid})`} />
      <rect width="600" height="400" fill={`url(#warm-glow-${uid})`} />

      <g opacity="0.5">
        {Array.from({ length: 34 }, (_, index) => (
          <rect
            key={index}
            x={78 + index * 13}
            y={0}
            width="7"
            height="400"
            fill="#fb923c"
            opacity={0.05 + (index / 34) * 0.22}
          />
        ))}
      </g>

      <g transform="translate(196 60)">
        <rect x="48" y="0" width="44" height="228" rx="22" fill="#0f172a" stroke="#f8fafc" strokeOpacity="0.16" />
        <rect x="60" y="24" width="20" height="182" rx="10" fill={`url(#warm-mercury-${uid})`} />
        <circle cx="70" cy="248" r="54" fill="#0f172a" stroke="#f8fafc" strokeOpacity="0.16" />
        <circle cx="70" cy="248" r="37" fill={`url(#warm-mercury-${uid})`} />
        <g stroke="#f8fafc" strokeOpacity="0.32" strokeWidth="2" strokeLinecap="round">
          <path d="M102 52h20M102 82h14M102 112h20M102 142h14M102 172h20" />
        </g>
      </g>

      <g fill="none" strokeLinecap="round">
        <path d="M330 118c28-24 58-24 86 0s58 24 86 0" stroke="#fbbf24" strokeOpacity="0.48" strokeWidth="3" />
        <path d="M330 158c28-24 58-24 86 0s58 24 86 0" stroke="#fb923c" strokeOpacity="0.38" strokeWidth="3" />
        <path d="M330 198c28-24 58-24 86 0s58 24 86 0" stroke="#f97316" strokeOpacity="0.3" strokeWidth="3" />
      </g>

      <circle cx="474" cy="86" r="36" fill="#ef4444" opacity="0.18" />
      <circle cx="474" cy="86" r="14" fill="#fb923c" opacity="0.65" />
    </svg>
  )
}

function OceanArt({ uid }) {
  return (
    <svg viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice" role="presentation">
      <defs>
        <linearGradient id={`ocean-bg-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#061a32" />
          <stop offset="54%" stopColor="#05243c" />
          <stop offset="100%" stopColor="#03101e" />
        </linearGradient>
        <linearGradient id={`ocean-wave-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.1" />
          <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.12" />
        </linearGradient>
        <linearGradient id={`ice-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f0f9ff" />
          <stop offset="52%" stopColor="#bae6fd" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.45" />
        </linearGradient>
      </defs>

      <rect width="600" height="400" fill={`url(#ocean-bg-${uid})`} />
      <circle cx="470" cy="82" r="42" fill="#fbbf24" opacity="0.72" />
      <circle cx="470" cy="82" r="72" fill="#fbbf24" opacity="0.08" />

      <g fill="none" stroke={`url(#ocean-wave-${uid})`} strokeWidth="3" strokeLinecap="round">
        <path d="M-20 156c56-32 112-32 168 0s112 32 168 0 112-32 168 0 112 32 168 0" />
        <path d="M-20 208c56-32 112-32 168 0s112 32 168 0 112-32 168 0 112 32 168 0" opacity="0.75" />
        <path d="M-20 260c56-32 112-32 168 0s112 32 168 0 112-32 168 0 112 32 168 0" opacity="0.55" />
        <path d="M-20 312c56-32 112-32 168 0s112 32 168 0 112-32 168 0 112 32 168 0" opacity="0.34" />
      </g>

      <g fill={`url(#ice-${uid})`}>
        <path d="M66 102l62-28 74 20 26 48-56 31-78-14-37-37z" opacity="0.92" />
        <path d="M156 64l44-20 54 16 12 34-48 17-50-14z" opacity="0.7" />
        <path d="M418 244l48-20 57 17 13 33-46 18-55-12z" opacity="0.82" />
        <path d="M78 216l28-12 33 10 7 23-29 11-31-9z" opacity="0.58" />
      </g>

      <g stroke="#e0f2fe" strokeOpacity="0.38" fill="none">
        <path d="M66 102l62-28 74 20 26 48-56 31-78-14-37-37z" />
        <path d="M418 244l48-20 57 17 13 33-46 18-55-12z" />
      </g>
    </svg>
  )
}

const ART = {
  earth: EarthArt,
  sun: SunArt,
  warming: WarmingArt,
  ocean: OceanArt,
}

export default function ClimateVisual({
  variant,
  kicker,
  title,
  description,
  badge = 'Original illustration',
}) {
  const uid = useId().replace(/:/g, '')
  const Art = ART[variant] ?? EarthArt

  return (
    <article className={`climate-visual climate-visual--${variant}`}>
      <div className="climate-visual-art" aria-hidden="true">
        <Art uid={uid} />
      </div>
      <div className="climate-visual-copy">
        <span className="climate-visual-kicker">{kicker}</span>
        <h3>{title}</h3>
        <p>{description}</p>
        <span className="climate-visual-badge">{badge}</span>
      </div>
    </article>
  )
}
