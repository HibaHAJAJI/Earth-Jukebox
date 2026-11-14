export default function FeatureCard({ icon: Icon, number, title, description, accent = 'cyan' }) {
  return (
    <article className={`feature-card feature-card--${accent}`}>
      <div className="feature-card-top">
        <span className="feature-icon" aria-hidden="true">
          <Icon size={22} strokeWidth={1.9} />
        </span>
        <span className="feature-number" aria-hidden="true">
          {number}
        </span>
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  )
}
