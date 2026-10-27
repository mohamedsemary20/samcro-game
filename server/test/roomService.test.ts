import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const { db } = vi.hoisted(() => {
  const transaction = {
    room: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    roomMember: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  }
  const prisma = {
    room: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    roomMember: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    $transaction: vi.fn(),
  }
  return { db: { transaction, prisma } }
})

vi.mock('../src/db/prisma.js', () => ({ prisma: db.prisma }))
vi.stubEnv('DATABASE_URL', 'postgresql://samkaro:test@localhost:5432/samkaro_test')

const { createRoom, expireDisconnectedLobbyMembers, getRoomForPlayer, joinRoom, leaveRoom, restoreRoomMembership, setReady } = await import('../src/rooms/roomService.js')

const roomSnapshot = {
  id: 'room-1', code: 'ABCD2345', hostPlayerId: 'next-host', status: 'WAITING' as const, capacity: 3,
  members: [
    { playerId: 'next-host', isReady: false, disconnectedAt: null, player: { id: 'next-host', displayName: 'Next' } },
    { playerId: 'guest', isReady: false, disconnectedAt: null, player: { id: 'guest', displayName: 'Guest' } },
  ],
}

describe('room service lifecycle with a mocked Prisma boundary', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    db.prisma.$transaction.mockImplementation((work: (transaction: typeof db.transaction) => unknown) => work(db.transaction))
  })

  afterAll(() => vi.unstubAllEnvs())

  it('denies room reads to a missing or departed player', async () => {
    db.prisma.roomMember.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ leftAt: new Date() })

    await expect(getRoomForPlayer('room-1', 'stranger')).rejects.toMatchObject({ status: 403, code: 'ROOM_MEMBERSHIP_REQUIRED' })
    await expect(getRoomForPlayer('room-1', 'departed')).rejects.toMatchObject({ status: 403, code: 'ROOM_MEMBERSHIP_REQUIRED' })
    expect(db.prisma.room.findUnique).not.toHaveBeenCalled()
  })

  it('returns the existing room for a retried create idempotency key', async () => {
    db.prisma.room.findUnique.mockResolvedValue({ ...roomSnapshot, createRequestKey: 'retry-key' })

    await expect(createRoom('next-host', 3, 'retry-key')).resolves.toMatchObject({
      id: 'room-1', code: 'ABCD2345', hostPlayerId: 'next-host', playerIds: ['next-host', 'guest'],
    })
    expect(db.prisma.$transaction).not.toHaveBeenCalled()
  })

  it('returns the ready state from the same authoritative room snapshot', async () => {
    db.transaction.room.findUnique.mockResolvedValueOnce({ ...roomSnapshot, status: 'WAITING' }).mockResolvedValueOnce({
      ...roomSnapshot,
      members: roomSnapshot.members.map((member) => member.playerId === 'guest' ? { ...member, isReady: true } : member),
    })

    await expect(setReady('room-1', 'guest', true)).resolves.toMatchObject({ readyPlayerIds: ['guest'] })
    expect(db.transaction.roomMember.update).toHaveBeenCalledWith({
      where: { roomId_playerId: { roomId: 'room-1', playerId: 'guest' } },
      data: { isReady: true },
    })
    expect(db.transaction.room.findUnique).toHaveBeenCalledTimes(2)
    expect(db.prisma.roomMember.findUnique).not.toHaveBeenCalled()
    expect(db.prisma.room.findUnique).not.toHaveBeenCalled()
  })

  it('restores a reconnecting member and returns its snapshot atomically', async () => {
    const disconnectedAt = new Date(Date.now() - 1000)
    db.transaction.roomMember.findUnique.mockResolvedValue({ leftAt: null, disconnectedAt, room: { status: 'WAITING' } })
    db.transaction.roomMember.updateMany.mockResolvedValue({ count: 1 })
    db.transaction.room.findUnique.mockResolvedValue(roomSnapshot)

    await expect(restoreRoomMembership('room-1', 'guest')).resolves.toMatchObject({
      connectedPlayerIds: expect.arrayContaining(['guest']),
    })
    expect(db.transaction.roomMember.updateMany).toHaveBeenCalledWith({
      where: { roomId: 'room-1', playerId: 'guest', leftAt: null },
      data: { disconnectedAt: null },
    })
    expect(db.transaction.room.findUnique).toHaveBeenCalledTimes(1)
    expect(db.prisma.roomMember.updateMany).not.toHaveBeenCalled()
    expect(db.prisma.room.findUnique).not.toHaveBeenCalled()
  })

  it('hands the host role to the oldest connected active member when the host leaves', async () => {
    db.transaction.roomMember.findUnique.mockResolvedValue({ leftAt: null })
    db.transaction.room.findUnique.mockResolvedValue({ hostPlayerId: 'host', status: 'WAITING' })
    db.transaction.roomMember.findFirst.mockResolvedValue({ playerId: 'next-host' })
    db.transaction.roomMember.updateMany.mockResolvedValue({ count: 1 })
    db.transaction.room.updateMany.mockResolvedValue({ count: 1 })
    db.prisma.room.findUnique.mockResolvedValue(roomSnapshot)

    const result = await leaveRoom('room-1', 'host')

    expect(db.transaction.roomMember.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { roomId: 'room-1', playerId: 'host', leftAt: null },
      data: expect.objectContaining({ disconnectedAt: null, leftAt: expect.any(Date) }),
    }))
    expect(db.transaction.roomMember.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ roomId: 'room-1', leftAt: null, disconnectedAt: null, playerId: { not: 'host' } }),
      orderBy: { joinedAt: 'asc' },
    }))
    expect(db.transaction.room.updateMany).toHaveBeenCalledWith({ where: { id: 'room-1', hostPlayerId: 'host' }, data: { hostPlayerId: 'next-host' } })
    expect(result?.hostPlayerId).toBe('next-host')
  })

  it('rejects a voluntary leave during an active match without changing membership', async () => {
    db.transaction.roomMember.findUnique.mockResolvedValue({ leftAt: null })
    db.transaction.room.findUnique.mockResolvedValue({ hostPlayerId: 'host', status: 'IN_PROGRESS' })

    await expect(leaveRoom('room-1', 'host')).rejects.toMatchObject({ status: 409, code: 'MATCH_IN_PROGRESS' })
    expect(db.transaction.roomMember.updateMany).not.toHaveBeenCalled()
  })

  it('allows concurrent leave requests to claim membership once and return a fresh snapshot', async () => {
    db.transaction.room.findUnique.mockResolvedValue({ hostPlayerId: 'host', status: 'WAITING' })
    db.transaction.roomMember.findUnique.mockResolvedValue({ leftAt: null })
    db.transaction.roomMember.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 })
    db.transaction.roomMember.findFirst.mockResolvedValue({ playerId: 'next-host' })
    db.transaction.room.updateMany.mockResolvedValue({ count: 1 })
    db.prisma.room.findUnique.mockResolvedValue(roomSnapshot)

    const results = await Promise.all([leaveRoom('room-1', 'host'), leaveRoom('room-1', 'host')])

    expect(results).toHaveLength(2)
    expect(db.transaction.roomMember.updateMany).toHaveBeenCalledTimes(2)
    expect(db.transaction.room.updateMany).toHaveBeenCalledTimes(1)
    expect(db.prisma.room.findUnique).toHaveBeenCalledTimes(2)
  })

  it('re-activates a departed member on rejoin and resets readiness and disconnect state', async () => {
    db.prisma.room.findUnique.mockResolvedValueOnce({ id: 'room-1', status: 'WAITING', capacity: 3 })
    db.transaction.room.findUnique.mockResolvedValueOnce({ status: 'WAITING', capacity: 3 })
    db.transaction.room.findUniqueOrThrow.mockResolvedValue(roomSnapshot)
    db.transaction.roomMember.findUnique.mockResolvedValue({ leftAt: new Date(), disconnectedAt: new Date(), isReady: true })
    db.transaction.roomMember.count.mockResolvedValue(2)
    db.transaction.roomMember.update.mockResolvedValue(undefined)
    db.prisma.roomMember.findUnique.mockResolvedValue({ leftAt: null })

    const result = await joinRoom('guest', 'ABCD2345')

    expect(db.transaction.roomMember.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { roomId_playerId: { roomId: 'room-1', playerId: 'guest' } },
      data: { leftAt: null, disconnectedAt: null, isReady: false, joinedAt: expect.any(Date) },
    }))
    expect(result.playerIds).toContain('guest')
  })

  it('expires disconnected waiting-room members after the configured grace period but keeps in-game members', async () => {
    const now = new Date('2026-10-24T00:00:00.000Z')
    db.transaction.roomMember.findMany.mockResolvedValue([
      { roomId: 'waiting-room', playerId: 'waiting-host' },
      { roomId: 'active-room', playerId: 'active-player' },
    ])
    db.transaction.room.findUnique.mockResolvedValueOnce({ hostPlayerId: 'waiting-host', status: 'WAITING' })
      .mockResolvedValueOnce({ hostPlayerId: 'someone-else', status: 'IN_PROGRESS' })
    db.transaction.roomMember.findFirst.mockResolvedValue({ playerId: 'connected-successor' })

    await expect(expireDisconnectedLobbyMembers(now)).resolves.toEqual(['waiting-room'])
    expect(db.transaction.roomMember.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ disconnectedAt: { lte: new Date(now.getTime() - 60_000) } }),
    }))
    expect(db.transaction.roomMember.update).toHaveBeenCalledTimes(1)
    expect(db.transaction.roomMember.update).toHaveBeenCalledWith(expect.objectContaining({ data: { leftAt: now } }))
    expect(db.transaction.room.update).toHaveBeenCalledWith({ where: { id: 'waiting-room' }, data: { hostPlayerId: 'connected-successor' } })
  })
})
