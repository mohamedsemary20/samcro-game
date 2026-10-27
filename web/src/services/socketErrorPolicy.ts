export function isSocketTransportFailure(code: string): boolean {
  return code === 'SOCKET_CONNECTION' || code === 'SOCKET_DISCONNECTED' || code === 'SESSION_EXPIRED'
}

export function isDefinitiveRoomRestoreFailure(error: { code: string; status: number }): boolean {
  return (error.code === 'ROOM_NOT_FOUND' && error.status === 404)
    || (error.code === 'ROOM_MEMBERSHIP_REQUIRED' && error.status === 403)
}

export function socketErrorMessage(error: { code: string; message: string }): string {
  const messages: Record<string, string> = {
    ROOM_NOT_FOUND: 'مش لاقيين الغرفة دي. ارجع للرئيسية وراجع الرمز.',
    ROOM_FULL: 'الغرفة كملت. خلي صاحبك يفتح غرفة تانية.',
    ROOM_NOT_WAITING: 'اللعب بدأ في الغرفة دي، فمش هينفع تنضم دلوقتي.',
    QUESTION_BANK_INCOMPLETE: '\u0645\u0634 \u0645\u062a\u0627\u062d \u0623\u0633\u0626\u0644\u0629 \u0643\u0641\u0627\u064a\u0629 \u0644\u0644\u0639\u0628 \u062f\u0644\u0648\u0642\u062a\u064a. \u062c\u0631\u0651\u0628 \u062a\u0627\u0646\u064a \u0628\u0639\u062f\u064a\u0646.',
    PLAYERS_NOT_READY: 'لازم ٣ لاعبين على الأقل يبقوا جاهزين عشان تبدأوا.',
    HOST_REQUIRED: 'صاحب الغرفة بس هو اللي يقدر يبدأ المباراة.',
    OUT_OF_TURN: 'استنى دورك. حدّثنا حالة اللعب من الخادم.',
    SESSION_EXPIRED: 'جلستك انتهت. ارجع للرئيسية وادخل باسمك من جديد.',
    RECONNECT_WINDOW_EXPIRED: 'مهلة الرجوع للغرفة انتهت. ارجع للرئيسية وادخل من جديد.',
    ROOM_MEMBERSHIP_REQUIRED: 'ما بقيتش عضو في الغرفة دي. ارجع للرئيسية وحاول تنضم تاني.',
    ACTION_ALREADY_APPLIED: 'وصلنا قرارك. بنحدّث حالة اللعب دلوقتي.',
  }
  return messages[error.code] ?? 'ما قدرناش ننفّذ طلبك. آخر حالة مؤكدة لسه محفوظة؛ جرّب تاني.'
}
