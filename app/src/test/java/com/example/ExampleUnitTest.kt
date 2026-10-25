package com.example

import com.example.data.GameViewModel
import com.example.data.model.GamePhase
import com.example.data.model.NavigationTab
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class ExampleUnitTest {

    private lateinit var viewModel: GameViewModel

    @Before
    fun setup() {
        viewModel = GameViewModel()
    }

    @Test
    fun testKeypadInputAppendsProperly() {
        viewModel.clearGuess()
        assertEquals("0", viewModel.userGuessInput.value)

        viewModel.updateGuessInput("3")
        assertEquals("3", viewModel.userGuessInput.value)

        viewModel.updateGuessInput("5")
        assertEquals("35", viewModel.userGuessInput.value)

        viewModel.updateGuessInput("000")
        assertEquals("35000", viewModel.userGuessInput.value)

        viewModel.backspaceGuess()
        assertEquals("3500", viewModel.userGuessInput.value)
    }

    @Test
    fun testRoundProgressionAndQuestions() {
        assertEquals(0, viewModel.currentRoundIndex.value)
        assertEquals(1, viewModel.currentQuestion.roundNumber)

        viewModel.nextRound()
        assertEquals(1, viewModel.currentRoundIndex.value)
        assertEquals(2, viewModel.currentQuestion.roundNumber)
    }

    @Test
    fun testTabNavigation() {
        viewModel.setTab(NavigationTab.PROFILE)
        assertEquals(NavigationTab.PROFILE, viewModel.currentTab.value)

        viewModel.setTab(NavigationTab.LEADERBOARD)
        assertEquals(NavigationTab.LEADERBOARD, viewModel.currentTab.value)
    }

    @Test
    fun testHintModeToggle() {
        assertFalse(viewModel.isGoldenHintActive.value)
        viewModel.toggleHintMode(true)
        assertTrue(viewModel.isGoldenHintActive.value)
    }

    @Test
    fun testPlayerCallAction() {
        val initialPot = viewModel.pot.value
        val initialChips = viewModel.userChips.value
        viewModel.playerAction("call", 50)

        assertEquals(initialPot + 50, viewModel.pot.value)
        assertEquals(initialChips - 50, viewModel.userChips.value)
        assertEquals(GamePhase.ROUND_REVEAL, viewModel.currentPhase.value)
    }

    @Test
    fun testGuessInputRejectsNonDigitsAndEnforcesLimit() {
        viewModel.clearGuess()
        viewModel.updateGuessInput("1")
        viewModel.updateGuessInput("2")
        viewModel.updateGuessInput("abc")
        assertEquals("12", viewModel.userGuessInput.value)

        viewModel.clearGuess()
        repeat(12) { viewModel.updateGuessInput("1") }
        assertEquals("111111111111", viewModel.userGuessInput.value)
        viewModel.updateGuessInput("1")
        assertEquals("111111111111", viewModel.userGuessInput.value)
    }

    @Test
    fun testInvalidBetCannotChangeBalances() {
        val initialPot = viewModel.pot.value
        val initialChips = viewModel.userChips.value

        viewModel.playerAction("call", -50)
        viewModel.playerAction("unknown", 50)

        assertEquals(initialPot, viewModel.pot.value)
        assertEquals(initialChips, viewModel.userChips.value)
    }
}
