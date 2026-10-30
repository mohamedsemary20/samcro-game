import type { FormEvent } from 'react'
import { ActionButton } from '../components/ActionButton'
import { Icon } from '../components/Icon'
import { PlayerAvatar } from '../components/PlayerAvatar'
import { StatusBadge } from '../components/StatusBadge'
import { SurfaceCard } from '../components/SurfaceCard'

type PlayerSummary = { id: string; name: string }

export function ServerHomePage({
  player,
  displayName,
  onDisplayName,
  onGuestSubmit,
  busy,
  online,
  roomCode,
  onRoomCode,
  onCreateRoom,
  onJoinRoom,
  onProfile,
}: {
  player: PlayerSummary | null
  displayName: string
  onDisplayName: (value: string) => void
  onGuestSubmit: (event: FormEvent<HTMLFormElement>) => void
  busy: boolean
  online: boolean
  roomCode: string
  onRoomCode: (value: string) => void
  onCreateRoom: () => void
  onJoinRoom: (event: FormEvent<HTMLFormElement>) => void
  onProfile: () => void
}) {
  return <div className="home-page">
    <section className={`home-hero${player ? ' is-returning' : ''}`} aria-labelledby="home-title">
      <div className="home-hero-copy">
        <span className="eyebrow"><i /> سمكرو · لعبة الأصحاب</span>
        <h1 id="home-title">
          {player ? <>جاهزين لجولة<br /><em>تفرق فيها؟</em></> : <>قدّرها صح.<br /><em>كمّلها بحدسك.</em></>}
        </h1>
        <p>{player ? 'اعمل غرفة، لمّ الشلة، وخلي حدسك يسبق الباقيين.' : 'سؤال واحد، تلميح سرّي، ورهان ذكي. مين فيكم هيقرب من الإجابة؟'}</p>
        <div className="hero-facts" aria-label="معلومات عن اللعبة">
          <span><Icon name="users" size={16} /> ٣–٧ لاعبين</span>
          <span><Icon name="sparkle" size={16} /> تلميح سرّي</span>
          <span><Icon name="trophy" size={16} /> ٥ جولات</span>
        </div>
      </div>

      <div className="hero-stage" aria-hidden="true">
        <span className="hero-stage-orbit orbit-one" />
        <span className="hero-stage-orbit orbit-two" />
        <div className="hero-question-card">
          <span className="hero-question-label">السؤال</span>
          <strong>؟</strong>
          <span className="hero-question-hint"><Icon name="sparkle" size={14} /> تلميحك ليك بس</span>
        </div>
        <span className="hero-chip chip-one"><Icon name="users" size={14} /> ٤ لاعبين</span>
        <span className="hero-chip chip-two"><Icon name="trophy" size={14} /> الجولة ٥</span>
      </div>
    </section>

    {!player
      ? <section className="home-entry-grid" aria-label="ابدأ اللعب">
        <SurfaceCard className="entry-card">
          <span className="eyebrow"><i /> أول خطوة</span>
          <h2>اسمك إيه؟</h2>
          <p>اكتب الاسم اللي أصحابك هيشوفوه في الغرفة.</p>
          <form className="stack-form" onSubmit={onGuestSubmit}>
            <label htmlFor="guest-name">اسم اللاعب</label>
            <input
              id="guest-name"
              value={displayName}
              onChange={(event) => onDisplayName(event.target.value)}
              maxLength={40}
              required
              autoComplete="nickname"
              placeholder="مثال: مريم"
            />
            <ActionButton type="submit" disabled={busy || !displayName.trim()} loading={busy}>
              {busy ? 'بنجهّز دخولك…' : 'يلا نلعب'} {!busy && <Icon name="arrow" size={18} />}
            </ActionButton>
          </form>
          <small className="entry-foot">من غير حساب — اختار اسمك وابدأ.</small>
        </SurfaceCard>

        <SurfaceCard className="home-side-note">
          <span className="note-icon"><Icon name="shield" size={19} /></span>
          <h2>لعبة الأصحاب</h2>
          <p>الغرفة بتفضل سرية برمز من ٦ حروف. التلميحات والتخمينات بتتأكد من السيرفر، والنتيجة بتظهر للكل في نفس اللحظة.</p>
          <StatusBadge tone={online ? 'online' : 'offline'} dot>{online ? 'جاهزين للاتصال' : 'محتاجين إنترنت'}</StatusBadge>
        </SurfaceCard>
      </section>
      : <section className="home-actions" aria-label="اختر طريقة اللعب">
        <SurfaceCard className="action-card action-card-primary">
          <span className="action-icon"><Icon name="users" size={22} /></span>
          <div className="action-copy">
            <span className="eyebrow">إنت صاحب السؤال</span>
            <h2>اعمل غرفة</h2>
            <p>لمّ أصحابك وابدأوا اللعب سوا.</p>
          </div>
          <ActionButton onClick={onCreateRoom} loading={busy} disabled={!online}>
            {busy ? 'بنجهّز الغرفة…' : 'اعمل غرفة جديدة'} {!busy && <Icon name="arrow" size={18} />}
          </ActionButton>
        </SurfaceCard>

        <SurfaceCard className="action-card">
          <span className="action-icon is-quiet"><Icon name="door" size={22} /></span>
          <div className="action-copy">
            <span className="eyebrow">معاك رمز؟</span>
            <h2>ادخل الغرفة</h2>
            <p>اكتب الرمز اللي بعتهولك صاحبك.</p>
          </div>
          <form className="stack-form inline-form" onSubmit={onJoinRoom}>
            <label htmlFor="room-code">رمز الغرفة</label>
            <div className="field-with-action">
              <input
                id="room-code"
                dir="ltr"
                value={roomCode}
                onChange={(event) => onRoomCode(event.target.value.toUpperCase().replace(/\s/g, ''))}
                maxLength={10}
                autoComplete="off"
                required
                placeholder="ABC123"
              />
              <ActionButton type="submit" tone="secondary" disabled={busy || roomCode.trim().length < 6}>
                {busy ? 'بندخّلك…' : 'دخول'}
              </ActionButton>
            </div>
          </form>
        </SurfaceCard>

        <SurfaceCard className="player-strip">
          <PlayerAvatar name={player.name} playerId={player.id} size="lg" />
          <span className="player-strip-copy">
            <small>بتلعب باسم</small>
            <strong>{player.name}</strong>
          </span>
          <StatusBadge tone={online ? 'online' : 'offline'} dot>{online ? 'متصل' : 'غير متصل'}</StatusBadge>
          <ActionButton tone="quiet" className="player-strip-action" onClick={onProfile}>
            <Icon name="user" size={17} /> ملفي
          </ActionButton>
        </SurfaceCard>
      </section>}

    <section className="how-to-play" aria-labelledby="how-title">
      <div className="section-heading">
        <span className="eyebrow"><i /> طريقة اللعب</span>
        <h2 id="how-title">من السؤال للنتيجة</h2>
      </div>
      <div className="how-grid">
        <article><span>١</span><h3>لمّ الشلة</h3><p>اعمل غرفة أو ادخل برمز صاحبك. من ٣ لـ ٧ لاعبين.</p></article>
        <article><span>٢</span><h3>خد تلميحك</h3><p>كل لاعب بيوصله تلميح سري خاص بيه في الجولة.</p></article>
        <article><span>٣</span><h3>راهن وخمّن</h3><p>قدّر الإجابة، راهن بذكاء، وشوف مين الأقرب.</p></article>
      </div>
    </section>

    <footer className="site-credit"><bdi lang="en" dir="ltr">Developed by Mohamed Semary</bdi><span aria-hidden="true">·</span><bdi lang="en" dir="ltr">Samkaro</bdi></footer>
  </div>
}
