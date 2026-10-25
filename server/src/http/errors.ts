export class HttpError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message)
    this.name = 'HttpError'
  }
}

export function assertOrigin(origin: string | undefined, allowed: Set<string>): void {
  if (!origin || !allowed.has(origin)) throw new HttpError(403, 'UNTRUSTED_ORIGIN', 'Request origin is not trusted.')
}
