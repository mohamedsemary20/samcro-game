function validSafeInteger(value) {
    return Number.isSafeInteger(value) && value >= 0;
}
/** Percentage error for ordinary numbers; absolute error for years; zero answers require an exact guess. */
export function scoreGuess(answer, guess, type) {
    if (!validSafeInteger(answer) || !validSafeInteger(guess))
        throw new Error('INVALID_NUMERIC_ANSWER');
    const difference = BigInt(guess >= answer ? guess - answer : answer - guess);
    if (type === 'year')
        return { numerator: difference, denominator: 1n };
    if (answer === 0)
        return difference === 0n ? { numerator: 0n, denominator: 1n } : null;
    return { numerator: difference, denominator: BigInt(answer) };
}
function compareErrors(left, right) {
    const leftScaled = left.numerator * right.denominator;
    const rightScaled = right.numerator * left.denominator;
    return leftScaled < rightScaled ? -1 : leftScaled > rightScaled ? 1 : 0;
}
export function findWinners(answer, type, guesses, eligiblePlayerIds) {
    const scored = guesses.flatMap((guess) => {
        if (!eligiblePlayerIds.has(guess.playerId))
            return [];
        const error = scoreGuess(answer, guess.value, type);
        return error ? [{ playerId: guess.playerId, error }] : [];
    });
    if (scored.length === 0)
        return [];
    let best = scored[0].error;
    for (const entry of scored.slice(1))
        if (compareErrors(entry.error, best) < 0)
            best = entry.error;
    return scored.filter((entry) => compareErrors(entry.error, best) === 0).map((entry) => entry.playerId).sort(compareIds);
}
function compareIds(left, right) { return left < right ? -1 : left > right ? 1 : 0; }
/** Splits a whole-chip pot evenly; remainders go to ascending player IDs deterministically. */
export function splitPot(pot, winnerIds) {
    if (!Number.isSafeInteger(pot) || pot < 0 || winnerIds.length === 0 || new Set(winnerIds).size !== winnerIds.length) {
        throw new Error('INVALID_PAYOUT');
    }
    const orderedIds = [...winnerIds].sort(compareIds);
    const share = Math.floor(pot / orderedIds.length);
    const remainder = pot % orderedIds.length;
    return orderedIds.map((playerId, index) => ({ playerId, amount: share + (index < remainder ? 1 : 0) }));
}
