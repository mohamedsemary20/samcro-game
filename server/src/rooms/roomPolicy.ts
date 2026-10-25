export function hasActiveMembership(member: { leftAt: Date | null } | null): boolean {
  return member !== null && member.leftAt === null
}

export function roomHasCapacity(capacity: number, activeMemberCount: number): boolean {
  return Number.isInteger(capacity) && capacity >= 3 && capacity <= 7
    && Number.isInteger(activeMemberCount) && activeMemberCount >= 0
    && activeMemberCount < capacity
}

/** A live match keeps its original participants; leaving is represented by disconnect and timeout. */
export function roomAllowsMemberLeave(status: 'WAITING' | 'IN_PROGRESS' | 'FINISHED'): boolean {
  return status !== 'IN_PROGRESS'
}
