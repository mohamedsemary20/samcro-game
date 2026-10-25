import type { LeaderboardEntry } from '../domain/types'
import { SurfaceCard } from '../components/SurfaceCard'
import { ActionButton } from '../components/ActionButton'

export function LeaderboardPage({ entries, onPlayAgain }: { entries: LeaderboardEntry[]; onPlayAgain: () => void }) {
  const ordered = [...entries].sort((a, b) => a.rank - b.rank)
  const winners = ordered.filter((entry) => entry.rank === 1)
  const winner = winners[0]
  return <div className="sam-results">
    <div className="sam-results-heading"><span className="sam-eyebrow"><i /> خلصت المباراة</span><h1>مين خدها؟</h1><p>ده ترتيبكم النهائي.</p></div>
    {winner && <div className="sam-winner-banner"><span className="sam-winner-crown">١</span><span><small>{winners.length > 1 ? 'تعادلوا في المركز الأول' : 'كسب الجولة'}</small><strong>{winners.map((entry) => entry.displayName).join(' و ')}</strong></span><b><bdi dir="ltr">{winner.score.toLocaleString('en-US')}</bdi><small>فيشة</small></b></div>}
    <SurfaceCard className="sam-results-card">
      <div className="sam-results-label"><span>المركز</span><span>مين؟</span><span>الرصيد</span></div>
      {ordered.length === 0 && <p className="sam-empty-roster">مش لاقيين نتيجة للمباراة دي.</p>}
      {ordered.map((entry, index) => <div className={`sam-result-row ${entry.rank === 1 ? 'first' : ''}`} key={entry.playerId} style={{ animationDelay: `${index * 75}ms` }}>
        <span className={`sam-result-rank rank-${Math.min(entry.rank, 3)}`}>{entry.rank.toLocaleString('ar-EG')}</span>
        <span className={`sam-avatar sam-avatar-${index % 5}`}>{entry.displayName.slice(0, 1)}</span>
        <strong className="sam-result-name">{entry.displayName}{entry.rank === 1 && <small>كسبها</small>}</strong>
        <b className="sam-result-score"><bdi dir="ltr">{entry.score.toLocaleString('en-US')}</bdi><small>فيشة</small></b>
      </div>)}
      <div className="sam-results-action"><ActionButton onClick={onPlayAgain}>ارجع للرئيسية <span aria-hidden="true">←</span></ActionButton></div>
    </SurfaceCard>
  </div>
}
