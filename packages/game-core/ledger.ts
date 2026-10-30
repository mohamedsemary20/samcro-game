export const STARTING_CHIPS = 500
export const ROUND_ANTE = 50
export const EMERGENCY_LOAN = 200

export interface ChipAccount { chips: number; debt: number; loanTaken: boolean }

export function canEnterRound(account: ChipAccount): boolean { return Number.isSafeInteger(account.chips) && account.chips >= ROUND_ANTE }

export function collectAnte(account: ChipAccount): { account: ChipAccount; potContribution: number } {
  if (!canEnterRound(account)) throw new Error('INSUFFICIENT_ANTE_BALANCE')
  return { account: { ...account, chips: account.chips - ROUND_ANTE }, potContribution: ROUND_ANTE }
}

export function takeEmergencyLoan(account: ChipAccount): ChipAccount {
  if (account.loanTaken) throw new Error('LOAN_ALREADY_TAKEN')
  if (!Number.isSafeInteger(account.chips) || account.chips < 0 || !Number.isSafeInteger(account.debt) || account.debt < 0) throw new Error('INVALID_CHIP_ACCOUNT')
  if (account.chips >= ROUND_ANTE) throw new Error('LOAN_NOT_NEEDED')
  return { chips: account.chips + EMERGENCY_LOAN, debt: account.debt + EMERGENCY_LOAN, loanTaken: true }
}

export function repayDebtAtMatchEnd(account: ChipAccount): ChipAccount {
  if (!Number.isSafeInteger(account.chips) || account.chips < 0 || !Number.isSafeInteger(account.debt) || account.debt < 0) throw new Error('INVALID_CHIP_ACCOUNT')
  const repayment = Math.min(account.chips, account.debt)
  return { ...account, chips: account.chips - repayment, debt: account.debt - repayment }
}

export function calculateNetWorth(account: Pick<ChipAccount, 'chips' | 'debt'>): number { return account.chips - account.debt }
