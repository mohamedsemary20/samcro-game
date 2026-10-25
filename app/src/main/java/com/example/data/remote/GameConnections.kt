package com.example.data.remote

import com.example.data.model.BetAction
import com.example.data.model.PrivatePlayerState
import com.example.data.model.PublicGameState
import kotlinx.coroutines.flow.Flow

/** Request/response boundary for a future server-authoritative API client. */
interface GameApiClient {
    suspend fun getPublicGameState(roomId: String): PublicGameState
    suspend fun getPrivatePlayerState(sessionId: String): PrivatePlayerState
    suspend fun submitGuess(sessionId: String, guess: Long)
    suspend fun submitBetAction(sessionId: String, action: BetAction)
}

/** Realtime updates use a separate connection from API requests. */
interface GameRealtimeConnection {
    suspend fun connect(roomId: String)
    fun publicGameUpdates(): Flow<PublicGameState>
    fun privatePlayerUpdates(): Flow<PrivatePlayerState>
    suspend fun disconnect()
}
