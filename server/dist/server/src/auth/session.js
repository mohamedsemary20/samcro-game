import { createHash, randomBytes } from 'node:crypto';
import { env } from '../config/env.js';
import { prisma } from '../db/prisma.js';
import { HttpError } from '../http/errors.js';
export function parseCookies(header) {
    const cookies = new Map();
    for (const part of header?.split(';') ?? []) {
        const separator = part.indexOf('=');
        if (separator > 0) {
            const key = part.slice(0, separator).trim();
            const value = part.slice(separator + 1).trim();
            try {
                cookies.set(key, decodeURIComponent(value));
            }
            catch { /* Ignore malformed cookie values. */ }
        }
    }
    return cookies;
}
function hashToken(token) {
    return createHash('sha256').update(token).digest('hex');
}
export function setSessionCookie(response, token, expiresAt) {
    const maxAge = Math.max(0, expiresAt.getTime() - Date.now());
    const flags = [`${env.COOKIE_NAME}=${encodeURIComponent(token)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${Math.floor(maxAge / 1000)}`];
    if (env.COOKIE_SECURE || env.NODE_ENV === 'production')
        flags.push('Secure');
    response.setHeader('Set-Cookie', flags.join('; '));
}
export function clearSessionCookie(response) {
    const flags = [`${env.COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
    if (env.COOKIE_SECURE || env.NODE_ENV === 'production')
        flags.push('Secure');
    response.setHeader('Set-Cookie', flags.join('; '));
}
export async function createGuestSession(displayName) {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + env.sessionTtlMs);
    const created = await prisma.$transaction(async (transaction) => {
        const player = await transaction.player.create({ data: { displayName } });
        const session = await transaction.playerSession.create({
            data: { tokenHash: hashToken(token), playerId: player.id, expiresAt },
        });
        return { player, session };
    });
    return {
        token,
        expiresAt,
        session: { sessionId: created.session.id, playerId: created.player.id, displayName: created.player.displayName },
    };
}
export async function findSession(token) {
    const session = await prisma.playerSession.findUnique({
        where: { tokenHash: hashToken(token) },
        select: { id: true, playerId: true, expiresAt: true, revokedAt: true, player: { select: { displayName: true } } },
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date())
        return null;
    return { sessionId: session.id, playerId: session.playerId, displayName: session.player.displayName };
}
export async function requireSession(request, _response, next) {
    try {
        const token = parseCookies(request.headers.cookie).get(env.COOKIE_NAME);
        if (!token || token.length > 128)
            throw new HttpError(401, 'SESSION_REQUIRED', 'Create or restore a player session first.');
        const session = await findSession(token);
        if (!session)
            throw new HttpError(401, 'SESSION_EXPIRED', 'Player session expired. Create a new guest session.');
        request.auth = session;
        next();
    }
    catch (error) {
        next(error);
    }
}
export async function revokeSession(sessionId) {
    await prisma.playerSession.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
}
