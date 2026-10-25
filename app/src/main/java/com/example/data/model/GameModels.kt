package com.example.data.model

/** Local presentation fixture. Network state must use [PublicPlayerState] instead. */
data class Player(
    val id: String,
    val name: String,
    val avatarUrl: String,
    val chips: Long,
    val currentBet: Long = 0,
    val statusText: String = "",
    val statusType: PlayerStatusType = PlayerStatusType.NORMAL,
    val isHost: Boolean = false,
    val isUser: Boolean = false,
    val guess: Long? = null,
    val hasFolded: Boolean = false,
    val isBluffing: Boolean = false,
    val bluffComment: String = ""
)

enum class PlayerStatusType {
    NORMAL,
    READY,
    CONFIRMED,
    RAISED,
    CALLED,
    FOLDED,
    THINKING,
    BLUFF_BUSTED
}

/** Development-only question fixture; never serialize this answer-bearing type to clients. */
data class TriviaQuestion(
    val roundNumber: Int,
    val questionText: String,
    val realAnswer: Long,
    val standardHintRange: String,
    val goldenHintAnswer: String,
    val standardAccuracy: String = "دقة تكتيكية ٦٥٪",
    val advisoryNote: String = "انتبه! قد يكون هذا النطاق حقيقياً أو فخاً مضللاً وضعته اللعبة لاختبار ثقتك وبلوفك أمام الخصوم.",
    val category: String = "سؤال التخمين الثقافي"
)

enum class GamePhase {
    QUESTION_BETTING,
    SECRET_CLUE,
    GUESS_INPUT,
    FINAL_BETTING,
    ROUND_REVEAL,
    PODIUM_FINISH
}

enum class NavigationTab {
    HOME,
    LOBBY,
    LEADERBOARD,
    PROFILE
}

data class ChatMessage(
    val id: String,
    val senderName: String,
    val text: String,
    val isUser: Boolean = false,
    val colorHex: Long = 0xFFFFE4A9
)

data class UserProfile(
    val name: String = "أنت",
    val title: String = "خبير التمويه",
    val level: Int = 12,
    val xp: Int = 340,
    val maxXp: Int = 1000,
    val playerId: String = "#SK-884920",
    val maxBet: Long = 2000,
    val winRate: Int = 29,
    val totalRounds: Int = 48,
    val chips: Long = 125500,
    val soundEffects: Boolean = true,
    val hapticFeedback: Boolean = true,
    val cardSkinTitle: String = "ورقة الذهب الأسود",
    val tableFeltTitle: String = "طاولة السلاطين الزمردية"
)
