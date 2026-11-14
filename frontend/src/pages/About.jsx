import { Link } from 'react-router-dom'
import {
  Accessibility,
  ArrowRight,
  AudioLines,
  BookOpen,
  Ear,
  ExternalLink,
  Globe2,
  Layers,
  Rocket,
  Users,
} from 'lucide-react'

const ACCESSIBILITY_POINTS = [
  'Semantic page structure, keyboard-accessible controls and visible focus states.',
  'Scientific values use text, sign and labels in addition to color.',
  'Responsive layouts support desktop, tablet and mobile screens.',
  'Animation is reduced automatically when the user prefers reduced motion.',
]

export default function About() {
  return (
    <main id="main-content" className="about-page">
      <div className="page-orb page-orb--indigo" aria-hidden="true" />
      <div className="page-orb page-orb--cyan about-orb" aria-hidden="true" />

      <div className="container">
        <header className="about-hero">
          <span className="hero-badge hero-badge--static">
            <Globe2 size={14} aria-hidden="true" />
            About Earth Symphony
          </span>
          <h1>A shared instrument for the story of our planet.</h1>
          <p>
            Earth Symphony is an independent hackathon project that brings Earth science data,
            interactive visualization and sonification into one accessible exploration tool.
          </p>
          <div className="hero-actions">
            <Link className="button button--primary button--large" to="/explore">
              Open the explorer
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <a className="button button--ghost button--large" href="#data-sources">
              View data sources
            </a>
          </div>
        </header>

        <section className="about-section" aria-labelledby="mission-heading">
          <div className="about-section-intro">
            <p className="eyebrow">The project</p>
            <h2 id="mission-heading">What is Earth Symphony?</h2>
          </div>
          <div className="about-section-body">
            <p className="about-lead">
              Earth Symphony transforms NASA Earth observations into a visual and audible timeline.
              The first phenomenon is the global surface temperature anomaly, a measure of how a
              month compares with the 1951–1980 reference average.
            </p>
            <div className="about-card-grid">
              <article className="about-card">
                <span className="about-icon" aria-hidden="true">
                  <Layers size={20} />
                </span>
                <h3>One synchronized record</h3>
                <p>
                  A single selected month drives the summary, chart highlight, scientific
                  explanation and the data passed to the future audio engine.
                </p>
              </article>
              <article className="about-card">
                <span className="about-icon" aria-hidden="true">
                  <BookOpen size={20} />
                </span>
                <h3>Science first</h3>
                <p>
                  Scientific context, units, baselines and source attribution stay visible. Audio
                  is an additional interpretation layer, not a replacement for the data.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="about-section" aria-labelledby="sonification-heading">
          <div className="about-section-intro">
            <p className="eyebrow">Why sound</p>
            <h2 id="sonification-heading">What is data sonification?</h2>
          </div>
          <div className="about-section-body">
            <p className="about-lead">
              Sonification maps data values to sound parameters such as pitch, rhythm, duration or
              texture. When the mapping is consistent, listeners can perceive trends, outliers and
              transitions through a second sensory channel.
            </p>
            <div className="about-split">
              <article className="about-highlight">
                <span className="about-icon" aria-hidden="true">
                  <Ear size={21} />
                </span>
                <h3>Patterns beyond the chart</h3>
                <p>
                  Sound can reveal pace, repetition and contrast that may be harder to notice in a
                  dense line chart. It offers another route into the same carefully preserved data.
                </p>
              </article>
              <article className="about-highlight">
                <span className="about-icon" aria-hidden="true">
                  <AudioLines size={21} />
                </span>
                <h3>Designed for integration</h3>
                <p>
                  The frontend exposes a small, documented contract for playback, volume and data
                  updates so the sonification team can connect its engine without duplicating
                  timeline state.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="about-section" aria-labelledby="accessibility-heading" id="accessibility">
          <div className="about-section-intro">
            <p className="eyebrow">Accessibility</p>
            <h2 id="accessibility-heading">More ways to understand the same evidence</h2>
          </div>
          <div className="about-section-body">
            <p className="about-lead">
              Combining visualization and audio can improve scientific accessibility. A chart
              supports spatial comparison, while sound can support non-visual exploration. Together
              they create multiple representations of the same scientific record.
            </p>
            <ul className="accessibility-list">
              {ACCESSIBILITY_POINTS.map((point) => (
                <li key={point}>
                  <Accessibility size={17} aria-hidden="true" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="about-section" aria-labelledby="data-heading" id="data-sources">
          <div className="about-section-intro">
            <p className="eyebrow">Scientific source</p>
            <h2 id="data-heading">NASA GISS GISTEMP v4</h2>
          </div>
          <div className="about-section-body">
            <div className="source-card">
              <div className="source-card-main">
                <span className="about-icon" aria-hidden="true">
                  <Globe2 size={22} />
                </span>
                <div>
                  <h3>Goddard Institute for Space Studies Surface Temperature Analysis</h3>
                  <p>
                    GISTEMP v4 is NASA&apos;s global surface temperature analysis. Earth Symphony
                    is prepared to consume monthly anomaly values in °C using the 1951–1980
                    reference baseline. Missing source values are preserved as gaps and are never
                    converted to zero.
                  </p>
                  <a
                    className="text-link"
                    href="https://data.giss.nasa.gov/gistemp/data_v4.html"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open the official GISTEMP data page
                    <ExternalLink size={14} aria-hidden="true" />
                  </a>
                </div>
              </div>
              <div className="source-card-note">
                <strong>Current status</strong>
                <p>
                  The frontend is wired to consume the verified monthly JSON through a single data
                  service. Until that source is connected, the explorer clearly labels any
                  temporary mock values and never presents them as NASA measurements.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="about-section" aria-labelledby="hackathon-heading" id="hackathon">
          <div className="about-section-intro">
            <p className="eyebrow">Context</p>
            <h2 id="hackathon-heading">NASA Space Apps Challenge 2026</h2>
          </div>
          <div className="about-section-body">
            <div className="hackathon-card">
              <div>
                <span className="about-icon" aria-hidden="true">
                  <Rocket size={21} />
                </span>
                <h3>The Earth Information Jukebox</h3>
                <p>
                  The project responds to a challenge to turn Earth information into a meaningful
                  listening experience. It is built by a multidisciplinary team combining Earth
                  data, sonification and frontend development.
                </p>
              </div>
              <div className="team-roles">
                <span>
                  <Users size={15} aria-hidden="true" />
                  Multidisciplinary hackathon team
                </span>
                <ul>
                  <li>Data preparation and scientific validation</li>
                  <li>Sonification engine and audio mapping</li>
                  <li>Interactive frontend and shared timeline</li>
                </ul>
              </div>
            </div>
            <p className="about-disclaimer">
              Earth Symphony is an independent project. It is not affiliated with, endorsed by, or
              operated by NASA. Generated interface visuals are original project assets, not
              official NASA imagery.
            </p>
          </div>
        </section>

        <section className="cta-section cta-section--about">
          <div className="cta-panel">
            <div className="cta-glow" aria-hidden="true" />
            <p className="eyebrow">Explore the record</p>
            <h2>See the data. Then imagine the sound.</h2>
            <p>
              Open the temperature explorer to move through the timeline and inspect the selected
              anomaly.
            </p>
            <Link className="button button--primary button--large" to="/explore">
              Launch the explorer
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
