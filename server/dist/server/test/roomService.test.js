import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
const { db } = vi.hoisted(() => {
    const transaction = {
        room: { findUnique: vi.fn(), update: vi.fn() },
        roomMember: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn() },
    };
    const prisma = {
        room: { findUnique: vi.fn(), update: vi.fn() },
        roomMember: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn() },
        $transaction: vi.fn(),
    };
    return { db: { transaction, prisma } };
});
vi.mock('../src/db/prisma.js', () => ({ prisma: db.prisma }));
vi.stubEnv('DATABASE_URL', 'postgresql://samkaro:test@localhost:5432/samkaro_test');
const { expireDisconnectedLobbyMembers, getRoomForPlayer, joinRoom, leaveRoom } = await import('../src/rooms/roomService.js');
const roomSnapshot = {
    id: 'room-1', code: 'ABCD2345', hostPlayerId: 'next-host', status: 'WAITING', capacity: 3,
    members: [
        { playerId: 'next-host', isReady: false, player: { id: 'next-host', displayName: 'Next' } },
        { playerId: 'guest', isReady: false, player: { id: 'guest', displayName: 'Guest' } },
    ],
};
describe('room service lifecycle with a mocked Prisma boundary', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        db.prisma.$transaction.mockImplementation((work) => work(db.transaction));
    });
    afterAll(() => vi.unstubAllEnvs());
    it('denies room reads to a missing or departed player', async () => {
        db.prisma.roomMember.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ leftAt: new Date() });
        await expect(getRoomForPlayer('room-1', 'stranger')).rejects.toMatchObject({ status: 403, code: 'ROOM_MEMBERSHIP_REQUIRED' });
        await expect(getRoomForPlayer('room-1', 'departed')).rejects.toMatchObject({ status: 403, code: 'ROOM_MEMBERSHIP_REQUIRED' });
        expect(db.prisma.room.findUnique).not.toHaveBeenCalled();
    });
    it('hands the host role to the oldest connected active member when the host leaves', async () => {
        db.transaction.roomMember.findUnique.mockResolvedValue({ leftAt: null });
        db.transaction.room.findUnique.mockResolvedValue({ hostPlayerId: 'host' });
        db.transaction.roomMember.findFirst.mockResolvedValue({ playerId: 'next-host' });
        db.prisma.room.findUnique.mockResolvedValue(roomSnapshot);
        const result = await leaveRoom('room-1', 'host');
        expect(db.transaction.roomMember.update).toHaveBeenCalledWith(expect.objectContaining({
            where: { roomId_playerId: { roomId: 'room-1', playerId: 'host' } },
            data: expect.objectContaining({ disconnectedAt: null, leftAt: expect.any(Date) }),
        }));
        expect(db.transaction.roomMember.findFirst).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({ roomId: 'room-1', leftAt: null, disconnectedAt: null, playerId: { not: 'host' } }),
            orderBy: { joinedAt: 'asc' },
        }));
        expect(db.transaction.room.update).toHaveBeenCalledWith({ where: { id: 'room-1' }, data: { hostPlayerId: 'next-host' } });
        expect(result?.hostPlayerId).toBe('next-host');
    });
    it('rejects a voluntary leave during an active match without changing membership', async () => {
        db.transaction.roomMember.findUnique.mockResolvedValue({ leftAt: null });
        db.transaction.room.findUnique.mockResolvedValue({ hostPlayerId: 'host', status: 'IN_PROGRESS' });
        await expect(leaveRoom('room-1', 'host')).rejects.toMatchObject({ status: 409, code: 'MATCH_IN_PROGRESS' });
        expect(db.transaction.roomMember.update).not.toHaveBeenCalled();
    });
    it('re-activates a departed member on rejoin and resets readiness and disconnect state', async () => {
        db.prisma.room.findUnique.mockResolvedValueOnce({ id: 'room-1', status: 'WAITING', capacity: 3 }).mockResolvedValueOnce(roomSnapshot);
        db.transaction.room.findUnique.mockResolvedValue({ status: 'WAITING', capacity: 3 });
        db.transaction.roomMember.findUnique.mockResolvedValue({ leftAt: new Date(), disconnectedAt: new Date(), isReady: true });
        db.transaction.roomMember.count.mockResolvedValue(2);
        db.transaction.roomMember.update.mockResolvedValue(undefined);
        db.prisma.roomMember.findUnique.mockResolvedValue({ leftAt: null });
        const result = await joinRoom('guest', 'ABCD2345');
        expect(db.transaction.roomMember.update).toHaveBeenCalledWith(expect.objectContaining({
            where: { roomId_playerId: { roomId: 'room-1', playerId: 'guest' } },
            data: { leftAt: null, disconnectedAt: null, isReady: false, joinedAt: expect.any(Date) },
        }));
        expect(result.playerIds).toContain('guest');
    });
    it('expires disconnected waiting-room members after the configured grace period but keeps in-game members', async () => {
        const now = new Date('2026-10-24T00:00:00.000Z');
        db.transaction.roomMember.findMany.mockResolvedValue([
            { roomId: 'waiting-room', playerId: 'waiting-host' },
            { roomId: 'active-room', playerId: 'active-player' },
        ]);
        db.transaction.room.findUnique.mockResolvedValueOnce({ hostPlayerId: 'waiting-host', status: 'WAITING' })
            .mockResolvedValueOnce({ hostPlayerId: 'someone-else', status: 'IN_PROGRESS' });
        db.transaction.roomMember.findFirst.mockResolvedValue({ playerId: 'connected-successor' });
        await expect(expireDisconnectedLobbyMembers(now)).resolves.toEqual(['waiting-room']);
        expect(db.transaction.roomMember.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({ disconnectedAt: { lte: new Date(now.getTime() - 60_000) } }),
        }));
        expect(db.transaction.roomMember.update).toHaveBeenCalledTimes(1);
        expect(db.transaction.roomMember.update).toHaveBeenCalledWith(expect.objectContaining({ data: { leftAt: now } }));
        expect(db.transaction.room.update).toHaveBeenCalledWith({ where: { id: 'waiting-room' }, data: { hostPlayerId: 'connected-successor' } });
    });
});
