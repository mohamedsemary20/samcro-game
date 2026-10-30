import type { LeaderboardEntry } from '../domain/types'
import { ActionButton } from '../components/ActionButton'
import { EmptyState } from '../components/EmptyState'
import { Icon } from '../components/Icon'
import { PlayerAvatar } from '../components/PlayerAvatar'
import { StatusBadge } from '../components/StatusBadge'
import { SurfaceCard } from '../components/SurfaceCard'

export function LeaderboardPage({ entries, onPlayAgain }: { entries: LeaderboardEntry[]; onPlayAgain: () => void }) {
  const ordered = [...entries].sort((a, b) => a.rank - b.rank || b.score - a.score)
  const winners = ordered.filter((entry) => entry.rank === 1)
  const winner = winners[0]
  const podium = ordered.filter((entry) => entry.rank <= 3)

  if (!ordered.length) {
    return <div className="results-page">
      <EmptyState icon="trophy" title="لسه مفيش نتيجة" description="النتيجة النهائية هتظهر هنا بعد ما المباراة تخلص.">
        <ActionButton onClick={onPlayAgain}>ارجع للرئيسية</ActionButton>
      </EmptyState>
    </div>
  }

  return <div className="results-page">
    <section className="winner-hero" aria-labelledby="results-title">
      <span className="winner-particles" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>
      <span className="winner-crown" aria-hidden="true"><Icon name="crown" size={28} /></span>
      <span className="eyebrow"><i /> المباراة خلصت</span>
      <h1 id="results-title">{winners.length > 1 ? 'المركز الأول مناصفة' : 'مين خدها؟'}</h1>
      {winner && <div className="winner-callout">
        <PlayerAvatar name={winner.displayName} playerId={winner.playerId} size="xl" />
        <div>
          <strong>{winners.map((entry) => entry.displayName).join(' و ')}</strong>
          <small>{winners.length > 1 ? 'تعادلوا في الصدارة' : 'كسب المباراة'}</small>
        </div>
        <b className="winner-score"><bdi dir="ltr">{winner.score.toLocaleString('en-US')}</bdi><small>صافي الفيش</small></b>
      </div>}
      <p className="winner-sub">ترتيب نهائي لـ {ordered.length.toLocaleString('ar-EG')} لاعبين بعد ٥ جولات.</p>
    </section>

    <section className="podium" aria-label="أفضل ٣ لاعبين">
      {podium.map((entry) => <article key={entry.playerId} className={`podium-place place-${entry.rank}`}>
        <span className="podium-rank">{entry.rank.toLocaleString('ar-EG')}</span>
        <PlayerAvatar name={entry.displayName} playerId={entry.playerId} size={entry.rank === 1 ? 'lg' : 'md'} />
        <strong>{entry.displayName}</strong>
        <b><bdi dir="ltr">{entry.score.toLocaleString('en-US')}</bdi> <small>فيش</small></b>
        {entry.rank === 1 && <StatusBadge tone="turn"><Icon name="crown" size={12} /> الفائز</StatusBadge>}
      </article>)}
    </section>

    <SurfaceCard className="results-card">
      <div className="results-head">
        <div><span className="eyebrow"><i /> النتيجة</span><h2>الترتيب النهائي</h2></div>
        <StatusBadge tone="neutral">{ordered.length.toLocaleString('ar-EG')} لاعبين</StatusBadge>
      </div>
      <div className="results-table" role="table" aria-label="الترتيب النهائي">
        <div className="results-row results-row-head" role="row">
          <span role="columnheader">المركز</span>
          <span role="columnheader">اللاعب</span>
          <span role="columnheader">صافي الفيش</span>
        </div>
        {ordered.map((entry, index) => <div className={`results-row${entry.rank === 1 ? ' is-first' : ''}`} role="row" key={entry.playerId} style={{ animationDelay: `${index * 55}ms` }}>
          <span className={`result-rank rank-${Math.min(entry.rank, 3)}`} role="cell">{entry.rank.toLocaleString('ar-EG')}</span>
          <span className="result-player" role="cell">
            <PlayerAvatar name={entry.displayName} playerId={entry.playerId} size="sm" />
            <span><strong>{entry.displayName}</strong>{entry.debt ? <small>عليه مديونية {entry.debt.toLocaleString('en-US')}</small> : null}</span>
          </span>
          <b className="result-score" role="cell"><bdi dir="ltr">{entry.score.toLocaleString('en-US')}</bdi><small>فيش</small></b>
        </div>)}
      </div>
    </SurfaceCard>

    <div className="results-actions">
      <ActionButton onClick={onPlayAgain}>ارجع للرئيسية <Icon name="arrow" size={18} /></ActionButton>
    </div>
  </div>
}
