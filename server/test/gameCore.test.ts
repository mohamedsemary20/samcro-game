import { describe, expect, it } from 'vitest'
import { buildApprovedOfflineQuestionBundle, LocalMatchAuthority, LocalRoomProtocol, parseLanClientFrame, validateOfflineQuestionBundle, type OfflineQuestion } from '../../packages/game-core/index.js'

interface MatchState { actorId: string | null; turns: number; finished: boolean; hiddenAnswer: number }
interface MatchAction { nextActorId: string | null }
interface SafeState { actorId: string | null; turns: number; finished: boolean }

function makeProtocol() {
  let nextCredential = 0
  return new LocalRoomProtocol<MatchState, MatchAction, SafeState>({
    roomCode: 'ABC12345',
    host: { playerId: 'host', displayName: 'المضيف', resumeToken: 'host-resume-token' },
    initialState: { actorId: 'host', turns: 0, finished: false, hiddenAnswer: 314 },
    createCredential: () => `credential-${++nextCredential}`,
    projectState: (state) => ({ actorId: state.actorId, turns: state.turns, finished: state.finished }),
    currentActorId: (state) => state.actorId,
    canStart: () => true,
    start: (state) => state,
    reduce: (state, _playerId, action) => ({ ...state, actorId: action.nextActorId, turns: state.turns + 1, finished: state.turns + 1 >= 5 }),
  })
}

function approvedQuestion(id: number): OfflineQuestion {
  return {
    id: `source-${id}`,
    promptAr: `ما قيمة الاختبار ${id}؟`,
    answer: id,
    category: 'اختبار',
    type: 'number',
    sourceFingerprint: id.toString(16).padStart(64, '0'),
    approved: true,
    hint: { range: 'من ١ إلى ١٠', accuracy: 'تقريبي', advisoryNote: 'تلميح اختبار معتمد اصطناعياً.' },
  }
}

describe('local game core protocol', () => {
  it('synchronizes one host and three players, enforces readiness and projects safe snapshots', () => {
    const protocol = makeProtocol()
    const hostReady = protocol.setReady('host', 'host-resume-token', true)
    expect(hostReady.ok).toBe(true)

    const guests = ['لاعب ١', 'لاعب ٢', 'لاعب ٣'].map((name) => {
      const result = protocol.join(name)
      expect(result.ok).toBe(true)
      if (!result.ok) throw new Error(result.code)
      return result.value
    })
    for (const guest of guests) expect(protocol.setReady(guest.playerId, guest.resumeToken, true).ok).toBe(true)

    const started = protocol.startMatch('host', 'host-resume-token')
    expect(started.ok).toBe(true)
    if (!started.ok) return
    expect(started.value.members).toHaveLength(4)
    expect(started.value.members.every((member) => member.isReady)).toBe(true)
    expect(started.value.status).toBe('in-progress')
    expect(JSON.stringify(started.value)).not.toContain('hiddenAnswer')
    expect(started.value.members.some((member) => 'resumeToken' in member)).toBe(false)
  })

  it('rejects duplicate actions, stale sequences, and out-of-turn actions', () => {
    const protocol = makeProtocol()
    protocol.setReady('host', 'host-resume-token', true)
    const joins = ['A', 'B', 'C'].map((name) => protocol.join(name))
    const guests = joins.flatMap((result) => result.ok ? [result.value] : [])
    for (const guest of guests) protocol.setReady(guest.playerId, guest.resumeToken, true)
    const start = protocol.startMatch('host', 'host-resume-token')
    if (!start.ok) throw new Error(start.code)
    const sequence = start.value.sequence

    expect(protocol.dispatch({ playerId: guests[1]!.playerId, resumeToken: guests[1]!.resumeToken, actionId: 'out-of-turn-001', expectedSequence: sequence, action: { nextActorId: guests[0]!.playerId } })).toEqual({ ok: false, code: 'OUT_OF_TURN' })
    const hostAction = { playerId: 'host', resumeToken: 'host-resume-token', actionId: 'host-action-001', expectedSequence: sequence, action: { nextActorId: guests[0]!.playerId } }
    expect(protocol.dispatch(hostAction).ok).toBe(true)
    expect(protocol.dispatch(hostAction)).toEqual({ ok: false, code: 'DUPLICATE_ACTION' })
    expect(protocol.dispatch({ playerId: guests[0]!.playerId, resumeToken: guests[0]!.resumeToken, actionId: 'stale-action-001', expectedSequence: sequence, action: { nextActorId: guests[1]!.playerId } })).toEqual({ ok: false, code: 'STALE_SEQUENCE' })
    const current = protocol.sync('host', 'host-resume-token')
    if (!current.ok) throw new Error(current.code)
    expect(protocol.dispatch({ playerId: guests[1]!.playerId, resumeToken: guests[1]!.resumeToken, actionId: 'out-of-turn-002', expectedSequence: current.value.sequence, action: { nextActorId: guests[0]!.playerId } })).toEqual({ ok: false, code: 'OUT_OF_TURN' })
  })

  it('restores a disconnected player with the room credential and returns a current snapshot', () => {
    const protocol = makeProtocol()
    const joined = protocol.join('راجع')
    if (!joined.ok) throw new Error(joined.code)
    protocol.disconnect(joined.value.playerId, joined.value.resumeToken)
    const disconnected = protocol.sync(joined.value.playerId, joined.value.resumeToken)
    expect(disconnected.ok).toBe(true)
    if (disconnected.ok) expect(disconnected.value.members.find((member) => member.playerId === joined.value.playerId)?.isConnected).toBe(false)

    const reconnected = protocol.reconnect(joined.value.playerId, joined.value.resumeToken)
    expect(reconnected.ok).toBe(true)
    if (reconnected.ok) {
      expect(reconnected.value.members.find((member) => member.playerId === joined.value.playerId)?.isConnected).toBe(true)
      expect(reconnected.value.sequence).toBeGreaterThan(joined.value.snapshot.sequence)
    }
    expect(protocol.heartbeat(joined.value.playerId, 'wrong-token')).toEqual({ ok: false, code: 'INVALID_CREDENTIAL' })
  })

  it('accepts a completed authoritative match and rejects actions after host shutdown', () => {
    const protocol = makeProtocol()
    protocol.setReady('host', 'host-resume-token', true)
    const guests = ['A', 'B'].map((name) => protocol.join(name)).flatMap((result) => result.ok ? [result.value] : [])
    for (const guest of guests) protocol.setReady(guest.playerId, guest.resumeToken, true)
    protocol.startMatch('host', 'host-resume-token')

    const order = ['host', guests[0]!.playerId, guests[1]!.playerId, 'host', guests[0]!.playerId, guests[1]!.playerId]
    for (let index = 0; index < 5; index += 1) {
      const actor = order[index]!
      const token = actor === 'host' ? 'host-resume-token' : guests.find((guest) => guest.playerId === actor)!.resumeToken
      const sync = protocol.sync(actor, token)
      if (!sync.ok) throw new Error(sync.code)
      const result = protocol.dispatch({ playerId: actor, resumeToken: token, actionId: `turn-action-${String(index).padStart(3, '0')}`, expectedSequence: sync.value.sequence, action: { nextActorId: order[index + 1] ?? null } })
      expect(result.ok).toBe(true)
    }
    const final = protocol.sync('host', 'host-resume-token')
    expect(final.ok && final.value.state.finished).toBe(true)
    expect(protocol.finish('host', 'host-resume-token').ok).toBe(true)
    expect(protocol.shutdown('host', 'host-resume-token').ok).toBe(true)
    expect(protocol.heartbeat('host', 'host-resume-token')).toEqual({ ok: false, code: 'ROOM_CLOSED' })
  })
})

describe('offline question bundle validation', () => {
  it('requires five unique, approved questions with safe integer answers and complete hints', () => {
    const bundle = { schemaVersion: 1, questions: Array.from({ length: 5 }, (_, index) => approvedQuestion(index + 1)) }
    expect(validateOfflineQuestionBundle(bundle).valid).toBe(true)
    expect(validateOfflineQuestionBundle({ ...bundle, questions: bundle.questions.slice(0, 4) }).issues).toContainEqual({ code: 'INSUFFICIENT_QUESTIONS' })
  })

  it('rejects duplicate IDs, fingerprints, prompts, unapproved entries, and non-integer answers', () => {
    const first = approvedQuestion(1)
    const duplicate = { ...approvedQuestion(2), id: first.id, sourceFingerprint: first.sourceFingerprint, promptAr: first.promptAr }
    const invalid = { ...approvedQuestion(3), answer: 2.5, approved: false as true }
    const result = validateOfflineQuestionBundle({ schemaVersion: 1, questions: [first, duplicate, invalid, approvedQuestion(4), approvedQuestion(5), approvedQuestion(6)] })
    expect(result.valid).toBe(false)
    expect(result.issues.map(({ code }) => code)).toEqual(expect.arrayContaining(['DUPLICATE_ID', 'DUPLICATE_FINGERPRINT', 'DUPLICATE_PROMPT', 'QUESTION_INVALID']))
  })
})

function matchQuestions(): OfflineQuestion[] {
  return Array.from({ length: 5 }, (_, index) => ({
    id: `approved-${index + 1}`, promptAr: `Approved question ${index + 1}`, answer: 42 + index,
    category: 'Review fixture', type: 'number' as const, sourceFingerprint: index.toString(16).padStart(64, '0'), approved: true as const,
    hint: { range: '40 to 50', accuracy: 'Approximate', advisoryNote: 'Synthetic test hint.' },
  }))
}

describe('portable local match authority', () => {
  it('lets only the waiting host remove a guest and rejects removal once play starts', () => {
    let credentialCounter = 0
    const authority = new LocalMatchAuthority({ roomCode: 'KICK12', roomId: 'kick-room', questions: matchQuestions(),
      host: { playerId: 'p0', displayName: 'Host', resumeToken: 'host-resume-token-0001' },
      createCredential: () => `credential_${String(++credentialCounter).padStart(12, '0')}` })
    const first = authority.join('Guest 1')
    const second = authority.join('Guest 2')
    if (!first.ok || !second.ok) throw new Error('fixture setup failed')
    expect(authority.removePlayer(first.value.playerId, first.value.resumeToken, second.value.playerId)).toEqual({ ok: false, code: 'HOST_ONLY' })
    expect(authority.removePlayer('p0', 'host-resume-token-0001', 'p0')).toEqual({ ok: false, code: 'CANNOT_REMOVE_HOST' })
    const removed = authority.removePlayer('p0', 'host-resume-token-0001', first.value.playerId)
    expect(removed.ok).toBe(true)
    expect(authority.snapshot('p0').members.some(({ playerId }) => playerId === first.value.playerId)).toBe(false)
    const rejoined = authority.join('Guest 1')
    expect(rejoined.ok).toBe(true)
    authority.setReady('p0', 'host-resume-token-0001', true)
    if (second.ok) authority.setReady(second.value.playerId, second.value.resumeToken, true)
    if (rejoined.ok) authority.setReady(rejoined.value.playerId, rejoined.value.resumeToken, true)
    expect(authority.start('p0', 'host-resume-token-0001').ok).toBe(true)
    expect(authority.removePlayer('p0', 'host-resume-token-0001', rejoined.ok ? rejoined.value.playerId : '')).toEqual({ ok: false, code: 'ROOM_NOT_WAITING' })
  })

  it('keeps a lobby joinable while refusing to start without an approved offline question pack', () => {
    let credentialCounter = 0
    const authority = new LocalMatchAuthority({
      roomCode: 'EMPTY1', roomId: 'empty-question-room', questions: [],
      host: { playerId: 'p0', displayName: 'Host', resumeToken: 'host-resume-token-0001' },
      createCredential: () => `credential_${String(++credentialCounter).padStart(12, '0')}`,
    })
    const joined = authority.join('Player 2')
    expect(joined.ok).toBe(true)
    authority.setReady('p0', 'host-resume-token-0001', true)
    if (joined.ok) authority.setReady(joined.value.playerId, joined.value.resumeToken, true)
    expect(authority.start('p0', 'host-resume-token-0001')).toEqual({ ok: false, code: 'QUESTIONS_UNAVAILABLE' })
    expect(authority.snapshot('p0').status).toBe('waiting')
  })

  it('synchronizes four players, enforces turn and duplicate checks, reconnects, and completes five rounds', () => {
    let credentialCounter = 0
    const authority = new LocalMatchAuthority({
      roomCode: 'A2BC4D', roomId: 'local-room-1', questions: matchQuestions(), now: () => 1_000,
      host: { playerId: 'p0', displayName: 'Host', resumeToken: 'host-resume-token-0001' },
      createCredential: () => `credential_${String(++credentialCounter).padStart(12, '0')}`,
    })
    const players = [{ id: 'p0', token: 'host-resume-token-0001' }]
    for (let index = 1; index <= 3; index += 1) {
      const joined = authority.join(`Player ${index}`)
      expect(joined.ok).toBe(true)
      if (joined.ok) players.push({ id: joined.value.playerId, token: joined.value.resumeToken })
    }
    for (const player of players) expect(authority.setReady(player.id, player.token, true).ok).toBe(true)
    expect(authority.start('p0', 'host-resume-token-0001').ok).toBe(true)
    const initial = authority.snapshot('p0')
    expect(initial.state.question).not.toHaveProperty('answer')
    expect(initial.members).toHaveLength(4)

    const outsider = players.find((player) => player.id !== initial.state.currentActorId)!
    expect(authority.dispatch({ playerId: outsider.id, resumeToken: outsider.token, actionId: 'out_of_turn_action', expectedSequence: initial.sequence,
      action: { type: 'bet', action: { type: 'check' } }, now: 1_000 })).toEqual({ ok: false, code: 'OUT_OF_TURN' })
    const reconnecting = players[1]!
    const disconnectedSequence = authority.snapshot(reconnecting.id).sequence
    expect(authority.disconnect(reconnecting.id, reconnecting.token).ok).toBe(true)
    expect(authority.reconnect(reconnecting.id, reconnecting.token).ok).toBe(true)
    expect(authority.snapshot(reconnecting.id).sequence).toBeGreaterThan(disconnectedSequence)

    const takeAction = (playerId: string, action: { type: 'bet' } | { type: 'hint-request' } | { type: 'guess'; value: number }, id: string) => {
      const player = players.find((candidate) => candidate.id === playerId)!
      const result = authority.dispatch({ playerId, resumeToken: player.token, actionId: id,
        expectedSequence: authority.snapshot(playerId).sequence, action: action.type === 'bet'
          ? { type: 'bet', action: { type: 'check' } } : action, now: 1_000 })
      return result
    }

    const completedRoundNumbers: number[] = []
    for (let roundIndex = 0; roundIndex < 5; roundIndex += 1) {
      for (let guard = 0; guard < 20 && authority.snapshot('p0').state.phase === 'question-betting'; guard += 1) {
        const actorId = authority.snapshot('p0').state.currentActorId!
        expect(takeAction(actorId, { type: 'bet' }, `bet_${roundIndex}_${guard}_0001`).ok).toBe(true)
      }
      expect(authority.snapshot('p0').state.phase).toBe('secret-clue')
      for (const [index, player] of players.entries()) expect(takeAction(player.id, { type: 'hint-request' }, `hint_${roundIndex}_${index}_0001`).ok).toBe(true)
      expect(authority.snapshot('p0').state.phase).toBe('guess-input')
      for (const [index, player] of players.entries()) expect(takeAction(player.id, { type: 'guess', value: 42 + roundIndex }, `guess_${roundIndex}_${index}_0001`).ok).toBe(true)
      expect(authority.snapshot('p0').state.phase).toBe('final-betting')
      for (let guard = 0; guard < 20 && authority.snapshot('p0').state.phase === 'final-betting'; guard += 1) {
        const actorId = authority.snapshot('p0').state.currentActorId!
        expect(takeAction(actorId, { type: 'bet' }, `final_${roundIndex}_${guard}_001`).ok).toBe(true)
      }
      completedRoundNumbers.push(authority.snapshot('p0').state.roundNumber)
      const snapshots = players.map((player) => authority.snapshot(player.id))
      expect(snapshots.map((snapshot) => snapshot.sequence).every((sequence) => sequence === snapshots[0]!.sequence)).toBe(true)
      const publicBalances = snapshots.map((snapshot) => snapshot.state.players.map(({ id, chips, debt }) => ({ id, chips, debt })))
      expect(publicBalances.every((value) => JSON.stringify(value) === JSON.stringify(publicBalances[0]))).toBe(true)
    }
    expect(completedRoundNumbers).toEqual([2, 3, 4, 5, 5])
    expect(authority.snapshot('p0').status).toBe('finished')
    expect(authority.snapshot('p0').state.leaderboard).toHaveLength(4)
    expect(authority.snapshot('p0').state.results).toHaveLength(5)
  })

  it('rejects duplicate action IDs and stale revisions without applying a second wager', () => {
    let credentialCounter = 0
    const authority = new LocalMatchAuthority({ roomCode: 'A2BC4D', roomId: 'local-room-2', questions: matchQuestions(),
      host: { playerId: 'p0', displayName: 'Host', resumeToken: 'host-resume-token-0001' },
      createCredential: () => `credential_${String(++credentialCounter).padStart(12, '0')}` })
    const first = authority.join('Second')
    const second = authority.join('Third')
    if (!first.ok || !second.ok) throw new Error('fixture setup failed')
    const players = [{ playerId: 'p0', resumeToken: 'host-resume-token-0001' }, first.value, second.value]
    for (const player of players) authority.setReady(player.playerId, player.resumeToken, true)
    authority.start('p0', 'host-resume-token-0001')
    const actor = authority.snapshot('p0').state.currentActorId!
    const actorCredential = players.find((player) => player.playerId === actor)!
    const before = authority.snapshot('p0')
    const action = { playerId: actor, resumeToken: actorCredential.resumeToken, actionId: 'unique_action_123', expectedSequence: before.sequence,
      action: { type: 'bet' as const, action: { type: 'check' as const } }, now: 1_000 }
    expect(authority.dispatch(action).ok).toBe(true)
    expect(authority.dispatch(action)).toEqual({ ok: false, code: 'DUPLICATE_ACTION' })
    expect(authority.dispatch({ ...action, actionId: 'unique_action_456' })).toEqual({ ok: false, code: 'STALE_SEQUENCE' })
  })
})

describe('approved offline pack export', () => {
  it('exports only explicitly approved, source-matched, fact-checked, non-leaking review records', () => {
    const sourceRecords = matchQuestions().map((question) => ({ ...question, playable: true }))
    const reviewRecords = sourceRecords.map((question) => ({
      id: question.id,
      sourceFingerprint: question.sourceFingerprint,
      approved: true,
      status: 'approved',
      reviewerDecision: 'approved',
      factCheckStatus: 'verified',
      factCheckSources: ['https://example.org/fact-check'],
      factCheckNote: 'Reviewed against the source.',
      approvalNote: 'Question and hint reviewed.',
      leakageReview: 'clear',
      gameplayHint: { range: '40 to 50', accuracy: 'Approximate', note: 'Synthetic reviewed hint.' },
    }))
    const built = buildApprovedOfflineQuestionBundle({ records: sourceRecords }, { records: reviewRecords })
    expect(built.approvedCandidates).toBe(5)
    expect(built.validation.valid).toBe(true)
    expect(built.bundle.questions.map(({ answer }) => answer)).toEqual(sourceRecords.map(({ answer }) => answer))

    const pending = buildApprovedOfflineQuestionBundle({ records: sourceRecords }, { records: reviewRecords.map((record, index) => index === 0 ? { ...record, approved: false } : record) })
    expect(pending.approvedCandidates).toBe(4)
    expect(pending.bundle.questions.some((question) => question.id === 'approved-1')).toBe(false)

    const stale = buildApprovedOfflineQuestionBundle({ records: sourceRecords }, { records: reviewRecords.map((record, index) => index === 0 ? { ...record, sourceFingerprint: 'f'.repeat(64) } : record) })
    expect(stale.approvedCandidates).toBe(4)
  })
})

describe('LAN frame validation', () => {
  it('rejects oversized, malformed, unauthorized-shaped, and unsafe action messages', () => {
    expect(parseLanClientFrame('{')).toEqual({ ok: false, code: 'MALFORMED_JSON' })
    expect(parseLanClientFrame('x'.repeat(64 * 1024 + 1))).toEqual({ ok: false, code: 'MESSAGE_TOO_LARGE' })
    expect(parseLanClientFrame(JSON.stringify({ type: 'join', version: 1, room: '../bad', credential: 'x'.repeat(32), displayName: 'Player' }))).toEqual({ ok: false, code: 'INVALID_ROOM' })
    expect(parseLanClientFrame(JSON.stringify({ type: 'action', actionId: 'tiny', expectedSequence: 1, action: { type: 'bet', action: { type: 'raise', amount: -10 } } }))).toEqual({ ok: false, code: 'INVALID_ACTION_ID' })
    expect(parseLanClientFrame(JSON.stringify({ type: 'action', actionId: 'safe_action_01', expectedSequence: -1, action: { type: 'guess', value: 42 } }))).toEqual({ ok: false, code: 'INVALID_SEQUENCE' })
    expect(parseLanClientFrame(JSON.stringify({ type: 'action', actionId: 'safe_action_01', expectedSequence: 1, action: { type: 'guess', value: 42.5 } }))).toEqual({ ok: false, code: 'INVALID_ACTION' })
  })
})

describe('offline match deadlines and loans', () => {
  it('fills missing timed hints, applies a valid loan once, and advances the funding deadline', () => {
    let credentialCounter = 0
    let now = 1_000
    const authority = new LocalMatchAuthority({ roomCode: 'A2BC4D', roomId: 'loan-room', questions: matchQuestions(), now: () => now,
      host: { playerId: 'p0', displayName: 'Host', resumeToken: 'host-resume-token-0001' },
      createCredential: () => `credential_${String(++credentialCounter).padStart(12, '0')}` })
    const guest1 = authority.join('Player 1')
    const guest2 = authority.join('Player 2')
    const guest3 = authority.join('Player 3')
    if (!guest1.ok || !guest2.ok || !guest3.ok) throw new Error('fixture setup failed')
    const players = [{ playerId: 'p0', resumeToken: 'host-resume-token-0001' }, guest1.value, guest2.value, guest3.value]
    for (const player of players) authority.setReady(player.playerId, player.resumeToken, true)
    authority.start('p0', 'host-resume-token-0001', now)

    let actionCounter = 0
    const dispatch = (playerId: string, action: { type: 'bet'; action: { type: 'all-in' | 'call' } } | { type: 'hint-request' } | { type: 'guess'; value: number } | { type: 'loan' }) => {
      const player = players.find((entry) => entry.playerId === playerId)!
      return authority.dispatch({ playerId, resumeToken: player.resumeToken, actionId: `deadline_action_${String(++actionCounter).padStart(4, '0')}`,
        expectedSequence: authority.snapshot(playerId).sequence, action, now })
    }

    const firstActor = authority.snapshot('p0').state.currentActorId!
    expect(dispatch(firstActor, { type: 'bet', action: { type: 'all-in' } }).ok).toBe(true)
    while (authority.snapshot('p0').state.phase === 'question-betting') {
      const actor = authority.snapshot('p0').state.currentActorId!
      expect(dispatch(actor, { type: 'bet', action: { type: 'call' } }).ok).toBe(true)
    }
    expect(authority.snapshot('p0').state.phase).toBe('secret-clue')
    now = authority.snapshot('p0').state.deadline! + 1
    expect(authority.tick(now)).toBe(true)
    expect(authority.snapshot('p0').state.phase).toBe('guess-input')
    for (const player of players) expect(dispatch(player.playerId, { type: 'guess', value: player.playerId === firstActor ? 42 : 0 }).ok).toBe(true)
    expect(authority.snapshot('p0').state.phase).toBe('round-funding')
    const borrower = players.find((player) => player.playerId !== firstActor)!
    expect(dispatch(borrower.playerId, { type: 'loan' }).ok).toBe(true)
    const borrowed = authority.snapshot(borrower.playerId).state.players.find((player) => player.id === borrower.playerId)!
    expect(borrowed).toMatchObject({ chips: 200, debt: 200 })
    expect(dispatch(borrower.playerId, { type: 'loan' })).toEqual({ ok: false, code: 'INVALID_ACTION' })
    const fundingDeadline = authority.snapshot('p0').state.deadline!
    now = fundingDeadline + 1
    expect(authority.tick(now)).toBe(true)
    expect(authority.snapshot('p0').state.roundNumber).toBe(2)
    expect(['question-betting', 'secret-clue', 'round-reveal']).toContain(authority.snapshot('p0').state.phase)
  })
})
