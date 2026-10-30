import { useEffect, useState } from 'react'
import { AppDialog } from './AppDialog'
import { Icon } from './Icon'
import { isStandaloneMode, shouldOfferIosInstallHelp } from '../services/installPlatform.js'

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: InstallPromptEvent
    'samkaro:install-request': Event
  }
  interface Navigator {
    standalone?: boolean
  }
}

const DISMISS_KEY = 'samkaro.install-nudge-dismissed-at'
const DISMISS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

function wasRecentlyDismissed(): boolean {
  try {
    const stored = Number(window.localStorage.getItem(DISMISS_KEY))
    return Number.isFinite(stored) && stored > 0 && Date.now() - stored < DISMISS_WINDOW_MS
  } catch {
    return false
  }
}

export function InstallExperience() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [standalone, setStandalone] = useState(false)
  const [help, setHelp] = useState<'ios' | 'manual' | null>(null)
  const [dismissed, setDismissed] = useState(wasRecentlyDismissed)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    const updateStandalone = () => setStandalone(isStandaloneMode(window.matchMedia('(display-mode: standalone)').matches, navigator.standalone))
    const handleInstallPrompt = (event: InstallPromptEvent) => {
      event.preventDefault()
      setInstallPrompt(event)
    }
    const handleInstalled = () => {
      setStandalone(true)
      setInstallPrompt(null)
      setHelp(null)
      try { window.localStorage.removeItem(DISMISS_KEY) } catch { /* Storage may be unavailable in private browsing. */ }
    }
    updateStandalone()
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    mediaQuery.addEventListener('change', updateStandalone)
    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      mediaQuery.removeEventListener('change', updateStandalone)
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const iosHelp = shouldOfferIosInstallHelp({
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
    standalone,
  })

  async function install(): Promise<void> {
    if (!installPrompt || installing) return
    setInstalling(true)
    try {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      if (choice.outcome === 'accepted') {
        setInstallPrompt(null)
        setDismissed(true)
      }
    } finally {
      setInstalling(false)
    }
  }

  function dismissNudge(): void {
    setDismissed(true)
    try { window.localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch { /* Dismissal is best effort only. */ }
  }

  useEffect(() => {
    const handleRequest = () => {
      if (standalone) return
      if (installPrompt) { void install(); return }
      setHelp(iosHelp ? 'ios' : 'manual')
    }
    window.addEventListener('samkaro:install-request', handleRequest)
    return () => window.removeEventListener('samkaro:install-request', handleRequest)
  })

  const canOfferInstall = Boolean(installPrompt || iosHelp)

  return <>
    {!standalone && !dismissed && canOfferInstall && !help && <aside className="install-nudge" aria-label="تثبيت سمكرو">
      <span className="install-nudge-mark"><Icon name="download" size={18} /></span>
      <span className="install-nudge-copy"><strong>سمكرو على موبايلك</strong><small>افتح اللعبة من شاشتك الرئيسية</small></span>
      <button className="install-nudge-action" type="button" disabled={installing} onClick={() => installPrompt ? void install() : setHelp('ios')}>{installing ? 'بنجهّز…' : installPrompt ? 'تثبيت' : 'إزاي؟'}</button>
      <button className="install-nudge-close" type="button" aria-label="إخفاء اقتراح التثبيت" onClick={dismissNudge}><Icon name="close" size={17} /></button>
    </aside>}

    <AppDialog
      open={help !== null}
      title={help === 'ios' ? 'ضيف سمكرو لشاشتك الرئيسية' : 'ثبّت سمكرو كتطبيق'}
      description={help === 'ios' ? 'من Safari على iPhone أو iPad، الخطوات بسيطة:' : 'من قائمة المتصفح، اختار «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».'}
      icon="download"
      confirmLabel="تمام"
      showCancel={false}
      onConfirm={() => setHelp(null)}
      onClose={() => setHelp(null)}
    >
      <div className="install-steps">
        {help === 'ios'
          ? <><span><b>١</b> دوس على زر المشاركة في Safari.</span><span><b>٢</b> اختار «إضافة إلى الشاشة الرئيسية».</span><span><b>٣</b> اضغط «إضافة».</span></>
          : <><span><b>١</b> افتح قائمة المتصفح (⋮).</span><span><b>٢</b> اختار «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».</span><span><b>٣</b> أكد التثبيت.</span></>}
      </div>
      <p className="install-dialog-note"><Icon name="shield" size={15} /> التثبيت مش بيغيّر حسابك أو غرفتك؛ سمكرو هتفتح في نافذة مستقلة.</p>
    </AppDialog>
  </>
}
