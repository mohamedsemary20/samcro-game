import { useState } from 'react'
import type { UserProfile } from '../domain/types'
import { Icon } from '../components/Icon'
import { PlayerAvatar } from '../components/PlayerAvatar'
import { StatusBadge } from '../components/StatusBadge'
import { SurfaceCard } from '../components/SurfaceCard'

export function ProfilePage({ profile, onToggleSound, onToggleHaptics }: {
  profile: UserProfile
  onToggleSound: (enabled: boolean) => void
  onToggleHaptics: (enabled: boolean) => void
}) {
  const [saved, setSaved] = useState(false)

  return <div className="profile-page">
    <header className="page-header">
      <div>
        <span className="eyebrow"><i /> معاينة محلية</span>
        <h1>ملف اللاعب</h1>
        <p>شكل الملف واختيارات الجهاز في وضع المعاينة.</p>
      </div>
      <StatusBadge tone="warning" dot>بيانات تجريبية</StatusBadge>
    </header>

    <div className="profile-layout">
      <SurfaceCard className="profile-hero">
        <PlayerAvatar name={profile.name} playerId={profile.name} avatarUrl={profile.avatarUrl} size="xl" />
        <div className="profile-identity">
          <span className="eyebrow">لاعب سمكرو</span>
          <h2>{profile.name}</h2>
          <StatusBadge tone="neutral"><Icon name="shield" size={13} /> {profile.title}</StatusBadge>
        </div>
        <div className="profile-facts">
          <div><Icon name="sparkle" size={18} /><span><small>مستوى المعاينة</small><strong>{profile.level.toLocaleString('ar-EG')}</strong></span></div>
          <div><Icon name="trophy" size={18} /><span><small>خبرة المعاينة</small><strong>{profile.xp.toLocaleString('ar-EG')} / {profile.maxXp.toLocaleString('ar-EG')}</strong></span></div>
          <div><Icon name="shield" size={18} /><span><small>نوع البيانات</small><strong>محلية للعرض فقط</strong></span></div>
        </div>
        <div className="profile-options">
          <label className="toggle-row">
            <span><strong>الصوت</strong><small>اختيار المعاينة على الجهاز</small></span>
            <input type="checkbox" checked={profile.soundEffects} onChange={(event) => { onToggleSound(event.target.checked); setSaved(true) }} />
          </label>
          <label className="toggle-row">
            <span><strong>الاهتزاز</strong><small>اختيار المعاينة على الجهاز</small></span>
            <input type="checkbox" checked={profile.hapticFeedback} onChange={(event) => { onToggleHaptics(event.target.checked); setSaved(true) }} />
          </label>
        </div>
        {saved && <p className="inline-hint" role="status"><Icon name="check" size={15} /> اتغير الاختيار في المعاينة المحلية.</p>}
      </SurfaceCard>

      <div className="profile-side">
        <SurfaceCard className="profile-note">
          <span className="note-icon"><Icon name="info" size={18} /></span>
          <h2>معاينة مش حساب</h2>
          <p>الصورة والأرقام دي بيانات تطوير. الملف الحقيقي بيظهر من جلسة الخادم بعد الدخول.</p>
        </SurfaceCard>
        <SurfaceCard className="install-card">
          <span className="action-icon"><Icon name="users" size={21} /></span>
          <h2>اللعب مع الأصحاب</h2>
          <p>العودة للرئيسية وابدأ غرفة حقيقية من نسخة الخادم.</p>
        </SurfaceCard>
      </div>
    </div>
  </div>
}
