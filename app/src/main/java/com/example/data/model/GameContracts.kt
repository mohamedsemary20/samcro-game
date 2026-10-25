package com.example.data.model

/** A server-owned room and its current membership. */
data class Room(
    val id: String,
    val code: String,
    val hostPlayerId: String,
    val playerIds: List<String>,
    val status: RoomStatus
)

enum class RoomStatus {
    WAITING,
    IN_PROGRESS,
    FINISHED
}

/** A single match, separate from presentation and room navigation. */
data class GameSession(
    val id: String,
    val roomId: String,
    val roundNumber: Int,
    val phase: GamePhase,
    val pot: Long,
    val questionId: String
)

/** Safe question information that may be sent to every player. */
data class Question(
    val id: String,
    val roundNumber: Int,
    val prompt: String,
    val category: String
)

/** Private question material delivered only to the owning player. */
data class PlayerHint(
    val questionId: String,
    val range: String,
    val accuracy: String,
    val advisoryNote: String
)

/** A player's guess remains private until the round is revealed. */
data class PlayerGuess(
    val playerId: String,
    val value: Long,
    val submittedAtEpochMillis: Long
)

sealed interface BetAction {
    data object Fold : BetAction
    data class Call(val amount: Long) : BetAction
    data class Raise(val amount: Long) : BetAction
    data object AllIn : BetAction
}

/** Public player data deliberately excludes guesses and private hints. */
data class PublicPlayerState(
    val id: String,
    val name: String,
    val chips: Long,
    val currentBet: Long,
    val status: PlayerStatusType,
    val hasFolded: Boolean
)

data class PublicGameState(
    val room: Room,
    val session: GameSession,
    val question: Question,
    val players: List<PublicPlayerState>,
    val leaderboard: List<LeaderboardEntry>
)

/** Private state scoped to the authenticated player requesting the session. */
data class PrivatePlayerState(
    val playerId: String,
    val hint: PlayerHint?,
    val guess: PlayerGuess?,
    val availableChips: Long
)

data class RoundResult(
    val roundNumber: Int,
    val correctAnswer: Long,
    val guesses: List<PlayerGuess>,
    val winnerPlayerIds: List<String>
)

data class LeaderboardEntry(
    val playerId: String,
    val displayName: String,
    val score: Long,
    val rank: Int
)

