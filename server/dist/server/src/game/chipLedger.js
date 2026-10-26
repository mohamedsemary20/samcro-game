export const STARTING_CHIPS = 500;
export const ROUND_ANTE = 50;
export const EMERGENCY_LOAN = 200;
export function canEnterRound(account) {
    return Number.isSafeInteger(account.chips) && account.chips >= ROUND_ANTE;
}
/** An ante is all-or-nothing: players below 50 chips sit out the round. */
export function collectAnte(account) {
    if (!canEnterRound(account))
        throw new Error('INSUFFICIENT_ANTE_BALANCE');
    return { account: { ...account, chips: account.chips - ROUND_ANTE }, potContribution: ROUND_ANTE };
}
/** The 200-chip emergency loan is optional and available once in a match. */
export function takeEmergencyLoan(account) {
    if (account.loanTaken)
        throw new Error('LOAN_ALREADY_TAKEN');
    if (!Number.isSafeInteger(account.chips) || account.chips < 0 || !Number.isSafeInteger(account.debt) || account.debt < 0) {
        throw new Error('INVALID_CHIP_ACCOUNT');
    }
    if (account.chips >= ROUND_ANTE)
        throw new Error('LOAN_NOT_NEEDED');
    return { chips: account.chips + EMERGENCY_LOAN, debt: account.debt + EMERGENCY_LOAN, loanTaken: true };
}
/** Apply available chips to debt at match end before producing leaderboard net worth. */
export function repayDebtAtMatchEnd(account) {
    if (!Number.isSafeInteger(account.chips) || account.chips < 0 || !Number.isSafeInteger(account.debt) || account.debt < 0) {
        throw new Error('INVALID_CHIP_ACCOUNT');
    }
    const repayment = Math.min(account.chips, account.debt);
    return { ...account, chips: account.chips - repayment, debt: account.debt - repayment };
}
export function calculateNetWorth(account) {
    return account.chips - account.debt;
}
