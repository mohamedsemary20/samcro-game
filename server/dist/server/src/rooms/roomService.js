import { randomBytes } from 'node:crypto';
import { env } from '../config/env.js';
import { prisma } from '../db/prisma.js';
import { HttpError } from '../http/errors.js';
import { hasActiveMembership, roomAllowsMemberLeave, roomHasCapacity } from './roomPolicy.js';
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function createRoomCode() {
    let code = '';
    while (code.length < env.ROOM_CODE_LENGTH) {
        for (const byte of randomBytes(16)) {
            if (byte >= 256 - (256 % alphabet.length))
                continue;
            code += alphabet[byte % alphabet.length];
            if (code.length === env.ROOM_CODE_LENGTH)
                break;
        }
    }
    return code;
}
function toRoomDto(room) {
    return {
        id: room.id,
        code: room.code,
        hostPlayerId: room.hostPlayerId,
        playerIds: room.members.map((member) => member.playerId),
        status: room.status === 'WAITING' ? 'waiting' : room.status === 'IN_PROGRESS' ? 'in-progress' : 'finished',
        capacity: room.capacity,
        readyPlayerIds: room.members.filter((member) => member.isReady).map((member) => member.playerId),
    };
}
const membersInclude = {
    members: {
        where: { leftAt: null },
        orderBy: { joinedAt: 'asc' },
        include: { player: { select: { id: true, displayName: true } } },
    },
};
export async function createRoom(playerId, capacity, idempotencyKey) {
    const previous = await prisma.room.findUnique({ where: { createRequestKey: idempotencyKey }, include: membersInclude });
    if (previous) {
        if (previous.hostPlayerId !== playerId)
            throw new HttpError(409, 'IDEMPOTENCY_KEY_REUSED', 'Request key has already been used.');
        return toRoomDto(previous);
    }
    for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
            const room = await prisma.$transaction(async (transaction) => {
                const created = await transaction.room.create({
                    data: { code: createRoomCode(), hostPlayerId: playerId, capacity, createRequestKey: idempotencyKey },
                });
                await transaction.roomMember.create({ data: { roomId: created.id, playerId, isReady: true } });
                return transaction.room.findUniqueOrThrow({ where: { id: created.id }, include: membersInclude });
            }, { isolationLevel: 'Serializable' });
            return toRoomDto(room);
        }
        catch (error) {
            const prismaCode = error.code;
            if (prismaCode === 'P2034')
                continue;
            if (prismaCode === 'P2002') {
                const retry = await prisma.room.findUnique({ where: { createRequestKey: idempotencyKey }, include: membersInclude });
                if (retry?.hostPlayerId === playerId)
                    return toRoomDto(retry);
                if (attempt < 4)
                    continue;
            }
            throw error;
        }
    }
    throw new HttpError(503, 'ROOM_CREATE_RETRY', 'Could not reserve a unique room. Please retry.');
}
export async function joinRoom(playerId, code) {
    const room = await prisma.room.findUnique({ where: { code }, select: { id: true, status: true, capacity: true } });
    if (!room || room.status !== 'WAITING')
        throw new HttpError(404, 'ROOM_NOT_FOUND', 'Room is unavailable.');
    try {
        await prisma.$transaction(async (transaction) => {
            const currentRoom = await transaction.room.findUnique({ where: { id: room.id }, select: { status: true, capacity: true } });
            if (!currentRoom || currentRoom.status !== 'WAITING')
                throw new HttpError(404, 'ROOM_NOT_FOUND', 'Room is unavailable.');
            const existing = await transaction.roomMember.findUnique({ where: { roomId_playerId: { roomId: room.id, playerId } } });
            if (existing && !existing.leftAt)
                return;
            const count = await transaction.roomMember.count({ where: { roomId: room.id, leftAt: null } });
            if (!roomHasCapacity(currentRoom.capacity, count))
                throw new HttpError(409, 'ROOM_FULL', 'This room is full.');
            if (count === 0)
                await transaction.room.update({ where: { id: room.id }, data: { hostPlayerId: playerId } });
            if (existing) {
                await transaction.roomMember.update({ where: { roomId_playerId: { roomId: room.id, playerId } }, data: { leftAt: null, disconnectedAt: null, isReady: false, joinedAt: new Date() } });
            }
            else {
                await transaction.roomMember.create({ data: { roomId: room.id, playerId } });
            }
        }, { isolationLevel: 'Serializable' });
    }
    catch (error) {
        if (error.code === 'P2034')
            throw new HttpError(409, 'ROOM_CHANGED', 'Room membership changed. Please retry.');
        throw error;
    }
    return getRoomForPlayer(room.id, playerId);
}
export async function getRoomForPlayer(roomId, playerId) {
    const membership = await prisma.roomMember.findUnique({ where: { roomId_playerId: { roomId, playerId } }, select: { leftAt: true } });
    if (!hasActiveMembership(membership))
        throw new HttpError(403, 'ROOM_MEMBERSHIP_REQUIRED', 'You are not an active member of this room.');
    const room = await prisma.room.findUnique({ where: { id: roomId }, include: membersInclude });
    if (!room)
        throw new HttpError(404, 'ROOM_NOT_FOUND', 'Room does not exist.');
    return toRoomDto(room);
}
/** Internal room summary for broadcasting membership changes after the actor has left. */
export async function getRoomSnapshot(roomId) {
    const room = await prisma.room.findUnique({ where: { id: roomId }, include: membersInclude });
    return room ? toRoomDto(room) : null;
}
export async function setReady(roomId, playerId, ready) {
    await prisma.$transaction(async (transaction) => {
        const member = await transaction.roomMember.findUnique({ where: { roomId_playerId: { roomId, playerId } } });
        if (!member || member.leftAt)
            throw new HttpError(403, 'ROOM_MEMBERSHIP_REQUIRED', 'You are not an active member of this room.');
        const room = await transaction.room.findUnique({ where: { id: roomId }, select: { status: true } });
        if (!room || room.status !== 'WAITING')
            throw new HttpError(409, 'ROOM_NOT_WAITING', 'Readiness can only change in a waiting room.');
        await transaction.roomMember.update({ where: { roomId_playerId: { roomId, playerId } }, data: { isReady: ready } });
    });
    return getRoomForPlayer(roomId, playerId);
}
export async function leaveRoom(roomId, playerId) {
    await prisma.$transaction(async (transaction) => {
        const member = await transaction.roomMember.findUnique({ where: { roomId_playerId: { roomId, playerId } } });
        if (!member || member.leftAt)
            return;
        const room = await transaction.room.findUnique({ where: { id: roomId }, select: { hostPlayerId: true, status: true } });
        if (room && !roomAllowsMemberLeave(room.status)) {
            throw new HttpError(409, 'MATCH_IN_PROGRESS', 'A player cannot leave the room during an active match. Disconnect to reconnect during the grace period; missed turns will time out.');
        }
        await transaction.roomMember.update({ where: { roomId_playerId: { roomId, playerId } }, data: { leftAt: new Date(), disconnectedAt: null } });
        if (room?.hostPlayerId === playerId) {
            const successor = await transaction.roomMember.findFirst({
                where: { roomId, leftAt: null, disconnectedAt: null, playerId: { not: playerId } },
                orderBy: { joinedAt: 'asc' }, select: { playerId: true },
            });
            if (successor)
                await transaction.room.update({ where: { id: roomId }, data: { hostPlayerId: successor.playerId } });
        }
    }, { isolationLevel: 'Serializable' });
    return getRoomSnapshot(roomId);
}
/** Runs periodically; persistence makes grace-period expiry survive a process restart. */
export async function expireDisconnectedLobbyMembers(now = new Date()) {
    const cutoff = new Date(now.getTime() - env.reconnectGraceMs);
    return prisma.$transaction(async (transaction) => {
        const changedRooms = new Set();
        const expired = await transaction.roomMember.findMany({
            where: { leftAt: null, disconnectedAt: { lte: cutoff }, room: { status: { in: ['WAITING', 'IN_PROGRESS'] } } },
            select: { roomId: true, playerId: true },
        });
        for (const member of expired) {
            const room = await transaction.room.findUnique({ where: { id: member.roomId }, select: { hostPlayerId: true, status: true } });
            if (!room)
                continue;
            if (room.status === 'WAITING') {
                await transaction.roomMember.update({
                    where: { roomId_playerId: { roomId: member.roomId, playerId: member.playerId } },
                    data: { leftAt: now },
                });
                changedRooms.add(member.roomId);
            }
            if (room.hostPlayerId === member.playerId) {
                const successor = await transaction.roomMember.findFirst({
                    where: { roomId: member.roomId, leftAt: null, disconnectedAt: null, playerId: { not: member.playerId } },
                    orderBy: { joinedAt: 'asc' }, select: { playerId: true },
                });
                if (successor) {
                    await transaction.room.update({ where: { id: member.roomId }, data: { hostPlayerId: successor.playerId } });
                    changedRooms.add(member.roomId);
                }
            }
        }
        return [...changedRooms];
    });
}
