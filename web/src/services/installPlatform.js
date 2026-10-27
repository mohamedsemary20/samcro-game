export function isStandaloneMode(displayModeStandalone, navigatorStandalone = false) {
  return Boolean(displayModeStandalone || navigatorStandalone)
}

export function shouldOfferIosInstallHelp({ userAgent = '', platform = '', maxTouchPoints = 0, standalone = false }) {
  if (standalone) return false
  const iosDevice = /iPhone|iPad|iPod/i.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1)
  const iosBrowser = /Safari/i.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(userAgent)
  return iosDevice && iosBrowser
}
