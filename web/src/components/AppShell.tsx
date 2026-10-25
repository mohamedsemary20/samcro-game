import type { PropsWithChildren } from 'react'
import type { NavigationTab } from '../domain/types'
import { ActionButton } from './ActionButton'

const navItems: { id: NavigationTab; label: string; icon: string }[] = [
  { id: 'home', label: 'الرئيسية', icon: '٠١' },
  { id: 'lobby', label: 'الغرفة', icon: '٠٢' },
  { id: 'leaderboard', label: 'النتيجة', icon: '٠٣' },
  { id: 'profile', label: 'ملفي', icon: '٠٤' },
]

export function AppShell({
  children, activeTab, onNavigate, chips, showNav = true, showWallet = true,
  modeLabel = 'معاينة محلية', playerLabel = 'لاعب', footerLabel = 'معاينة محلية',
}: PropsWithChildren<{
  activeTab: NavigationTab
  onNavigate: (tab: NavigationTab) => void
  chips: number
  showNav?: boolean
  showWallet?: boolean
  modeLabel?: string
  playerLabel?: string
  footerLabel?: string
}>) {
  return <div className="app-shell">
    {showNav && <header className="topbar">
      <div className="topbar-inner">
        <button className="brand-lockup" onClick={() => onNavigate('home')} aria-label="سمكرو - الرئيسية">
          <span><strong>سمكرو</strong><small>لعبة التلميح والتخمين</small></span>
        </button>
        <div className="topbar-actions">
          <div className="demo-label"><span className="status-dot" />{modeLabel}</div>
          {showWallet && <div className="chip-wallet"><span>◉</span><strong>{chips.toLocaleString('en-US')}</strong></div>}
          <ActionButton tone="quiet" className="top-profile" onClick={() => onNavigate('profile')} aria-label={`ملف ${playerLabel}`}>{playerLabel} <span className="profile-orb" aria-hidden="true">{playerLabel.slice(0, 1)}</span></ActionButton>
        </div>
      </div>
    </header>}
    <main className="main-content">{children}</main>
    {showNav && <nav className="bottom-nav" aria-label="التنقل الرئيسي">
      {navItems.map((item) => <button key={item.id} className={`nav-item ${activeTab === item.id ? 'selected' : ''}`} onClick={() => onNavigate(item.id)} aria-current={activeTab === item.id ? 'page' : undefined}>
        <span className="nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>{activeTab === item.id && <i />}
      </button>)}
    </nav>}
    {showNav && <footer className="site-footer"><span>سمكرو · {footerLabel}</span><span>© Samkaro</span></footer>}
  </div>
}
