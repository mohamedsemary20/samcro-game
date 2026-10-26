/** Routes each private projection only to the authenticated player's socket room. */
export function deliverPrivateStates(states, emit) {
    for (const state of states)
        emit(`player:${state.playerId}`, state);
}
