import { useState } from 'react'
import { ActionButton } from '../components/ActionButton'
import { AppDialog } from '../components/AppDialog'
import { Icon } from '../components/Icon'
import { PlayerAvatar } from '../components/PlayerAvatar'
import { StatusBadge } from '../components/StatusBadge'
import { SurfaceCard } from '../components/SurfaceCard'

export function ServerProfilePage({
  player,
  connected,
  roomCode,
  onOpenLobby,
  onLogout,
  loggingOut = false,
}: {
  player: { id: string; name: string }
  connected: boolean
  roomCode: string | null
  onOpenLobby: () => void
  onLogout: () => void
  loggingOut?: boolean
}) {
  const [confirmLogout, setConfirmLogout] = useState(false)

  return <div className="profile-page">
    <header className="page-header">
      <div>
        <span className="eyebrow"><i /> حسابك</span>
        <h1>ملف اللاعب</h1>
        <p>بيانات جلستك الحالية على الجهاز ده.</p>
      </div>
      <StatusBadge tone={connected ? 'online' : 'warning'} dot>{connected ? 'متصل' : 'غير متصل'}</StatusBadge>
    </header>

    <div className="profile-layout">
      <SurfaceCard className="profile-hero">
        <PlayerAvatar name={player.name} playerId={player.id} size="xl" />
        <div className="profile-identity">
          <span className="eyebrow">لاعب سمكرو</span>
          <h2>{player.name}</h2>
          <StatusBadge tone="neutral"><Icon name="shield" size={13} /> جلسة ضيف</StatusBadge>
        </div>
        <div className="profile-facts">
          <div><Icon name="user" size={18} /><span><small>الاسم في اللعبة</small><strong>{player.name}</strong></span></div>
          <div><Icon name={connected ? 'wifi' : 'wifiOff'} size={18} /><span><small>حالة الاتصال</small><strong>{connected ? 'متصل بالخادم' : 'محتاج اتصال'}</strong></span></div>
          <div><Icon name="shield" size={18} /><span><small>نوع الحساب</small><strong>جلسة محفوظة على الجهاز</strong></span></div>
        </div>
        {roomCode && <div className="profile-room">
          <span><Icon name="users" size={17} /> إنت في غرفة <bdi dir="ltr" className="room-inline-code">{roomCode}</bdi></span>
          <ActionButton tone="secondary" onClick={onOpenLobby}>ارجع للغرفة</ActionButton>
        </div>}
      </SurfaceCard>

      <div className="profile-side">
        <SurfaceCard className="install-card">
          <span className="action-icon"><Icon name="download" size={21} /></span>
          <h2>ثبّت سمكرو</h2>
          <p>ضيفها لشاشتك الرئيسية وافتحها كتطبيق — بنفس الغرف والاتصال.</p>
          <ActionButton tone="secondary" onClick={() => window.dispatchEvent(new Event('samkaro:install-request'))}>
            <Icon name="download" size={17} /> طريقة التثبيت
          </ActionButton>
        </SurfaceCard>

        <SurfaceCard className="profile-note">
          <span className="note-icon"><Icon name="info" size={18} /></span>
          <h2>عن الجلسة</h2>
          <p>جلستك محفوظة في المتصفح ده. لو مسحت بيانات الموقع أو خرجت، هتحتاج تختار اسمك من جديد.</p>
        </SurfaceCard>

        <SurfaceCard className="profile-logout">
          <h2>الخروج من الجلسة</h2>
          <p>هتخرج من سمكرو على الجهاز ده. أي غرفة مفتوحة هتتساب.</p>
          <ActionButton tone="danger" onClick={() => setConfirmLogout(true)} loading={loggingOut}>
            <Icon name="logOut" size={17} /> اخرج من الحساب
          </ActionButton>
        </SurfaceCard>
      </div>
    </div>

    <AppDialog
      open={confirmLogout}
      title="متأكد إنك عايز تخرج؟"
      description="هتخرج من الجلسة الحالية، وهتحتاج تختار اسمك من جديد قبل ما تلعب."
      icon="door"
      confirmLabel="اخرج"
      cancelLabel="خليك"
      tone="danger"
      busy={loggingOut}
      onConfirm={onLogout}
      onClose={() => setConfirmLogout(false)}
    />
  </div>
}
