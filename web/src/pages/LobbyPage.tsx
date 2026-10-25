import { useState, type FormEvent } from 'react'
import type { Player } from '../domain/types'
import { ActionButton } from '../components/ActionButton'
import { SurfaceCard } from '../components/SurfaceCard'

export function LobbyPage({ players, roomCode, ready, onReady, onStart, onJoin }: {
  players: Player[]; roomCode: string; ready: boolean; onReady: () => void; onStart: () => void; onJoin: (code: string) => void
}) {
  const [code, setCode] = useState('')
  const [notice, setNotice] = useState('')

  const submitJoin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalized = code.trim().toUpperCase()
    if (!/^[A-Z0-9]{5}$/.test(normalized)) {
      setNotice('الرمز في المعاينة ٥ حروف أو أرقام. راجعه وجرب تاني.')
      return
    }
    onJoin(normalized)
    setNotice('غيّرنا الرمز في المعاينة المحلية بس.')
  }

  async function copyCode(): Promise<void> {
    try {
      await navigator.clipboard.writeText(roomCode)
      setNotice('نسخنا الرمز. تقدر تلزقه في المعاينة.')
    } catch {
      setNotice(`رمز المعاينة: ${roomCode}`)
    }
  }

  return <section className="sam-lobby sam-demo-lobby">
    <header className="sam-page-intro"><span className="sam-eyebrow"><i /> معاينة محلية</span><h1>لمّيتوا بعض؟</h1><p>ده شكل الردهة. التغييرات هنا مش بتوصل للخادم.</p></header>
    <SurfaceCard className="sam-room-card">
      <div className="sam-room-top"><div><span className="sam-label">رمز المعاينة</span><button className="sam-room-code" type="button" onClick={() => void copyCode()} dir="ltr" aria-label="نسخ رمز المعاينة">{roomCode}<span>⧉</span></button></div><span className="sam-status is-online"><i />معاينة على الجهاز</span></div>
      <p className="sam-share-hint">انسخ الرمز أو جرّب تغييره في المعاينة <span aria-hidden="true">↙</span></p>
      <form className="sam-form sam-demo-join" onSubmit={submitJoin}><label htmlFor="demo-room-code">جرّب رمز تاني</label><div><input id="demo-room-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase().slice(0, 5))} placeholder="٥ حروف أو أرقام" dir="ltr" maxLength={5} /><ActionButton type="submit" tone="quiet" disabled={code.length !== 5}>تغيير الرمز</ActionButton></div></form>
      <div className="sam-roster-heading"><h2>اللاعبون</h2><span>{players.length} <b>/</b> ٧</span></div>
      <div className="sam-roster" aria-live="polite">
        {players.map((player, index) => {
          const isYou = player.id === 'you'
          const isReady = !isYou || ready
          return <article className="sam-player-card" key={player.id} style={{ animationDelay: `${index * 55}ms` }}>
            <span className={`sam-avatar sam-avatar-${index % 5}`}>{player.avatarUrl ? <img src={player.avatarUrl} alt="" /> : player.name.slice(0, 1)}</span>
            <span className="sam-player-copy"><strong>{player.name}</strong><small>{isYou ? 'إنت' : player.isHost ? 'صاحب الغرفة' : 'معانا في المعاينة'}</small></span>
            {player.isHost && <span className="sam-host-badge">صاحب الغرفة</span>}
            <span className={`sam-ready-pill ${isReady ? 'ready' : ''}`}><i />{isReady ? 'جاهز' : 'لسه'}</span>
          </article>
        })}
        {Array.from({ length: Math.max(0, Math.min(3, 7 - players.length)) }, (_, index) => <div className="sam-player-slot" key={`slot-${index}`}><span>＋</span><small>مستنيين لاعب</small></div>)}
      </div>
      {notice && <p className="sam-demo-notice" role="status">{notice}</p>}
      <div className="sam-lobby-footer"><div className="sam-ready-copy"><strong>{ready ? 'إنت جاهز' : 'لسه ما جهزتش'}</strong><small>دي معاينة الواجهة؛ مش غرفة متصلة بالإنترنت.</small></div><div className="sam-lobby-actions"><ActionButton tone={ready ? 'green' : 'quiet'} onClick={onReady}>{ready ? '✓ أنا جاهز' : 'جهّزني'}</ActionButton><ActionButton onClick={onStart}>ابدأ الجولة المحلية <span aria-hidden="true">←</span></ActionButton></div></div>
    </SurfaceCard>
  </section>
}
