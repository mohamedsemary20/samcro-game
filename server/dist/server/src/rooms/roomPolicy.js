export function hasActiveMembership(member) {
    return member !== null && member.leftAt === null;
}
export function roomHasCapacity(capacity, activeMemberCount) {
    return Number.isInteger(capacity) && capacity >= 3 && capacity <= 7
        && Number.isInteger(activeMemberCount) && activeMemberCount >= 0
        && activeMemberCount < capacity;
}
/** A live match keeps its original participants; leaving is represented by disconnect and timeout. */
export function roomAllowsMemberLeave(status) {
    return status !== 'IN_PROGRESS';
}
