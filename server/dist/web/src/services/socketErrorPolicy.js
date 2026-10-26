export function isSocketTransportFailure(code) {
    return code === 'SOCKET_CONNECTION' || code === 'SOCKET_DISCONNECTED' || code === 'SESSION_EXPIRED';
}
export function isDefinitiveRoomRestoreFailure(error) {
    return (error.code === 'ROOM_NOT_FOUND' && error.status === 404)
        || (error.code === 'ROOM_MEMBERSHIP_REQUIRED' && error.status === 403);
}
export function socketErrorMessage(error) {
    const messages = {
        ROOM_NOT_FOUND: 'مش لاقيين الغرفة دي. ارجع للرئيسية وراجع الرمز.',
        ROOM_FULL: 'الغرفة كملت. خلي صاحبك يفتح غرفة تانية.',
        ROOM_NOT_WAITING: 'اللعب بدأ في الغرفة دي، فمش هينفع تنضم دلوقتي.',
        QUESTION_BANK_INCOMPLETE: 'مفيش أسئلة معتمدة كفاية للعب دلوقتي. الغرفة زي ما هي؛ جرّب تاني بعدين.',
        PLAYERS_NOT_READY: 'لازم ٣ لاعبين على الأقل يبقوا جاهزين عشان تبدأوا.',
        HOST_REQUIRED: 'صاحب الغرفة بس هو اللي يقدر يبدأ المباراة.',
        OUT_OF_TURN: 'استنى دورك. حدّثنا حالة اللعب من الخادم.',
        SESSION_EXPIRED: 'جلستك انتهت. ارجع للرئيسية وادخل باسمك من جديد.',
        RECONNECT_WINDOW_EXPIRED: 'مهلة الرجوع للغرفة انتهت. ارجع للرئيسية وادخل من جديد.',
        ROOM_MEMBERSHIP_REQUIRED: 'ما بقيتش عضو في الغرفة دي. ارجع للرئيسية وحاول تنضم تاني.',
        ACTION_ALREADY_APPLIED: 'وصلنا قرارك. بنحدّث حالة اللعب دلوقتي.',
    };
    return messages[error.code] ?? 'ما قدرناش ننفّذ طلبك. آخر حالة مؤكدة لسه محفوظة؛ جرّب تاني.';
}
