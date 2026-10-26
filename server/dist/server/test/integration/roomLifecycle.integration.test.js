import { createHash, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { importLocalTestQuestionPool, LOCAL_TEST_QUESTION_SOURCE } from '../../src/questions/localTestQuestionPool.js';
/** A minimal Engine.IO v4 / Socket.IO default-namespace client over real WebSocket. */
class SocketIoTestClient {
    socket;
    events = new Map();
    waiters = [];
    acknowledgements = new Map();
    nextAcknowledgementId = 1;
    connectionResolve;
    connectionReject;
    connected = false;
    constructor(url, cookie, origin) {
        this.socket = new WebSocket(url, { headers: { Cookie: cookie, Origin: origin } });
        this.socket.on('message', (data) => this.handleFrame(data.toString()));
        this.socket.on('error', (error) => this.connectionReject?.(error));
        this.socket.on('close', () => {
            for (const waiter of this.waiters.splice(0)) {
                clearTimeout(waiter.timer);
                waiter.reject(new Error(`Socket closed while waiting for ${waiter.event}`));
            }
        });
    }
    connect(timeoutMs = 5_000) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Socket.IO namespace connection timed out.')), timeoutMs);
            this.connectionResolve = () => { clearTimeout(timer); resolve(); };
            this.connectionReject = (error) => { clearTimeout(timer); reject(error); };
        });
    }
    emit(event, payload) {
        if (!this.connected || this.socket.readyState !== WebSocket.OPEN)
            throw new Error('Socket.IO client is not connected.');
        this.socket.send(`42${JSON.stringify([event, payload])}`);
    }
    emitWithAck(event, payload, timeoutMs = 8_000) {
        if (!this.connected || this.socket.readyState !== WebSocket.OPEN)
            return Promise.reject(new Error('Socket.IO client is not connected.'));
        const id = this.nextAcknowledgementId++;
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.acknowledgements.delete(id);
                reject(new Error(`Timed out waiting for acknowledgement ${event}.`));
            }, timeoutMs);
            this.acknowledgements.set(id, (result) => { clearTimeout(timeout); resolve(result); });
            this.socket.send(`42${id}${JSON.stringify([event, payload])}`);
        });
    }
    isConnected() { return this.connected && this.socket.readyState === WebSocket.OPEN; }
    waitFor(event, accepts = () => true, timeoutMs = 10_000) {
        const queued = this.events.get(event) ?? [];
        const queuedIndex = queued.findIndex((payload) => accepts(payload));
        if (queuedIndex >= 0)
            return Promise.resolve(queued.splice(queuedIndex, 1)[0]);
        return this.waitForNext(event, accepts, timeoutMs);
    }
    waitForNext(event, accepts = () => true, timeoutMs = 10_000) {
        return new Promise((resolve, reject) => {
            const waiter = {
                event,
                accepts: (payload) => accepts(payload),
                resolve: (payload) => resolve(payload),
                reject,
                timer: setTimeout(() => {
                    const index = this.waiters.indexOf(waiter);
                    if (index >= 0)
                        this.waiters.splice(index, 1);
                    reject(new Error(`Timed out waiting for Socket.IO event ${event}.`));
                }, timeoutMs),
            };
            this.waiters.push(waiter);
        });
    }
    async close() {
        if (this.socket.readyState === WebSocket.CLOSED)
            return;
        await new Promise((resolve) => {
            const timer = setTimeout(() => { this.socket.terminate(); resolve(); }, 1_000);
            this.socket.once('close', () => { clearTimeout(timer); resolve(); });
            this.socket.close();
        });
    }
    handleFrame(frame) {
        if (frame === '2') {
            this.socket.send('3');
            return;
        }
        if (frame.startsWith('0')) {
            this.socket.send('40');
            return;
        }
        if (frame.startsWith('40')) {
            this.connected = true;
            this.connectionResolve?.();
            this.connectionResolve = undefined;
            this.connectionReject = undefined;
            return;
        }
        if (frame.startsWith('44')) {
            const detail = frame.slice(2);
            this.connectionReject?.(new Error(detail));
            return;
        }
        if (frame.startsWith('43')) {
            const match = frame.slice(2).match(/^(\d+)(\[.*)$/);
            if (!match)
                return;
            const ack = this.acknowledgements.get(Number(match[1]));
            if (!ack)
                return;
            this.acknowledgements.delete(Number(match[1]));
            const values = JSON.parse(match[2]);
            ack(values[0]);
            return;
        }
        if (!frame.startsWith('42'))
            return;
        const packet = JSON.parse(frame.slice(2));
        const [event, payload] = packet;
        if (typeof event !== 'string')
            return;
        const remaining = [];
        let delivered = false;
        for (const waiter of this.waiters) {
            if (!delivered && waiter.event === event && waiter.accepts(payload)) {
                clearTimeout(waiter.timer);
                waiter.resolve(payload);
                delivered = true;
            }
            else
                remaining.push(waiter);
        }
        this.waiters.splice(0, this.waiters.length, ...remaining);
        if (!delivered)
            this.events.set(event, [...(this.events.get(event) ?? []), payload]);
    }
}
const shouldRun = process.env.SAMKARO_RUN_DB_INTEGRATION === '1';
const suite = describe.skipIf(!shouldRun);
suite('PostgreSQL-backed REST and Socket.IO room lifecycle', () => {
    it('plays a complete three-player match from the isolated formula-hint bank pool', async () => {
        expect(process.env.SAMKARO_RUN_DB_INTEGRATION).toBe('1');
        const configuredUrl = process.env.DATABASE_URL;
        expect(configuredUrl, 'test:integration must load server/.env').toBeTruthy();
        const configuredDatabase = decodeURIComponent(new URL(configuredUrl).pathname.slice(1)).split('/')[0];
        expect(configuredDatabase).toBe('samkaro_dev');
        expect(process.env.NODE_ENV).toBe('development');
        expect(process.env.SAMKARO_RUN_DB_INTEGRATION).toBe('1');
        expect(process.env.SAMKARO_ENABLE_TEST_QUESTION_POOL).toBe('1');
        const [{ app }, { prisma }, { attachSocketServer }, { PrismaQuestionRepository }, { NoApprovedQuestionsError }] = await Promise.all([
            import('../../src/http/app.js'),
            import('../../src/db/prisma.js'),
            import('../../src/realtime/socketServer.js'),
            import('../../src/questions/questionRepository.js'),
            import('../../src/questions/questionRepository.js'),
        ]);
        const db = prisma;
        const connectedDatabase = await db.$queryRaw `SELECT current_database() AS database_name`;
        expect(connectedDatabase[0]?.database_name).toBe('samkaro_dev');
        expect(Number(process.env.GOLDEN_HINT_PROBABILITY ?? 0)).toBe(0);
        const staleFixtures = await db.question.findMany({
            where: { sourceFile: '__automated_integration_fixture__' },
            select: { id: true },
        });
        expect(staleFixtures, 'refusing to modify pre-existing integration fixture rows').toHaveLength(0);
        const playableQuestionCount = await db.question.count({
            where: {
                enabled: true,
                type: { in: ['year', 'number'] },
                answer: { gte: 0n, lte: BigInt(Number.MAX_SAFE_INTEGER) },
                hint: { is: { approved: true, range: { not: '' }, accuracy: { not: '' }, note: { not: '' } } },
            },
        });
        expect(playableQuestionCount).toBe(0);
        const firstImport = await importLocalTestQuestionPool(db);
        const secondImport = await importLocalTestQuestionPool(db);
        expect(firstImport.inserted + firstImport.skipped).toBe(169);
        expect(firstImport.eligible).toBe(169);
        expect(secondImport).toEqual({ inserted: 0, skipped: 169, eligible: 169 });
        const testPoolRows = await db.question.findMany({
            where: { sourceFile: LOCAL_TEST_QUESTION_SOURCE, enabled: true },
            select: { id: true, metadata: true, hint: { select: { approved: true, range: true, accuracy: true, note: true, source: true } } },
        });
        expect(testPoolRows).toHaveLength(169);
        expect(testPoolRows.every((row) => row.id && row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
            && row.metadata.testOnly === true && row.metadata.testPool === LOCAL_TEST_QUESTION_SOURCE
            && row.hint?.approved === false && row.hint.source === 'local-test-pool:formula-hint-v1'
            && row.hint.range.length > 0 && row.hint.accuracy.length > 0 && row.hint.note.length > 0)).toBe(true);
        const normalRepository = new PrismaQuestionRepository();
        await expect(db.$transaction((tx) => normalRepository.selectUnused(tx, []))).rejects.toBeInstanceOf(NoApprovedQuestionsError);
        const questionRepository = new PrismaQuestionRepository({ allowLocalTestPool: true });
        const fiveSelected = await db.$transaction(async (tx) => {
            const selected = [];
            for (let index = 0; index < 5; index += 1)
                selected.push((await questionRepository.selectUnused(tx, selected)).id);
            return selected;
        });
        expect(new Set(fiveSelected).size).toBe(5);
        expect(fiveSelected.every((id) => testPoolRows.some((row) => row.id === id))).toBe(true);
        const httpServer = createServer(app);
        const io = attachSocketServer(httpServer, { questionRepository });
        const clients = [];
        const identities = [];
        let roomId;
        let hostCreateKey;
        let databaseOwnershipVerified = false;
        let apiBase = '';
        const trustedOrigin = process.env.TRUSTED_ORIGINS?.split(',')[0]?.trim() ?? 'http://localhost:5173';
        try {
            await new Promise((resolve, reject) => {
                httpServer.once('error', reject);
                httpServer.listen(0, '127.0.0.1', resolve);
            });
            const address = httpServer.address();
            if (!address || typeof address === 'string')
                throw new Error('Integration server did not bind a TCP port.');
            const origin = `http://127.0.0.1:${address.port}`;
            apiBase = `${origin}/api/v1`;
            const socketUrl = `ws://127.0.0.1:${address.port}/socket.io/?EIO=4&transport=websocket`;
            const request = async (path, options = {}) => {
                const headers = { Origin: trustedOrigin };
                if (options.cookie)
                    headers.Cookie = options.cookie;
                if (options.body !== undefined)
                    headers['Content-Type'] = 'application/json';
                return fetch(`${apiBase}${path}`, {
                    method: options.method ?? 'GET',
                    headers,
                    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
                });
            };
            const runTag = randomUUID().slice(0, 8);
            for (let index = 1; index <= 3; index += 1) {
                const response = await request('/sessions/guest', { method: 'POST', body: { displayName: `it-${runTag}-${index}` } });
                expect(response.status).toBe(201);
                const body = await response.json();
                const setCookie = response.headers.get('set-cookie');
                expect(setCookie).toBeTruthy();
                const cookie = setCookie.split(';', 1)[0];
                const token = decodeURIComponent(cookie.slice(cookie.indexOf('=') + 1));
                const tokenHash = createHash('sha256').update(token).digest('hex');
                identities.push({ playerId: body.player.id, cookie, tokenHash });
                const dbSession = await db.playerSession.findUnique({ where: { tokenHash }, select: { id: true, playerId: true } });
                expect(dbSession?.playerId).toBe(body.player.id);
                databaseOwnershipVerified = true;
            }
            const host = identities[0];
            const hostKey = randomUUID();
            hostCreateKey = hostKey;
            const createResponse = await request('/rooms', { method: 'POST', cookie: host.cookie, body: { capacity: 3, idempotencyKey: hostKey } });
            expect(createResponse.status).toBe(201);
            const created = await createResponse.json();
            roomId = created.room.id;
            expect(created.room.status).toBe('waiting');
            expect(created.room.readyPlayerIds).toEqual([host.playerId]);
            for (const identity of identities.slice(1)) {
                const joined = await request('/rooms/join', { method: 'POST', cookie: identity.cookie, body: { code: created.room.code } });
                expect(joined.status).toBe(200);
            }
            const unauthenticatedRoomRead = await request(`/rooms/${roomId}`);
            expect(unauthenticatedRoomRead.status).toBe(401);
            for (const identity of identities) {
                const client = new SocketIoTestClient(socketUrl, identity.cookie, trustedOrigin);
                clients.push(client);
                await client.connect();
                const roomUpdate = client.waitFor('room:state', (state) => state.id === roomId && state.playerIds.includes(identity.playerId));
                client.emit('room:join', { roomId });
                await roomUpdate;
            }
            for (const identity of identities.slice(1)) {
                const client = clients[identities.indexOf(identity)];
                const readyUpdate = client.waitFor('room:state', (state) => state.id === roomId && state.readyPlayerIds.includes(identity.playerId));
                client.emit('room:ready', { ready: true });
                await readyUpdate;
            }
            const roomResponse = await request(`/rooms/${roomId}`, { cookie: host.cookie });
            expect(roomResponse.status).toBe(200);
            const roomState = await roomResponse.json();
            expect(roomState.room.playerIds).toHaveLength(3);
            expect(new Set(roomState.room.playerIds)).toEqual(new Set(identities.map((identity) => identity.playerId)));
            expect(roomState.room.readyPlayerIds).toHaveLength(3);
            expect(roomState.players.every((player) => player.isReady)).toBe(true);
            expect(roomState.room.status).toBe('waiting');
            const nonHost = clients[1];
            const hostOnlyError = nonHost.waitFor('server:error', (error) => error.code === 'HOST_REQUIRED');
            nonHost.emit('match:start', { idempotencyKey: randomUUID() });
            await hostOnlyError;
            expect(await db.gameMatch.count({ where: { roomId } })).toBe(0);
            const started = clients[0].waitFor('game:state', (state) => state.room.id === roomId && state.session.roundNumber === 1);
            const startingPrivateStates = clients.map((client, index) => client.waitForNext('player:private', (state) => state.playerId === identities[index].playerId));
            // Subscribe before the first action so completion cannot race the test observer.
            const completionEvent = clients[1].waitFor('game:complete');
            const revealEvents = Array.from({ length: 5 }, (_, index) => clients[1].waitFor('game:reveal', (result) => result.roundNumber === index + 1));
            clients[0].emit('match:start', { idempotencyKey: randomUUID() });
            let game = await started;
            const personalFunding = await Promise.all(startingPrivateStates);
            expect(game.players).toHaveLength(3);
            expect(game.players.every((player) => !('chips' in player))).toBe(true);
            expect(game.roundProgress).toHaveLength(3);
            expect(personalFunding.every((state) => state.roundNumber === 1 && state.availableChips === 450 && state.roundContribution === 50)).toBe(true);
            expect(game.session.phase).toBe('question-betting');
            expect(JSON.stringify(game)).not.toContain('correctAnswer');
            expect(JSON.stringify(game)).not.toContain('answer');
            let latestVersion = game.session.version ?? 0;
            const observedRounds = new Set([game.session.roundNumber]);
            let actionCount = 0;
            let completion;
            let firstRoundHints = [];
            const firstRoundPrivateByPlayer = new Map();
            for (let guard = 0; guard < 100 && !completion; guard += 1) {
                const phase = game.session.phase;
                if (phase === 'round-reveal' && game.session.roundNumber === 5)
                    break;
                if (phase === 'round-funding' || phase === 'round-reveal')
                    throw new Error(`Unexpected match phase: ${phase}`);
                if (phase === 'secret-clue' || phase === 'guess-input') {
                    for (const [index, identity] of identities.entries()) {
                        const client = clients[index];
                        if (phase === 'secret-clue') {
                            if (game.session.roundNumber === 1 && firstRoundHints.length === 0) {
                                const currentRound = await db.gameRound.findFirst({ where: { matchId: game.session.id, number: 1 } });
                                expect(currentRound).not.toBeNull();
                                const expiredAt = Date.now() - 100;
                                const expiredEngine = structuredClone(currentRound.engineState);
                                expiredEngine.deadline = expiredAt;
                                const publicUpdates = clients.map((viewer) => viewer.waitForNext('game:state', (state) => (state.session.version ?? 0) > latestVersion));
                                const privateUpdates = clients.map((viewer, viewerIndex) => viewer.waitForNext('player:private', (state) => state.playerId === identities[viewerIndex].playerId));
                                await db.gameRound.update({ where: { id: currentRound.id }, data: { deadlineAt: new Date(expiredAt), engineState: expiredEngine } });
                                const [timedStates, privateStates] = await Promise.all([Promise.all(publicUpdates), Promise.all(privateUpdates)]);
                                const nextState = timedStates[0];
                                expect(nextState.session.phase).toBe('guess-input');
                                expect(nextState.roundProgress.every((entry) => entry.hasHint)).toBe(true);
                                for (const [viewerIndex, state] of privateStates.entries()) {
                                    expect(state.playerId).toBe(identities[viewerIndex].playerId);
                                    expect(state.roundNumber).toBe(1);
                                    expect(state.hint?.questionId).toBe(nextState.session.questionId);
                                    expect(JSON.stringify(nextState)).not.toContain(state.hint.advisoryNote);
                                    firstRoundHints.push({ playerId: state.playerId, hint: { ...state.hint } });
                                    firstRoundPrivateByPlayer.set(state.playerId, state);
                                }
                                const question = await db.question.findUnique({ where: { id: nextState.session.questionId }, select: { answer: true } });
                                expect(question).not.toBeNull();
                                const answer = Number(question.answer);
                                expect(firstRoundHints).toHaveLength(3);
                                expect(JSON.stringify(nextState)).not.toContain('exact');
                                await clients[0].close();
                                await delay(100);
                                const reconnected = new SocketIoTestClient(socketUrl, identities[0].cookie, trustedOrigin);
                                clients[0] = reconnected;
                                await reconnected.connect();
                                const roomAgain = reconnected.waitFor('room:state', (room) => room.id === roomId);
                                const privateAgain = reconnected.waitFor('player:private', (state) => state.playerId === identities[0].playerId);
                                const publicAgain = reconnected.waitFor('game:state', (state) => state.session.roundNumber === 1);
                                reconnected.emit('room:join', { roomId });
                                const [, reconnectedPrivate] = await Promise.all([roomAgain, privateAgain, publicAgain]);
                                const syncOthers = clients.slice(1).map((viewer, viewerIndex) => viewer.waitForNext('player:private', (state) => state.playerId === identities[viewerIndex + 1].playerId));
                                for (const viewer of clients.slice(1))
                                    viewer.emit('game:sync', { roomId });
                                const syncedPrivate = [reconnectedPrivate, ...await Promise.all(syncOthers)];
                                for (const [viewerIndex, state] of syncedPrivate.entries()) {
                                    expect(state.hint).toEqual(firstRoundHints.find((entry) => entry.playerId === identities[viewerIndex].playerId)?.hint);
                                }
                                game = nextState;
                                observedRounds.add(game.session.roundNumber);
                                latestVersion = game.session.version ?? latestVersion;
                                actionCount += 1;
                                break;
                            }
                            const updated = client.waitFor('game:state', (state) => (state.session.version ?? 0) > latestVersion);
                            const privateUpdates = clients.map((viewer, viewerIndex) => viewer.waitForNext('player:private', (state) => state.playerId === identities[viewerIndex].playerId));
                            const hintAcknowledgement = client.emitWithAck('game:hint.request', { idempotencyKey: randomUUID() });
                            const [nextState, ...privateStates] = await Promise.all([updated, ...privateUpdates]);
                            expect(await hintAcknowledgement).toEqual({ ok: true });
                            if (nextState.session.roundNumber === 1) {
                                for (const [viewerIndex, state] of privateStates.entries()) {
                                    expect(state.playerId).toBe(identities[viewerIndex].playerId);
                                    const prior = firstRoundPrivateByPlayer.get(state.playerId);
                                    if (prior?.hint)
                                        expect(state.hint).toEqual(prior.hint);
                                    firstRoundPrivateByPlayer.set(state.playerId, state);
                                }
                                const ownState = privateStates[index];
                                expect(ownState.hint?.questionId).toBe(nextState.session.questionId);
                                firstRoundHints.push({ playerId: ownState.playerId, hint: { ...ownState.hint } });
                                if (firstRoundHints.length === 3) {
                                    const question = await db.question.findUnique({ where: { id: nextState.session.questionId }, select: { answer: true } });
                                    expect(question).not.toBeNull();
                                    const answer = Number(question.answer);
                                    expect(firstRoundHints).toHaveLength(3);
                                    for (const { hint } of firstRoundHints) {
                                        if (hint.exact) {
                                            expect(Number(hint.range.replaceAll(',', ''))).toBe(answer);
                                        }
                                        else {
                                            const bounds = hint.range.split(' – ').map((value) => Number(value.replaceAll(',', '')));
                                            expect(bounds).toHaveLength(2);
                                            expect(bounds[0]).toBeLessThanOrEqual(answer);
                                            expect(bounds[1]).toBeGreaterThanOrEqual(answer);
                                            expect(bounds[1] - bounds[0] + 1).toBeGreaterThan(1);
                                        }
                                        expect(hint.accuracy.trim()).not.toBe('');
                                        expect(hint.advisoryNote.trim()).not.toBe('');
                                    }
                                    const syncHint = clients.map((viewer, viewerIndex) => viewer.waitForNext('player:private', (state) => state.playerId === identities[viewerIndex].playerId));
                                    for (const viewer of clients)
                                        viewer.emit('game:sync', { roomId });
                                    const syncedStates = await Promise.all(syncHint);
                                    for (const [viewerIndex, state] of syncedStates.entries()) {
                                        expect(state.hint).toEqual(firstRoundHints.find((entry) => entry.playerId === identities[viewerIndex].playerId)?.hint);
                                    }
                                }
                            }
                            game = nextState;
                        }
                        else {
                            const updated = client.waitFor('game:state', (state) => (state.session.version ?? 0) > latestVersion);
                            const acknowledgement = client.emitWithAck('game:guess.submit', { idempotencyKey: randomUUID(), value: 42 });
                            game = await updated;
                            expect(await acknowledgement).toEqual({ ok: true });
                            const progress = game.roundProgress.find((entry) => entry.playerId === identity.playerId);
                            expect(progress?.hasGuess).toBe(true);
                            expect(progress).not.toHaveProperty('guess');
                            expect(JSON.stringify(game)).not.toContain('"value":42');
                            if (index === 0 && game.session.roundNumber === 1) {
                                const rejected = await client.emitWithAck('game:guess.submit', { idempotencyKey: randomUUID(), value: 42 });
                                expect(rejected).toMatchObject({ ok: false, error: { code: 'GUESS_ALREADY_LOCKED' } });
                                const roundRow = await db.gameRound.findFirst({ where: { matchId: game.session.id, number: 1 }, select: { id: true } });
                                expect(roundRow).not.toBeNull();
                                expect(await db.playerGuessRecord.count({ where: { roundId: roundRow.id, playerId: identity.playerId } })).toBe(1);
                            }
                        }
                        observedRounds.add(game.session.roundNumber);
                        latestVersion = game.session.version ?? latestVersion;
                        actionCount += 1;
                        expect(identity.playerId).toBeTruthy();
                    }
                }
                else {
                    const actorIndex = identities.findIndex((identity) => identity.playerId === game.session.currentActorId);
                    expect(actorIndex).toBeGreaterThanOrEqual(0);
                    const actor = clients[actorIndex];
                    const updated = actor.waitFor('game:state', (state) => (state.session.version ?? 0) > latestVersion);
                    const betAcknowledgement = actor.emitWithAck('game:bet.submit', { idempotencyKey: randomUUID(), action: { type: 'check' } });
                    game = await updated;
                    expect(await betAcknowledgement).toEqual({ ok: true });
                    observedRounds.add(game.session.roundNumber);
                    latestVersion = game.session.version ?? latestVersion;
                    actionCount += 1;
                }
            }
            try {
                completion = await completionEvent;
            }
            catch (cause) {
                const persistedState = await db.gameMatch.findFirst({ where: { roomId }, select: { status: true, roundNumber: true, phase: true, version: true } });
                throw new Error(`game:complete was not delivered; persisted match state: ${JSON.stringify(persistedState)}`, { cause });
            }
            const reveals = await Promise.all(revealEvents);
            expect([...observedRounds].sort()).toEqual([1, 2, 3, 4, 5]);
            expect(game.session.roundNumber).toBe(5);
            expect(game.session.phase).toBe('round-reveal');
            expect(actionCount).toBeGreaterThanOrEqual(30);
            expect(reveals.map((result) => result.roundNumber)).toEqual([1, 2, 3, 4, 5]);
            expect(reveals.every((result) => Number.isSafeInteger(result.correctAnswer))).toBe(true);
            expect(reveals.every((result) => result.roundWagers?.length === 3 && result.guesses.length === 3)).toBe(true);
            expect(completion).toHaveLength(3);
            expect(new Set(completion.map((entry) => entry.playerId))).toEqual(new Set(identities.map((identity) => identity.playerId)));
            expect(new Set(completion.map((entry) => entry.rank))).toEqual(new Set([1, 2, 3]));
            const persistedMatch = await db.gameMatch.findFirst({ where: { roomId }, include: { rounds: true, participants: true } });
            expect(persistedMatch?.status).toBe('FINISHED');
            expect(persistedMatch?.rounds).toHaveLength(5);
            expect(persistedMatch?.questionIds).toHaveLength(5);
            expect(persistedMatch?.participants.every((participant) => participant.finalRank !== null)).toBe(true);
            expect(persistedMatch?.questionIds.every((id) => testPoolRows.some((row) => row.id === id))).toBe(true);
            expect(persistedMatch?.rounds.every((round) => testPoolRows.some((row) => row.id === round.questionId))).toBe(true);
            const persistedRanks = persistedMatch.participants.map((participant) => ({ playerId: participant.playerId, rank: participant.finalRank }));
            expect(completion.map(({ playerId, rank }) => ({ playerId, rank })).sort((left, right) => left.rank - right.rank))
                .toEqual(persistedRanks.sort((left, right) => left.rank - right.rank));
        }
        finally {
            await Promise.all(clients.map((client) => client.close()));
            await delay(100);
            if (apiBase) {
                for (const identity of identities) {
                    await fetch(`${apiBase}/sessions/me`, {
                        method: 'DELETE', headers: { Cookie: identity.cookie, Origin: trustedOrigin },
                    }).catch(() => undefined);
                }
            }
            await new Promise((resolve) => io.close(() => resolve()));
            if (databaseOwnershipVerified) {
                await db.$transaction(async (tx) => {
                    let mayDeletePlayers = true;
                    if (roomId && hostCreateKey) {
                        const room = await tx.room.findUnique({ where: { id: roomId }, select: { createRequestKey: true, status: true } });
                        if (room) {
                            const [matchCount, members] = await Promise.all([
                                tx.gameMatch.count({ where: { roomId } }),
                                tx.roomMember.findMany({ where: { roomId }, select: { playerId: true } }),
                            ]);
                            const testPlayerIds = new Set(identities.map((identity) => identity.playerId));
                            if (room.createRequestKey !== hostCreateKey || !['WAITING', 'IN_PROGRESS', 'FINISHED'].includes(room.status) || matchCount > 1 || members.some((member) => !testPlayerIds.has(member.playerId))) {
                                mayDeletePlayers = false;
                                throw new Error('Scoped cleanup refused: test room has an unexpected owner, match, or member; records were preserved.');
                            }
                            await tx.gameMatch.deleteMany({ where: { roomId } });
                            await tx.room.delete({ where: { id: roomId } });
                        }
                    }
                    if (!mayDeletePlayers || identities.length === 0)
                        return;
                    const playerIds = identities.map((identity) => identity.playerId);
                    const references = await tx.player.findMany({
                        where: { id: { in: playerIds } },
                        select: {
                            id: true,
                            hostedRooms: { select: { id: true } },
                            memberships: { select: { roomId: true } },
                            matches: { select: { matchId: true } },
                            transactions: { select: { id: true } },
                            loans: { select: { id: true } },
                            hints: { select: { id: true } },
                            guesses: { select: { id: true } },
                        },
                    });
                    const safeIds = references.filter((player) => player.hostedRooms.length === 0 && player.memberships.length === 0 && player.matches.length === 0
                        && player.transactions.length === 0 && player.loans.length === 0 && player.hints.length === 0 && player.guesses.length === 0).map((player) => player.id);
                    if (safeIds.length !== playerIds.length)
                        throw new Error('Scoped cleanup refused: one or more test players acquired unrelated references; player rows were preserved.');
                    if (safeIds.length)
                        await tx.player.deleteMany({ where: { id: { in: safeIds } } });
                });
                const remainingPlayers = await db.player.count({ where: { id: { in: identities.map((identity) => identity.playerId) } } });
                const remainingRoom = roomId ? await db.room.count({ where: { id: roomId } }) : 0;
                expect({ remainingPlayers, remainingRoom }).toEqual({ remainingPlayers: 0, remainingRoom: 0 });
            }
            expect(await db.question.count({ where: { sourceFile: '__automated_integration_fixture__' } })).toBe(0);
        }
    }, 60_000);
});
