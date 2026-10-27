import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import { isStandaloneMode, shouldOfferIosInstallHelp } from '../services/installPlatform.js'

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: InstallPromptEvent
  }
  interface Navigator {
    standalone?: boolean
  }
}

export function InstallExperience() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [standalone, setStandalone] = useState(false)
  const [iosHelp, setIosHelp] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const updateStandalone = () => setStandalone(isStandaloneMode(window.matchMedia('(display-mode: standalone)').matches, navigator.standalone))
    const handleInstallPrompt = (event: InstallPromptEvent) => {
      event.preventDefault()
      setInstallPrompt(event)
    }
    const handleInstalled = () => {
      setStandalone(true)
      setInstallPrompt(null)
      setIosHelp(false)
    }
    updateStandalone()
    window.matchMedia('(display-mode: standalone)').addEventListener('change', updateStandalone)
    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.matchMedia('(display-mode: standalone)').removeEventListener('change', updateStandalone)
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const showIosHelp = shouldOfferIosInstallHelp({
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
    standalone,
  })

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (iosHelp && !dialog.open) dialog.showModal()
    if (!iosHelp && dialog.open) dialog.close()
  }, [iosHelp])

  async function install(): Promise<void> {
    if (!installPrompt) return
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') setInstallPrompt(null)
  }

  if (standalone || dismissed || (!installPrompt && !showIosHelp)) return null

  return <>
    <aside className="install-nudge" aria-label="تثبيت سمكرو">
      <span className="install-nudge-mark"><Icon name="download" size={18} /></span>
      <span className="install-nudge-copy"><strong>سمكرو على موبايلك</strong><small>افتح اللعبة من شاشتك الرئيسية</small></span>
      <button className="install-nudge-action" type="button" onClick={() => installPrompt ? void install() : setIosHelp(true)}>{installPrompt ? 'تثبيت' : 'إزاي؟'}</button>
      <button className="install-nudge-close" type="button" aria-label="إخفاء اقتراح التثبيت" onClick={() => setDismissed(true)}><Icon name="close" size={17} /></button>
    </aside>
    <dialog className="install-dialog" ref={dialogRef} onCancel={() => setIosHelp(false)} aria-labelledby="install-dialog-title">
      <div className="install-dialog-mark"><img src="/assets/app-logo.png" alt="" /></div>
      <span className="sam-eyebrow">تجربة سمكرو</span>
      <h2 id="install-dialog-title">ضيفها لشاشتك الرئيسية</h2>
      <p>من Safari اضغط زر المشاركة، وبعدها اختار «إضافة إلى الشاشة الرئيسية».</p>
      <div className="install-steps"><span><b>١</b> مشاركة</span><span><b>٢</b> إضافة إلى الشاشة الرئيسية</span><span><b>٣</b> إضافة</span></div>
      <button className="button button-gold" type="button" onClick={() => setIosHelp(false)}>تمام</button>
    </dialog>
  </>
}
