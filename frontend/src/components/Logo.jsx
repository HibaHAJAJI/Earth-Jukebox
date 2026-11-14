import { Link } from 'react-router-dom'
import { AudioLines } from 'lucide-react'

export default function Logo({ compact = false }) {
  return (
    <Link className="brand" to="/" aria-label="Earth Symphony — home">
      <span className="brand-mark" aria-hidden="true">
        <AudioLines size={21} strokeWidth={2.2} />
      </span>
      {!compact && (
        <span className="brand-name">
          Earth<span>Symphony</span>
        </span>
      )}
    </Link>
  )
}
