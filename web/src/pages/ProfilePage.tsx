import { useState } from 'react'
import type { UserProfile } from '../domain/types'
import { SurfaceCard } from '../components/SurfaceCard'

type ProfilePanel = 'achievements' | 'statistics' | 'appearance' | null

export function ProfilePage({ profile, onToggleSound, onToggleHaptics }: {
  profile: UserProfile
  onToggleSound: (enabled: boolean) => void
  onToggleHaptics: (enabled: boolean) => void
}) {
  const [saved, setSaved] = useState(false)
  const [panel, setPanel] = useState<ProfilePanel>(null)
  const togglePanel = (next: Exclude<ProfilePanel, null>) => setPanel((current) => current === next ? null : next)

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div><div className="section-kicker">معاينة محلية</div><h1>ملف اللاعب</h1><p>الأرقام والتفضيلات دي للمعاينة، ومش بتتسجل على الحساب.</p></div>
      </div>
      <div className="profile-grid">
        <SurfaceCard className="profile-card">
          <div className="profile-identity">
            <span className="profile-avatar">{profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : 'أ'}</span>
            <div><span className="section-kicker">مستوى المعاينة {profile.level.toLocaleString('ar-EG')}</span><h2>{profile.name}</h2><p>{profile.title}</p></div>
            <span className="rank-label">بيانات تجريبية</span>
          </div>
          <div className="xp-label"><span>نقاط الخبرة</span><strong>{profile.xp} / {profile.maxXp}</strong></div>
          <div className="xp-track"><i style={{ width: `${Math.min(100, (profile.xp / profile.maxXp) * 100)}%` }} /></div>
          <div className="profile-stats">
            <div><strong>{profile.totalRounds}</strong><span>جولات تجريبية</span></div>
            <div><strong>{profile.winRate}٪</strong><span>فوز تجريبي</span></div>
            <div><strong>{profile.maxBet.toLocaleString('en-US')}</strong><span>رهان تجريبي</span></div>
          </div>
          <div className="profile-options">
            <button onClick={() => togglePanel('achievements')} aria-expanded={panel === 'achievements'}><span className="option-icon gold-icon">١</span><span><strong>إنجازات المعاينة</strong><small>بيانات للعرض بس</small></span><i aria-hidden="true">←</i></button>
            <button onClick={() => togglePanel('statistics')} aria-expanded={panel === 'statistics'}><span className="option-icon green-icon">٢</span><span><strong>إحصاءات المعاينة</strong><small>أرقام غير متصلة باللعب الحقيقي</small></span><i aria-hidden="true">←</i></button>
            <button onClick={() => togglePanel('appearance')} aria-expanded={panel === 'appearance'}><span className="option-icon gold-icon">٣</span><span><strong>مظاهر المعاينة</strong><small>تجربة أشكال البطاقات والطاولة</small></span><i aria-hidden="true">←</i></button>
          </div>
          {panel && <ProfileDetail panel={panel} profile={profile} />}
        </SurfaceCard>

        <SurfaceCard className="settings-card">
          <span className="section-kicker">محلي على الجهاز</span><h2>جرّب الإعدادات</h2>
          <label className="setting-row"><span><strong>الصوت</strong><small>اختيارات المعاينة بس</small></span><input type="checkbox" checked={profile.soundEffects} onChange={(event) => { onToggleSound(event.target.checked); setSaved(true) }} /></label>
          <label className="setting-row"><span><strong>الاهتزاز</strong><small>اختيارات المعاينة بس</small></span><input type="checkbox" checked={profile.hapticFeedback} onChange={(event) => { onToggleHaptics(event.target.checked); setSaved(true) }} /></label>
          <div className="setting-row language-row"><span><strong>لغة الواجهة</strong><small>عربي ومن اليمين للشمال</small></span><span className="language-tag">العربية</span></div>
          {saved && <span className="inline-notice" role="status">غيرنا الاختيار في المعاينة المحلية.</span>}
        </SurfaceCard>
      </div>
    </div>
  )
}

function ProfileDetail({ panel, profile }: { panel: Exclude<ProfilePanel, null>; profile: UserProfile }) {
  if (panel === 'achievements') return <div className="profile-detail"><strong>إنجازات المعاينة</strong><p>أمثلة شكلية للواجهة، مش إنجازات محفوظة.</p></div>
  if (panel === 'statistics') return <div className="profile-detail"><strong>إحصاءات المعاينة</strong><p>الجولات: {profile.totalRounds} · نسبة الفوز: {profile.winRate}٪ · أكبر رهان: {profile.maxBet.toLocaleString('en-US')} فيشة.</p></div>
  return <div className="profile-detail"><strong>مظاهر المعاينة</strong><p>البطاقة: {profile.cardSkinTitle}<br />الطاولة: {profile.tableFeltTitle}</p></div>
}
