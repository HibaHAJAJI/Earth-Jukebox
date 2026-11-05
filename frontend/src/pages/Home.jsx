import { Link } from 'react-router-dom'
import {
  ArrowRight,
  AudioWaveform,
  ChevronDown,
  Database,
  Headphones,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import EarthVisual from '../components/EarthVisual'
import FeatureCard from '../components/FeatureCard'

const FEATURES = [
  {
    icon: Database,
    number: '01',
    title: 'Explore NASA Data',
    description:
      'Navigate decades of Earth observations through a clear, interactive scientific timeline.',
    accent: 'cyan',
  },
  {
    icon: AudioWaveform,
    number: '02',
    title: 'Experience Data Through Sound',
    description:
      'Hear patterns that are difficult to notice in a chart, with an audio layer built for accessible exploration.',
    accent: 'indigo',
  },
  {
    icon: TrendingUp,
    number: '03',
    title: "Discover Earth's Changes",
    description:
      'Follow monthly temperature anomalies and see how each reading relates to a shared climate baseline.',
    accent: 'violet',
  },
]

const STEPS = [
  {
    icon: Database,
    label: 'Observe',
    title: 'NASA Earth data',
    text: 'Monthly temperature anomalies from GISTEMP v4 are organized into a single time series.',
  },
  {
    icon: SlidersHorizontal,
    label: 'Translate',
    title: 'Data becomes sound',
    text: 'Each value is mapped to musical parameters by the sonification engine, preserving scientific order.',
  },
  {
    icon: Headphones,
    label: 'Listen',
    title: 'Hear the pattern',
    text: 'A synchronized timeline connects the selected month, the chart and the sound experience.',
  },
]

export default function Home() {
  return (
    <main id="main-content">
      <section className="hero">
        <div className="hero-grid-bg" aria-hidden="true" />
        <div className="hero-stars" aria-hidden="true" />
        <div className="container hero-inner">
          <div className="hero-copy">
            <span className="hero-badge">
              <Sparkles size={14} aria-hidden="true" />
              NASA Space Apps Challenge 2026
            </span>
            <h1>
              Listen to the <span className="gradient-text">Story of Our Planet</span>
            </h1>
            <p className="hero-lede">
              Earth Symphony turns NASA Earth observations into an interactive visual and sonic
              journey. Explore the planet&apos;s temperature record one month at a time.
            </p>
            <div className="hero-actions">
              <Link className="button button--primary button--large" to="/explore">
                Explore Earth
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <a className="button button--ghost button--large" href="#how-it-works">
                Discover How It Works
                <ChevronDown size={17} aria-hidden="true" />
              </a>
            </div>
            <dl className="hero-stats">
              <div>
                <dt>Phenomenon</dt>
                <dd>Surface temperature anomaly</dd>
              </div>
              <div>
                <dt>Frequency</dt>
                <dd>Monthly · 1880 onward</dd>
              </div>
              <div>
                <dt>Reference</dt>
                <dd>1951–1980 baseline</dd>
              </div>
            </dl>
          </div>
          <EarthVisual />
        </div>
      </section>

      <section className="section how-section" id="how-it-works" aria-labelledby="how-heading">
        <div className="container">
          <div className="section-heading section-heading--center">
            <p className="eyebrow">From data to sound</p>
            <h2 id="how-heading">Science you can see. Patterns you can hear.</h2>
            <p>
              Sonification translates scientific measurements into sound. Combined with a chart,
              it creates a second way to notice magnitude, rhythm and long-term change.
            </p>
          </div>

          <div className="process-grid">
            {STEPS.map((step, index) => (
              <article className="process-step" key={step.title}>
                <span className="process-index" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="process-icon" aria-hidden="true">
                  <step.icon size={23} strokeWidth={1.8} />
                </span>
                <span className="process-label">{step.label}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>

          <div className="how-note">
            <span className="how-note-icon" aria-hidden="true">
              <AudioWaveform size={20} />
            </span>
            <p>
              <strong>Sound does not replace the science.</strong> The chart remains the primary
              scientific reference. Audio is an additional layer designed to make patterns more
              accessible to different audiences and learning styles.
            </p>
            <Link to="/about">
              Read about the approach
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="section features-section" aria-labelledby="features-heading">
        <div className="container">
          <div className="section-heading">
            <p className="eyebrow">A new way to explore</p>
            <h2 id="features-heading">Three ways into the same scientific record</h2>
            <p>
              Earth Symphony is designed as a shared instrument for scientists, students and
              curious listeners.
            </p>
          </div>

          <div className="features-grid">
            {FEATURES.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      <section className="section cta-section">
        <div className="container">
          <div className="cta-panel">
            <div className="cta-glow" aria-hidden="true" />
            <p className="eyebrow">Open the explorer</p>
            <h2>Start with a month. Follow the whole story.</h2>
            <p>
              Move through 140+ years of monthly readings, inspect the selected anomaly and see
              where the sonification layer will connect.
            </p>
            <div className="cta-actions">
              <Link className="button button--primary button--large" to="/explore">
                Explore the temperature record
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link className="button button--ghost button--large" to="/about">
                About the project
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
