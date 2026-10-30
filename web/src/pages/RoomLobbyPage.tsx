import type { RoomDetails } from '../domain/types'
import { ActionButton } from '../components/ActionButton'
import { Icon } from '../components/Icon'
import { PlayerAvatar } from '../components/PlayerAvatar'
import { StatusBadge } from '../components/StatusBadge'
import { SurfaceCard } from '../components/SurfaceCard'

export function RoomLobbyPage({
  room,
  player,
  connected,
  startingMatch,
  canStart,
  onCopyCode,
  onShare,
  onToggleReady,
  onStart,
  onLeave,
  preview = false,
}: {
  room: RoomDetails
  player: { id: string; name: string }
  connected: boolean
  startingMatch: boolean
  canStart: boolean
  onCopyCode: () => void
  onShare: () => void
  onToggleReady: () => void
  onStart: () => void
  onLeave: () => void
  preview?: boolean
}) {
  const capacity = room.room.capacity ?? 7
  const readyIds = new Set(room.room.readyPlayerIds ?? [])
  const readyCount = room.players.filter((member) => readyIds.has(member.playerId)).length
  const self = room.players.find((member) => member.playerId === player.id)
  const isHost = room.room.hostPlayerId === player.id
  const waiting = room.room.status === 'waiting'
  const emptySeats = Math.max(0, capacity - room.players.length)
  const readyPercent = room.players.length ? Math.round((readyCount / room.players.length) * 100) : 0

  return <div className="lobby-page">
    <header className="page-header">
      <div>
        <span className="eyebrow"><i /> قبل ما نبدأ</span>
        <h1>لمّيتوا بعض؟</h1>
        <p>ابعت الرمز للشلة. لما الكل يبقى جاهز، ابدأوا الجولة.</p>
      </div>
      <StatusBadge tone={preview ? 'neutral' : connected ? 'online' : 'warning'} dot pulse={!preview && !connected}>
        {preview ? 'معاينة محلية' : connected ? 'متصل بالغرفة' : 'بنعيد الاتصال'}
      </StatusBadge>
    </header>

    <div className="lobby-layout">
      <SurfaceCard className="room-card">
        <div className="room-code-block">
          <span className="field-label">رمز الغرفة</span>
          <button type="button" className="room-code" onClick={onCopyCode} dir="ltr" aria-label="نسخ رمز الغرفة">
            {room.room.code}
            <Icon name="copy" size={19} />
          </button>
          <small>دوس على الرمز عشان تنسخه وتبعته للشلة.</small>
        </div>
        <div className="room-share-actions">
          <ActionButton tone="secondary" onClick={onCopyCode}><Icon name="copy" size={17} /> انسخ الرمز</ActionButton>
          <ActionButton tone="quiet" onClick={onShare}><Icon name="share" size={17} /> شارك الدعوة</ActionButton>
        </div>

        <div className="roster-heading">
          <div>
            <span className="eyebrow"><i /> الطاولة</span>
            <h2>مين وصل؟</h2>
          </div>
          <span className="roster-count">{room.players.length.toLocaleString('ar-EG')} <b>/</b> {capacity.toLocaleString('ar-EG')}</span>
        </div>

        <div className="roster" aria-live="polite">
          {room.players.length === 0 && <p className="empty-copy">لسه مستنيين أول لاعب…</p>}
          {room.players.map((member) => {
            const memberReady = readyIds.has(member.playerId)
            const host = member.playerId === room.room.hostPlayerId
            const selfMember = member.playerId === player.id
            return <article
              key={member.playerId}
              className={`roster-player${host ? ' is-host' : ''}${selfMember ? ' is-self' : ''}${memberReady ? ' is-ready' : ''}${!member.isConnected ? ' is-disconnected' : ''}`}
            >
              <div className="roster-avatar-wrap">
                <PlayerAvatar name={member.displayName} playerId={member.playerId} size="md" />
                <span className={`presence-dot${member.isConnected ? ' is-online' : ''}`} aria-hidden="true" />
              </div>
              <div className="roster-copy">
                <strong>{member.displayName}{selfMember && <small>إنت</small>}</strong>
                <span className="roster-meta">
                  {host && <StatusBadge tone="turn"><Icon name="crown" size={12} /> صاحب الغرفة</StatusBadge>}
                  {!member.isConnected && <StatusBadge tone="danger" dot>فصل</StatusBadge>}
                  {member.isConnected && !memberReady && <span className="muted-text">مستني يجهز</span>}
                  {member.isConnected && memberReady && <span className="ready-text">جاهز للجولة</span>}
                </span>
              </div>
              <StatusBadge tone={memberReady ? 'ready' : 'neutral'} dot={memberReady}>
                {memberReady ? 'جاهز' : member.isConnected ? 'لسه' : 'غايب'}
              </StatusBadge>
            </article>
          })}
          {waiting && Array.from({ length: emptySeats }, (_, index) => <div className="roster-player is-empty" key={`empty-${index}`} aria-hidden="true">
            <span className="empty-avatar"><Icon name="plus" size={18} /></span>
            <span className="roster-copy"><strong>مستنيين لاعب</strong><small className="muted-text">ابعت الرمز لأصحابك</small></span>
          </div>)}
        </div>

        <div className="ready-progress" aria-label={`${readyCount} من ${room.players.length} جاهزين`}>
          <span style={{ width: `${readyPercent}%` }} />
        </div>

        <div className="lobby-footer">
          <div className="ready-summary">
            <strong>{readyCount.toLocaleString('ar-EG')} من {room.players.length.toLocaleString('ar-EG')} جاهزين</strong>
            <small>{waiting ? 'محتاجين ٣ لاعبين جاهزين على الأقل عشان نبدأ' : 'بنجهّز الطاولة…'}</small>
          </div>
          <div className="lobby-actions">
            <ActionButton
              tone={self?.isReady ? 'success' : 'secondary'}
              disabled={!connected || !waiting}
              onClick={onToggleReady}
            >
              {self?.isReady ? <><Icon name="check" size={17} /> أنا جاهز</> : 'جهّزني'}
            </ActionButton>
            {isHost && <ActionButton disabled={!canStart || startingMatch} onClick={onStart} loading={startingMatch}>
              {startingMatch ? 'بنبدأ المباراة…' : 'ابدأوا اللعب'} {!startingMatch && <Icon name="arrow" size={18} />}
            </ActionButton>}
            {!preview && <ActionButton tone="quiet" onClick={onLeave}>سيب الغرفة</ActionButton>}
          </div>
        </div>

        {preview && <p className="inline-hint" role="status">دي معاينة محلية للواجهة؛ التغييرات مش بتوصل للخادم.</p>}
        {!preview && !connected && <p className="inline-hint" role="status"><Icon name="wifiOff" size={15} /> الاتصال فصل. هنحدّث الغرفة أول ما الشبكة ترجع.</p>}
        {!preview && isHost && waiting && !canStart && <p className="inline-hint">{room.players.length < 3 ? 'محتاجين ٣ لاعبين على الأقل.' : !connected ? 'استنى الاتصال يرجع الأول.' : 'استنى لما كل الموجودين يجهزوا.'}</p>}
        {!preview && !isHost && waiting && <p className="inline-hint">صاحب الغرفة هو اللي هيبدأ المباراة.</p>}
      </SurfaceCard>

      <aside className="lobby-aside">
        <SurfaceCard className="lobby-tip">
          <span className="note-icon"><Icon name="shield" size={18} /></span>
          <h2>كل تلميح لصاحبه</h2>
          <p>التلميحات والتخمينات سرية. مفيش لاعب يشوف اختيارات التاني قبل كشف الجولة.</p>
        </SurfaceCard>
        <SurfaceCard className="lobby-tip">
          <span className="note-icon"><Icon name="wifi" size={18} /></span>
          <h2>اللعب أونلاين</h2>
          <p>سمكرو محتاجة إنترنت عشان تزامن الغرفة. لو الشبكة فصلت هنرجّع حالتك من السيرفر.</p>
        </SurfaceCard>
      </aside>
    </div>
  </div>
}
