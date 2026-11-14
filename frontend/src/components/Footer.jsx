import { ExternalLink, GitBranch } from 'lucide-react'
import { Link } from 'react-router-dom'
import Logo from './Logo'

const CURRENT_YEAR = new Date().getFullYear()

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Logo />
          <p>
            An independent hackathon project turning NASA Earth science into a
            visual and audible journey through time.
          </p>
          <p className="footer-disclaimer">
            Earth Symphony is not affiliated with, endorsed by, or operated by NASA.
          </p>
        </div>

        <div className="footer-column">
          <h2>Explore</h2>
          <Link to="/explore">Temperature explorer</Link>
          <Link to="/about">How it works</Link>
          <Link to="/about#data-sources">Data sources</Link>
        </div>

        <div className="footer-column">
          <h2>Project</h2>
          <Link to="/about#accessibility">Accessibility</Link>
          <Link to="/about#hackathon">NASA Space Apps 2026</Link>
          <a
            href="https://github.com/HibaHAJAJI/Earth-Jukebox"
            target="_blank"
            rel="noreferrer"
          >
            <GitBranch size={15} aria-hidden="true" />
            Project repository
          </a>
        </div>

        <div className="footer-column footer-source">
          <h2>Scientific source</h2>
          <p>NASA GISS Surface Temperature Analysis (GISTEMP v4)</p>
          <a
            href="https://data.giss.nasa.gov/gistemp/data_v4.html"
            target="_blank"
            rel="noreferrer"
          >
            Visit the GISTEMP data page
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        </div>
      </div>

      <div className="container footer-bottom">
        <p>© {CURRENT_YEAR} Earth Symphony team. Built for NASA Space Apps Challenge.</p>
        <p>Temperature anomaly baseline: 1951–1980 · Unit: °C</p>
      </div>
    </footer>
  )
}
