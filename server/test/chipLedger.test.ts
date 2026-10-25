import { describe, expect, it } from 'vitest'
import { calculateNetWorth, canEnterRound, collectAnte, repayDebtAtMatchEnd, takeEmergencyLoan } from '../src/game/chipLedger.js'

describe('confirmed chip policies', () => {
  it('collects a full 50-chip ante and rejects a player below 50', () => {
    expect(canEnterRound({ chips: 50, debt: 0, loanTaken: false })).toBe(true)
    expect(collectAnte({ chips: 50, debt: 0, loanTaken: false })).toEqual({
      account: { chips: 0, debt: 0, loanTaken: false }, potContribution: 50,
    })
    expect(canEnterRound({ chips: 49, debt: 0, loanTaken: false })).toBe(false)
    expect(() => collectAnte({ chips: 49, debt: 0, loanTaken: false })).toThrow('INSUFFICIENT_ANTE_BALANCE')
  })

  it('allows one optional loan and rejects a second draw', () => {
    expect(() => takeEmergencyLoan({ chips: 50, debt: 0, loanTaken: false })).toThrow('LOAN_NOT_NEEDED')
    const account = takeEmergencyLoan({ chips: 0, debt: 0, loanTaken: false })
    expect(account).toEqual({ chips: 200, debt: 200, loanTaken: true })
    expect(() => takeEmergencyLoan(account)).toThrow('LOAN_ALREADY_TAKEN')
  })

  it('repays available chips at match end and retains any unpaid debt', () => {
    const account = repayDebtAtMatchEnd({ chips: 80, debt: 200, loanTaken: true })
    expect(account).toEqual({ chips: 0, debt: 120, loanTaken: true })
    expect(calculateNetWorth(account)).toBe(-120)
  })
})
