export function parseCookies(header: string | undefined): Map<string, string> {
  const cookies = new Map<string, string>()
  for (const part of header?.split(';') ?? []) {
    const separator = part.indexOf('=')
    if (separator > 0) {
      const key = part.slice(0, separator).trim()
      const value = part.slice(separator + 1).trim()
      try {
        cookies.set(key, decodeURIComponent(value))
      } catch {
        // Ignore malformed cookie values.
      }
    }
  }
  return cookies
}

/** Accept the existing cookie contract and the additive native bearer contract. */
export function resolveSessionToken(input: {
  authorization?: string | undefined
  cookieHeader?: string | undefined
  cookieName: string
  nativeToken?: unknown
}): string | null {
  const bearer = input.authorization?.match(/^Bearer ([A-Za-z0-9_-]{1,128})$/i)?.[1]
  const native = typeof input.nativeToken === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(input.nativeToken)
    ? input.nativeToken
    : null
  const cookie = parseCookies(input.cookieHeader).get(input.cookieName)
  const token = native ?? bearer ?? cookie ?? null
  return token && /^[A-Za-z0-9_-]{1,128}$/.test(token) ? token : null
}
