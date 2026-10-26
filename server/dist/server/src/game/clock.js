export const DECISION_TIMEOUT_MS = 30_000;
export const systemClock = { now: () => Date.now() };
export function createDecisionDeadline(clock = systemClock) {
    return new Date(clock.now() + DECISION_TIMEOUT_MS);
}
/** The caller runs the regular server-authoritative fold transition when this returns true. */
export function decisionHasTimedOut(deadline, clock = systemClock) {
    return clock.now() >= deadline.getTime();
}
