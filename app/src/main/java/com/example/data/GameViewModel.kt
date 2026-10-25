package com.example.data

import androidx.lifecycle.ViewModel
import com.example.data.model.ChatMessage
import com.example.data.model.BetAction
import com.example.data.model.GamePhase
import com.example.data.model.NavigationTab
import com.example.data.model.Player
import com.example.data.model.TriviaQuestion
import com.example.data.model.UserProfile
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

class GameViewModel : ViewModel() {

    private companion object {
        const val MAX_GUESS_LENGTH = 12
    }

    val avatarUser get() = DevelopmentGameFixtures.avatarUser
    val avatarMaya get() = DevelopmentGameFixtures.avatarMaya
    val avatarKarim get() = DevelopmentGameFixtures.avatarKarim
    val avatarOmar get() = DevelopmentGameFixtures.avatarOmar
    val avatarNour get() = DevelopmentGameFixtures.avatarNour
    val avatarSara get() = DevelopmentGameFixtures.avatarSara
    val avatarAhmed get() = DevelopmentGameFixtures.avatarAhmed

    private val questions = DevelopmentGameFixtures.questions

    private val _currentTab = MutableStateFlow(NavigationTab.LOBBY)
    val currentTab: StateFlow<NavigationTab> = _currentTab.asStateFlow()

    private val _currentPhase = MutableStateFlow(GamePhase.QUESTION_BETTING)
    val currentPhase: StateFlow<GamePhase> = _currentPhase.asStateFlow()

    private val _currentRoundIndex = MutableStateFlow(0)
    val currentRoundIndex: StateFlow<Int> = _currentRoundIndex.asStateFlow()

    val currentQuestion: TriviaQuestion
        get() = questions[_currentRoundIndex.value.coerceIn(questions.indices)]

    private val _pot = MutableStateFlow(1250L)
    val pot: StateFlow<Long> = _pot.asStateFlow()

    private val _userChips = MutableStateFlow(450L)
    val userChips: StateFlow<Long> = _userChips.asStateFlow()

    private val _userGuessInput = MutableStateFlow("33500000")
    val userGuessInput: StateFlow<String> = _userGuessInput.asStateFlow()

    private val _isGoldenHintActive = MutableStateFlow(false)
    val isGoldenHintActive: StateFlow<Boolean> = _isGoldenHintActive.asStateFlow()

    private val _roomCode = MutableStateFlow("7K9D2")
    val roomCode: StateFlow<String> = _roomCode.asStateFlow()

    private val _toastMessage = MutableStateFlow<String?>(null)
    val toastMessage: StateFlow<String?> = _toastMessage.asStateFlow()

    private val _userProfile = MutableStateFlow(UserProfile())
    val userProfile: StateFlow<UserProfile> = _userProfile.asStateFlow()

    private val _chatMessages = MutableStateFlow(DevelopmentGameFixtures.chatMessages)
    val chatMessages: StateFlow<List<ChatMessage>> = _chatMessages.asStateFlow()

    private val _players = MutableStateFlow(DevelopmentGameFixtures.players)
    val players: StateFlow<List<Player>> = _players.asStateFlow()

    fun setTab(tab: NavigationTab) {
        _currentTab.value = tab
    }

    fun setPhase(phase: GamePhase) {
        _currentPhase.value = phase
    }

    fun toggleHintMode(golden: Boolean) {
        _isGoldenHintActive.value = golden
    }

    fun updateGuessInput(digit: String) {
        if (digit.isEmpty() || digit.length > 3 || digit.any { it !in '0'..'9' }) return
        if (digit != "000" && digit.length != 1) return

        val current = _userGuessInput.value
        if (current == "0" || current.isEmpty()) {
            _userGuessInput.value = if (digit == "000") "0" else digit
        } else if (current.length + digit.length <= MAX_GUESS_LENGTH) {
            _userGuessInput.value = current + digit
        }
    }

    fun backspaceGuess() {
        val current = _userGuessInput.value
        if (current.length > 1) {
            _userGuessInput.value = current.dropLast(1)
        } else {
            _userGuessInput.value = "0"
        }
    }

    fun clearGuess() {
        _userGuessInput.value = "0"
    }

    fun submitGuess() {
        showToast("تم اعتماد التخمين: ${_userGuessInput.value}")
        _currentPhase.value = GamePhase.FINAL_BETTING
        _pot.value = 4800L
    }

    fun playerAction(action: String, cost: Long) {
        val betAction = when (action) {
            "fold" -> BetAction.Fold
            "call" -> BetAction.Call(cost)
            "raise" -> BetAction.Raise(cost)
            "allin" -> BetAction.AllIn
            else -> null
        }

        if (betAction == null) {
            showToast("إجراء رهان غير معروف")
            return
        }

        if ((betAction is BetAction.Call || betAction is BetAction.Raise) && cost <= 0) {
            showToast("يجب أن تكون قيمة الرهان أكبر من صفر")
            return
        }

        playerAction(betAction)
    }

    fun playerAction(action: BetAction) {
        when (action) {
            BetAction.Fold -> {
                showToast("انسحبت من الجولة! تم حفظ رصيدك المتبقي.")
                _currentPhase.value = GamePhase.ROUND_REVEAL
            }
            is BetAction.Call -> {
                if (_userChips.value >= action.amount) {
                    _userChips.value -= action.amount
                    _pot.value += action.amount
                    showToast("تمت مساواة الرهان بقيمة ${action.amount} فيشة!")
                    _currentPhase.value = GamePhase.ROUND_REVEAL
                } else {
                    showToast("رصيدك لا يكفي للمساواة!")
                }
            }
            is BetAction.Raise -> {
                val raiseCost = minOf(_userChips.value, action.amount)
                _userChips.value -= raiseCost
                _pot.value += raiseCost
                showToast("قمت بزيادة الرهان +$raiseCost فيشة! ضغط تكتيكي 🔥")
                _currentPhase.value = GamePhase.ROUND_REVEAL
            }
            BetAction.AllIn -> {
                val allinAmt = _userChips.value
                _pot.value += allinAmt
                _userChips.value = 0
                showToast("مخاطرة كبرى! All-In بكل رصيدك ($allinAmt فيشة) 👑")
                _currentPhase.value = GamePhase.ROUND_REVEAL
            }
        }
    }

    fun nextRound() {
        if (_currentRoundIndex.value >= questions.lastIndex) {
            _currentPhase.value = GamePhase.PODIUM_FINISH
            _currentTab.value = NavigationTab.LEADERBOARD
        } else {
            _currentRoundIndex.value += 1
            _currentPhase.value = GamePhase.QUESTION_BETTING
            _pot.value = 1250L + (_currentRoundIndex.value * 300)
            _userChips.value = 450L
            _userGuessInput.value = "33500000"
            _isGoldenHintActive.value = false
            showToast("بدأت الجولة ${_currentRoundIndex.value + 1} من 5!")
        }
    }

    fun restartMatch() {
        _currentRoundIndex.value = 0
        _currentPhase.value = GamePhase.QUESTION_BETTING
        _pot.value = 1250L
        _userChips.value = 450L
        _userGuessInput.value = "33500000"
        _isGoldenHintActive.value = false
        _currentTab.value = NavigationTab.LOBBY
        showToast("تم بدء مباراة جديدة!")
    }

    fun sendChat(text: String) {
        if (text.isBlank()) return
        val newMsg = ChatMessage(
            id = System.currentTimeMillis().toString(),
            senderName = "أنت",
            text = text,
            isUser = true,
            colorHex = 0xFFFFDF98
        )
        _chatMessages.update { it + newMsg }
    }

    fun toggleSound(enabled: Boolean) {
        _userProfile.update { it.copy(soundEffects = enabled) }
        showToast(if (enabled) "تم تفعيل مؤثرات الكازينو" else "تم كتم المؤثرات")
    }

    fun toggleHaptics(enabled: Boolean) {
        _userProfile.update { it.copy(hapticFeedback = enabled) }
        showToast(if (enabled) "تم تفعيل الاهتزاز اللمسي" else "تم تعطيل الاهتزاز")
    }

    fun showToast(msg: String) {
        _toastMessage.value = msg
    }

    fun clearToast() {
        _toastMessage.value = null
    }
}
