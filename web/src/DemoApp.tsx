import { useState, type ReactNode } from 'react'
import { AppShell } from './components/AppShell'
import { developmentFixtures } from './data/developmentFixtures'
import { validateBet, validateGuess } from './domain/validation'
import type { BetAction, GamePhase, GameSnapshot, NavigationTab, UserProfile } from './domain/types'
import { HomePage } from './pages/HomePage'
import { LeaderboardPage } from './pages/LeaderboardPage'
import { LiveGamePage } from './pages/LiveGamePage'
import { LobbyPage } from './pages/LobbyPage'
import { ProfilePage } from './pages/ProfilePage'
import { APP_MODE } from './services/demoMode'
import './styles.css'

function App() {
  const [tab, setTab] = useState<NavigationTab>('home')
  const [profile, setProfile] = useState<UserProfile>(developmentFixtures.profile)
  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => developmentFixtures.createSnapshot())
  const [roundIndex, setRoundIndex] = useState(0)
  const [ready, setReady] = useState(false)
  const [guessText, setGuessText] = useState('33500000')
  const [hintType, setHintType] = useState<'standard' | 'golden'>('standard')
  const [feedback, setFeedback] = useState('')
  const [inGame, setInGame] = useState(false)

  const startMatch = () => {
    setInGame(true)
    setTab('lobby')
    setSnapshot((current) => ({ ...current, publicState: { ...current.publicState, room: { ...current.publicState.room, status: 'in-progress' } } }))
    setFeedback('')
  }

  const updatePhase = (phase: GamePhase) => {
    setSnapshot((current) => ({ ...current, publicState: { ...current.publicState, session: { ...current.publicState.session, phase } } }))
    setFeedback('')
  }

  const submitGuess = () => {
    const validation = validateGuess(guessText)
    if (validation.error || validation.value === undefined) { setFeedback(validation.error ?? 'تعذر اعتماد التخمين.'); return }
    setSnapshot((current) => ({
      ...current,
      privateState: { ...current.privateState, guess: { playerId: current.privateState.playerId, value: validation.value!, submittedAt: Date.now() } },
      publicState: { ...current.publicState, session: { ...current.publicState.session, phase: 'final-betting', pot: 4800 } },
    }))
    setFeedback('تم حفظ تخمينك على هذا الجهاز.')
  }

  const applyBet = (action: BetAction) => {
    const issue = validateBet(action, snapshot.privateState.availableChips)
    if (issue) { setFeedback(issue); return }
    const spent = action.type === 'fold'
      ? 0
      : action.type === 'all-in'
        ? snapshot.privateState.availableChips
        : action.type === 'raise'
          ? Math.min(snapshot.privateState.availableChips, action.amount)
          : action.type === 'call' ? Math.min(snapshot.privateState.availableChips, 200) : 0
    const result = developmentFixtures.getRound(roundIndex)
    setSnapshot((current) => ({
      ...current,
      privateState: { ...current.privateState, availableChips: current.privateState.availableChips - spent },
      publicState: { ...current.publicState, session: { ...current.publicState.session, phase: 'round-reveal', pot: current.publicState.session.pot + spent } },
      result: { roundNumber: result.question.roundNumber, correctAnswer: result.answer, guesses: current.privateState.guess ? [current.privateState.guess] : [], winnerPlayerIds: [] },
    }))
    setFeedback(action.type === 'fold' ? 'انسحبت من الرهان. انكشفت الإجابة في المعاينة.' : 'سُجّل قرارك محلياً. انكشفت الإجابة في المعاينة.')
  }

  const nextRound = () => {
    const nextIndex = roundIndex + 1
    if (nextIndex >= developmentFixtures.rounds.length) {
      setSnapshot((current) => ({ ...current, publicState: { ...current.publicState, room: { ...current.publicState.room, status: 'finished' }, session: { ...current.publicState.session, phase: 'podium-finish' } } }))
      setTab('leaderboard')
      setInGame(false)
      return
    }
    const next = developmentFixtures.createSnapshot(nextIndex)
    next.publicState.room = { ...snapshot.publicState.room, status: 'in-progress' }
    next.publicState.players = snapshot.publicState.players.map((player) => player.id === 'you' ? { ...player, chips: 450, currentBet: 0, status: 'ready' } : { ...player, currentBet: 0 })
    next.publicState.session = { ...next.publicState.session, pot: 1250 + (nextIndex * 300) }
    setSnapshot(next)
    setRoundIndex(nextIndex)
    setGuessText('33500000')
    setHintType('standard')
    setFeedback('بدأت الجولة التالية من تجربة العرض.')
  }

  const restartMatch = () => {
    setRoundIndex(0)
    setSnapshot(developmentFixtures.createSnapshot())
    setGuessText('33500000')
    setHintType('standard')
    setReady(false)
    setInGame(false)
    setTab('lobby')
  }

  const toggleSetting = (key: 'soundEffects' | 'hapticFeedback', enabled: boolean) => {
    setProfile((current) => ({ ...current, [key]: enabled }))
  }

  let page: ReactNode
  if (inGame) {
    page = <LiveGamePage snapshot={snapshot} guessText={guessText} hintType={hintType} feedback={feedback} onHintType={setHintType} onGuessText={setGuessText} onPhase={updatePhase} onBet={applyBet} onSubmitGuess={submitGuess} onNextRound={nextRound} onLeave={() => { setInGame(false); setTab('lobby') }} />
  } else if (tab === 'lobby') {
    page = <LobbyPage players={snapshot.publicState.players} roomCode={snapshot.publicState.room.code} ready={ready} onReady={() => setReady((current) => !current)} onStart={startMatch} onJoin={(code) => setSnapshot((current) => ({ ...current, publicState: { ...current.publicState, room: { ...current.publicState.room, code } } }))} />
  } else if (tab === 'leaderboard') {
    page = <LeaderboardPage entries={snapshot.publicState.leaderboard} onPlayAgain={restartMatch} />
  } else if (tab === 'profile') {
    page = <ProfilePage profile={profile} onToggleSound={(enabled) => toggleSetting('soundEffects', enabled)} onToggleHaptics={(enabled) => toggleSetting('hapticFeedback', enabled)} />
  } else {
    page = <HomePage onPlay={startMatch} onLobby={() => setTab('lobby')} />
  }

  return <div data-mode={APP_MODE}><AppShell activeTab={inGame ? 'lobby' : tab} onNavigate={setTab} chips={inGame ? snapshot.privateState.availableChips : profile.chips} showNav={!inGame}>{page}</AppShell></div>
}

export default App
