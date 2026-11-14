import { Link } from 'react-router-dom'
import { ArrowLeft, Globe2 } from 'lucide-react'

export default function NotFound() {
  return (
    <main id="main-content" className="not-found-page">
      <div className="container not-found-inner">
        <span className="not-found-code" aria-hidden="true">
          404
        </span>
        <span className="not-found-icon" aria-hidden="true">
          <Globe2 size={34} />
        </span>
        <h1>This orbit has no data.</h1>
        <p>The page you requested does not exist or may have moved.</p>
        <Link className="button button--primary" to="/">
          <ArrowLeft size={16} aria-hidden="true" />
          Return home
        </Link>
      </div>
    </main>
  )
}
