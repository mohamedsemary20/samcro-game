import type { PropsWithChildren } from 'react'
import type { NavigationTab } from '../domain/types'
import { ActionButton } from './ActionButton'
import { Icon, type IconName } from './Icon'
import { InstallExperience } from './InstallExperience'
import { PlayerAvatar } from './PlayerAvatar'
import { StatusBadge, type StatusTone } from './StatusBadge'

const navItems: { id: NavigationTab; label: string; icon: IconName }[] = [
  { id: 'home', label: 'الرئيسية', icon: 'home' },
  { id: 'lobby', label: 'الغرفة', icon: 'users' },
  { id: 'leaderboard', label: 'النتيجة', icon: 'trophy' },
  { id: 'profile', label: 'ملفي', icon: 'user' },
]

export function AppShell({
  children, activeTab, onNavigate, chips, showNav = true, showWallet = true,
  modeLabel = 'معاينة محلية', modeTone = 'neutral', playerLabel = 'لاعب', footerLabel = 'معاينة محلية',
}: PropsWithChildren<{
  activeTab: NavigationTab
  onNavigate: (tab: NavigationTab) => void
  chips: number
  showNav?: boolean
  showWallet?: boolean
  modeLabel?: string
  modeTone?: StatusTone
  playerLabel?: string
  footerLabel?: string
}>) {
  return <div className="app-shell">
    {showNav && <header className="topbar">
      <div className="topbar-inner">
        <button type="button" className="brand-lockup" onClick={() => onNavigate('home')} aria-label="سمكرو - الرئيسية">
          <span className="brand-mark" aria-hidden="true"><Icon name="crown" size={20} /></span>
          <span className="brand-copy"><strong>سمكرو</strong><small>لعبة التلميح والتخمين</small></span>
        </button>

        <nav className="desktop-nav" aria-label="التنقل الرئيسي">
          {navItems.map((item) => <button key={item.id} type="button" className={`desktop-nav-item${activeTab === item.id ? ' selected' : ''}`} onClick={() => onNavigate(item.id)} aria-current={activeTab === item.id ? 'page' : undefined}>
            <Icon name={item.icon} size={17} />{item.label}
          </button>)}
        </nav>

        <div className="topbar-actions">
          <StatusBadge tone={modeTone} dot={modeTone === 'online' || modeTone === 'offline'} className="topbar-status">{modeLabel}</StatusBadge>
          {showWallet && <div className="chip-wallet"><span aria-hidden="true">◉</span><strong>{chips.toLocaleString('en-US')}</strong><small>فيش</small></div>}
          <ActionButton tone="quiet" className="top-profile" onClick={() => onNavigate('profile')} aria-label={`ملف ${playerLabel}`}>
            <span className="top-profile-name">{playerLabel}</span>
            <PlayerAvatar name={playerLabel} playerId={playerLabel} size="sm" />
          </ActionButton>
        </div>
      </div>
    </header>}

    <main className="main-content">{children}</main>

    {showNav && <nav className="bottom-nav" aria-label="التنقل الرئيسي">
      {navItems.map((item) => <button key={item.id} type="button" className={`nav-item${activeTab === item.id ? ' selected' : ''}`} onClick={() => onNavigate(item.id)} aria-current={activeTab === item.id ? 'page' : undefined}>
        <span className="nav-icon"><Icon name={item.icon} size={20} /></span><span>{item.label}</span>{activeTab === item.id && <i aria-hidden="true" />}
      </button>)}
    </nav>}

    {showNav && <InstallExperience />}
    {showNav && <footer className="site-footer"><span>سمكرو · {footerLabel}</span><span><bdi lang="en" dir="ltr">© Samkaro</bdi></span></footer>}
  </div>
}
