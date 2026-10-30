import { Icon } from './Icon'

export function LoadingState({ title = 'بنجهّز سمكرو', description = 'بنرجع جلستك وحالة اللعب…' }: { title?: string; description?: string }) {
  return <section className="loading-state" role="status" aria-live="polite">
    <div className="loading-mark" aria-hidden="true"><Icon name="crown" size={26} /></div>
    <span className="eyebrow"><i /> سمكرو</span>
    <h1>{title}</h1>
    <p>{description}</p>
    <div className="skeleton-stack" aria-hidden="true">
      <span className="skeleton skeleton-title" />
      <span className="skeleton skeleton-line" />
      <span className="skeleton skeleton-line short" />
    </div>
  </section>
}
