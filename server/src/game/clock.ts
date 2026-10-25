export const DECISION_TIMEOUT_MS = 30_000

export interface Clock { now(): number }
export const systemClock: Clock = { now: () => Date.now() }

export function createDecisionDeadline(clock: Clock = systemClock): Date {
  return new Date(clock.now() + DECISION_TIMEOUT_MS)
}

/** The caller runs the regular server-authoritative fold transition when this returns true. */
export function decisionHasTimedOut(deadline: Date, clock: Clock = systemClock): boolean {
  return clock.now() >= deadline.getTime()
}
