import sourcePack from '../../assets/offline-questions.json'
import { validateOfflineQuestionBundle } from '@game-core/offlineQuestions'

export const offlineQuestionPack = validateOfflineQuestionBundle(sourcePack)
export const offlineQuestionReadiness = {
  approvedCount: Array.isArray((sourcePack as { questions?: unknown[] }).questions) ? (sourcePack as { questions: unknown[] }).questions.length : 0,
  playableCount: offlineQuestionPack.questions.length,
  requiredCount: 5,
  ready: offlineQuestionPack.valid,
  issues: offlineQuestionPack.issues,
}
