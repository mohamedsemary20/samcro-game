import type { ChatMessage, DemoRoundFixture, GameSnapshot, LeaderboardEntry, Player, UserProfile } from '../domain/types'

const questions: DemoRoundFixture[] = [
  { question: { id: 'q1', roundNumber: 1, prompt: 'ما عدد سكان كندا تقريباً في عام ٢٠٢٠؟', category: 'سؤال التخمين الثقافي' }, answer: 38005238, goldenHintAnswer: '38,005,238', hint: { questionId: 'q1', range: '30,000,000 – 40,000,000', accuracy: 'دقة تكتيكية ٦٥٪', advisoryNote: 'قد يكون هذا النطاق حقيقياً أو فخاً مضللاً وضعته اللعبة لاختبار ثقتك.' } },
  { question: { id: 'q2', roundNumber: 2, prompt: 'كم يبلغ طول نهر النيل العظيم بالكيلومترات؟', category: 'جغرافيا' }, answer: 6650, goldenHintAnswer: '6,650', hint: { questionId: 'q2', range: '6,000 – 7,500', accuracy: 'دقة تكتيكية ٧٠٪', advisoryNote: 'تحقّق من تقديرات خصومك؛ بعضهم قد يبالغ لرفع قيمة الوعاء.' } },
  { question: { id: 'q3', roundNumber: 3, prompt: 'ما هي مساحة المملكة العربية السعودية بالكيلومتر المربع؟', category: 'جغرافيا' }, answer: 2149690, goldenHintAnswer: '2,149,690', hint: { questionId: 'q3', range: '1,800,000 – 2,500,000', accuracy: 'دقة تكتيكية ٦٨٪', advisoryNote: 'جولة حاسمة: الرهان هنا قد يغيّر ترتيب المتصدرين.' } },
  { question: { id: 'q4', roundNumber: 4, prompt: 'كم عدد الأيام التي يستغرقها كوكب عطارد للدوران حول الشمس؟', category: 'علوم' }, answer: 88, goldenHintAnswer: '88', hint: { questionId: 'q4', range: '70 – 110', accuracy: 'دقة تكتيكية ٧٥٪', advisoryNote: 'انتبه إلى الفرق بين اليوم الشمسي وفترة الدوران حول الشمس.' } },
  { question: { id: 'q5', roundNumber: 5, prompt: 'ما هو الارتفاع القياسي لبرج خليفة بالأمتار؟', category: 'معلومات عامة' }, answer: 828, goldenHintAnswer: '828', hint: { questionId: 'q5', range: '750 – 900', accuracy: 'دقة تكتيكية ٨٠٪', advisoryNote: 'الجولة الأخيرة؛ راقب رصيدك قبل اختيار الرهان.' } },
]

const demoPlayers: Player[] = [
  { id: 'you', name: 'أنت', chips: 450, currentBet: 0, status: 'ready', isHost: true },
  { id: 'maya', name: 'مايا', chips: 1820, currentBet: 150, status: 'called', isHost: false, avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB6IOz-j3Mdsm3Ch7wqBt91OVcb1JaJHVIIPvrZgu2GiqdaXKevuf13keCGMTgyCiZb7Unyvfaila4yFDuTQFl9rDpJQAt9-_G5cOsQJ3_2LAkrQUFr0rnXXFHNVnKF9o7XjsFM2Q8vzY3kzjUmMzeYYNXGRCohInojrM0-X1q0_fMhJUpwmJFtyvPGzvAmS2yYtRiM6lAf0O1KZ9Bu2c3ZofEbtfIaItVnSDDgZ0Wx_yTwkRZirwdgJA' },
  { id: 'karim', name: 'كريم', chips: 960, currentBet: 300, status: 'raised', isHost: false, avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCxlH873vHScfRkaP-xQrywRc_MnqO29Rl6VQGBncw4l6EPfVMaCICotKOtpexECHIqWcrfRRtPR78vl52-hGA7WaYIKDQoLAvUNPZO2jRs0AkYPHaZqwm5tVsBYu9Ye0Hc9vTQ6iEGqJbU2NqY0ja91pK78Cis4QXkBlBLHJQR-1gLORcNlfPxBRoLLAngK1-fLGxe8B1WoGCWy2iSZP4sRn7R9Y7YNuEHZIqynD9NaDDvn_ZUfOewhw' },
  { id: 'omar', name: 'عمر', chips: 2250, currentBet: 0, status: 'thinking', isHost: false, avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuABhgqtDTXAPtf1O5Nvqo1f6Rx2XEo37aXrxbgOFjDPOLLQBH6xQ53Jhv15N560SaKcRzT-SgmN-UHk3Ug3kCCM81IhqeEloUdIBh7M50xkVlBbU1JsDNaoeKD1Ov0A6CuXK0ZPQ4boADnwQa_koOwSVbHvwU6EWcvRtzksU-_gVMpPw-696iFWM3FT5VDqS-N_53vHEV5kRDEc0GmxWYrCph9ibydJg0fBd3HQDR1439-juyYwICk-Pw' },
]

demoPlayers[0] = { ...demoPlayers[0]!, avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBpNdQzw7XB328n-doa-XGQmg4IsPGluBsY2uHdRr_8_hEsTn5jbaabgp4-bJW-3QbPPDynl6LB6PLoQTD-4jBfw1vvzr7T3hR2MIj_KeMNxQt7jUypSX3vJSTRi7mpCCRc92GE_4KVK7AhjXcjLkhiqNYQ9M5Kv8pYIPkds6ejAQ83a4UZYVh7uYlU1OUjHgYrh6RxvbJhkzAUqIk60WuNjdSC4KBSnklkbFtwbLQV0XRYeuVPrD_xtg' }

demoPlayers.push(
  { id: 'nour', name: 'Nour', chips: 310, currentBet: 0, status: 'ready', isHost: false, avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAzqaSDjyVPTkpiodgM8FP5T98B8ha883R8VjzTy9ztS5HO-4DXOkL1mvxI7NSAr02iiAE7r3aX39O6tjOwfvsPqJdjl0KZHhzP8k0swqC8vw6HaeoOaowUT31rHxzTjdcQFQHcXiMNZGti5aS6NThjUFygSnI8GtJxW6OXy0XJyCR-k_NSyX4y7FpJjM_msyzt2JK-DLZfejDstBL7_nCW0YIjq3zIvdb95DUBrKRFYkLge0MFdNMCA' },
  { id: 'sara', name: 'Sara', chips: 700, currentBet: 0, status: 'ready', isHost: false, avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB0nwzfsakQ7nAPbnBX7Qh20oUJJDlf-4Ctn6CMtz3gUjbL3bukBXalRTGi-Op-klL7dkZMyyQMwCvwGSMicLM_pADDBvBZD7uERyXsddjACAOWHN3vCUU5QcW5IU69oj9n_0PQwqfkHo0XqOAy6M5BVyLqwd8dBfX2dBf0CTILiCmwtMPZN8UnRRRVr19pvpDI7CuscfPBdApEdCGRARwAr_F3yY8Y5CGiTYNB43RsvoirK_P-fy8Dpg' },
)

export const developmentFixtures = {
  rounds: questions,
  profile: { name: 'أنت', avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBpNdQzw7XB328n-doa-XGQmg4IsPGluBsY2uHdRr_8_hEsTn5jbaabgp4-bJW-3QbPPDynl6LB6PLoQTD-4jBfw1vvzr7T3hR2MIj_KeMNxQt7jUypSX3vJSTRi7mpCCRc92GE_4KVK7AhjXcjLkhiqNYQ9M5Kv8pYIPkds6ejAQ83a4UZYVh7uYlU1OUjHgYrh6RxvbJhkzAUqIk60WuNjdSC4KBSnklkbFtwbLQV0XRYeuVPrD_xtg', title: 'خبير التمويه', level: 12, xp: 340, maxXp: 1000, chips: 125500, maxBet: 2000, winRate: 29, totalRounds: 48, cardSkinTitle: 'ورقة الذهب الأسود', tableFeltTitle: 'طاولة السلاطين الزمردية', soundEffects: true, hapticFeedback: true } satisfies UserProfile,
  chatMessages: [
    { id: 'chat-1', senderName: 'Maya', text: 'مستعدين للتحدي! لا أحد يخمّن عشوائي هالمرة 😉', isUser: false },
    { id: 'chat-2', senderName: 'Omar', text: 'الرهان مضاعف يا شباب 🔥', isUser: false },
  ] satisfies ChatMessage[],
  leaderboard: [
    { playerId: 'maya', displayName: 'مايا', score: 2840, rank: 1 },
    { playerId: 'karim', displayName: 'كريم', score: 2310, rank: 2 },
    { playerId: 'you', displayName: 'أنت', score: 1980, rank: 3 },
    { playerId: 'omar', displayName: 'عمر', score: 1650, rank: 4 },
  ] satisfies LeaderboardEntry[],
  createSnapshot(roundIndex = 0): GameSnapshot {
    const round = questions[roundIndex]!
    return {
      publicState: {
        room: { id: 'room-demo', code: '7K9D2', hostPlayerId: 'you', playerIds: demoPlayers.map((player) => player.id), status: 'waiting' },
        session: { id: 'session-demo', roomId: 'room-demo', roundNumber: round.question.roundNumber, phase: 'question-betting', pot: 1250, questionId: round.question.id },
        question: round.question,
        players: demoPlayers.map((player) => ({ ...player })),
        roundProgress: demoPlayers.map((player, index) => ({
          playerId: player.id,
          status: index === 0 ? 'guessing' : index === 1 ? 'guess-submitted' : 'waiting',
          hasHint: true,
          hasGuess: index === 1,
          currentStreetWager: player.currentBet,
        })),
        leaderboard: this.leaderboard,
      },
      privateState: { playerId: 'you', matchId: 'session-demo', roundNumber: round.question.roundNumber, stateVersion: 0, hint: round.hint, goldenHint: round.goldenHintAnswer, guess: null, availableChips: 450, roundContribution: 50 },
      // This is development-only reveal material, never sent through PublicGameState.
      result: null,
    }
  },
  getRound(roundIndex: number) { return questions[roundIndex]! },
}

