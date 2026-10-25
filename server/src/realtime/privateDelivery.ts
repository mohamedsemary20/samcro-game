import type { PrivatePlayerState } from '../../../shared/contracts.js'

/** Routes each private projection only to the authenticated player's socket room. */
export function deliverPrivateStates(
  states: PrivatePlayerState[],
  emit: (room: string, state: PrivatePlayerState) => void,
): void {
  for (const state of states) emit(`player:${state.playerId}`, state)
}
