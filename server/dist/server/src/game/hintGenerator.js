import { randomInt as cryptoRandomInt } from 'node:crypto';
/** Weights are integer percentages, so tier boundaries have no float ambiguity. */
export const HINT_TIER_DISTRIBUTION = {
    weak: 15,
    standard: 55,
    strong: 25,
    exact: 2,
    nearExact: 3,
};
const DISTRIBUTION_TOTAL = Object.values(HINT_TIER_DISTRIBUTION).reduce((total, weight) => total + weight, 0);
if (DISTRIBUTION_TOTAL !== 100)
    throw new Error('HINT_TIER_DISTRIBUTION_MUST_TOTAL_100');
export function selectHintTier(roll) {
    if (!Number.isInteger(roll) || roll < 0 || roll >= 100)
        throw new RangeError('HINT_ROLL_OUT_OF_RANGE');
    if (roll < 15)
        return 'weak';
    if (roll < 70)
        return 'standard';
    if (roll < 95)
        return 'strong';
    if (roll < 97)
        return 'exact';
    return 'nearExact';
}
function validateDomain(answer, domain) {
    const min = domain.min ?? Number.MIN_SAFE_INTEGER;
    const max = domain.max ?? Number.MAX_SAFE_INTEGER;
    if (!Number.isSafeInteger(answer) || !Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min > max || answer < min || answer > max) {
        throw new RangeError('INVALID_HINT_INTEGER_DOMAIN');
    }
    return { answer: BigInt(answer), min: BigInt(min), max: BigInt(max) };
}
function rangeForCount(answer, count, domain, randomInt) {
    const values = validateDomain(answer, domain);
    const requested = BigInt(count);
    const domainSize = values.max - values.min + 1n;
    let low;
    let high;
    if (domainSize < requested) {
        // The narrowest valid fallback that honors the domain is the whole domain.
        low = values.min;
        high = values.max;
    }
    else {
        const firstStart = values.min > values.answer - requested + 1n ? values.min : values.answer - requested + 1n;
        const lastStart = values.answer < values.max - requested + 1n ? values.answer : values.max - requested + 1n;
        const choices = Number(lastStart - firstStart + 1n);
        const offset = randomInt(choices);
        if (!Number.isInteger(offset) || offset < 0 || offset >= choices)
            throw new RangeError('INVALID_HINT_RANDOM_SOURCE');
        low = firstStart + BigInt(offset);
        high = low + requested - 1n;
    }
    return `${Number(low).toLocaleString('en-US')} – ${Number(high).toLocaleString('en-US')}`;
}
export function generateHintForTier(answer, tier, randomInt = cryptoRandomInt, domain = {}) {
    validateDomain(answer, domain);
    if (tier === 'exact') {
        return { range: answer.toLocaleString('en-US'), accuracy: 'إجابة محددة', advisoryNote: 'ده الرقم اللي هتخمّنه. ثبّت إجابتك زي ما هي.', exact: true };
    }
    const count = tier === 'weak' ? 20
        : tier === 'standard' ? 10
            : tier === 'nearExact' ? 2
                : randomInt(2) + 3;
    if (tier === 'strong' && count !== 3 && count !== 4)
        throw new RangeError('INVALID_HINT_RANDOM_SOURCE');
    const range = rangeForCount(answer, count, domain, randomInt);
    const accuracy = tier === 'weak' ? 'مدى واسع'
        : tier === 'standard' ? 'مدى متوسط'
            : tier === 'strong' ? 'مدى ضيق'
                : 'رقمان محتملان';
    return { range, accuracy, advisoryNote: 'الإجابة الصحيحة موجودة جوّه المدى.' };
}
/** Samples afresh for one player. Call once and persist the returned private hint for the round. */
export function generatePlayerHint(answer, randomInt = cryptoRandomInt, domain = {}) {
    const roll = randomInt(100);
    if (!Number.isInteger(roll) || roll < 0 || roll >= 100)
        throw new RangeError('INVALID_HINT_RANDOM_SOURCE');
    return generateHintForTier(answer, selectHintTier(roll), randomInt, domain);
}
