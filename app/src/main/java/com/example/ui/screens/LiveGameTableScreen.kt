package com.example.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBackIos
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.ArrowForwardIos
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.Backspace
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.filled.Casino
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Style
import androidx.compose.material.icons.filled.Done
import androidx.compose.material.icons.filled.DoneAll
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.HourglassTop
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.MilitaryTech
import androidx.compose.material.icons.filled.MonetizationOn
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Quiz
import androidx.compose.material.icons.filled.SkipPrevious
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Stars
import androidx.compose.material.icons.filled.TheaterComedy
import androidx.compose.material.icons.filled.Toll
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material.icons.filled.WorkspacePremium
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.data.GameViewModel
import com.example.data.model.GamePhase
import com.example.data.model.NavigationTab
import com.example.data.model.Player
import com.example.data.model.PlayerStatusType
import com.example.ui.components.CircularTimerRing
import com.example.ui.components.ConfettiEffect
import com.example.ui.theme.CairoFontFamily
import com.example.ui.theme.CasinoBlueCall
import com.example.ui.theme.CasinoError
import com.example.ui.theme.CasinoErrorContainer
import com.example.ui.theme.CasinoFeltDark
import com.example.ui.theme.CasinoFeltGlow
import com.example.ui.theme.CasinoGoldShimmer
import com.example.ui.theme.CasinoOnError
import com.example.ui.theme.CasinoOnErrorContainer
import com.example.ui.theme.CasinoOnPrimary
import com.example.ui.theme.CasinoOnPrimaryContainer
import com.example.ui.theme.CasinoOnSecondary
import com.example.ui.theme.CasinoOnSecondaryContainer
import com.example.ui.theme.CasinoOnSurface
import com.example.ui.theme.CasinoOnSurfaceVariant
import com.example.ui.theme.CasinoOutlineVariant
import com.example.ui.theme.CasinoPrimary
import com.example.ui.theme.CasinoPrimaryContainer
import com.example.ui.theme.CasinoPrimaryFixed
import com.example.ui.theme.CasinoSecondary
import com.example.ui.theme.CasinoSecondaryContainer
import com.example.ui.theme.CasinoSurface
import com.example.ui.theme.CasinoSurfaceContainer
import com.example.ui.theme.CasinoSurfaceContainerHigh
import com.example.ui.theme.CasinoSurfaceContainerHighest
import com.example.ui.theme.CasinoSurfaceContainerLow
import com.example.ui.theme.CasinoSurfaceContainerLowest
import com.example.ui.theme.TajawalFontFamily

@Composable
fun LiveGameTableScreen(
    viewModel: GameViewModel,
    onBack: () -> Unit
) {
    val phase by viewModel.currentPhase.collectAsState()
    val roundIndex by viewModel.currentRoundIndex.collectAsState()
    val question = viewModel.currentQuestion
    val pot by viewModel.pot.collectAsState()
    val userChips by viewModel.userChips.collectAsState()
    val isGoldenHint by viewModel.isGoldenHintActive.collectAsState()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(CasinoSurface)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
        ) {
            // Live Game Table Header Bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .background(CasinoSurfaceContainerLowest.copy(alpha = 0.95f))
                    .padding(horizontal = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                IconButton(
                    onClick = {
                        if (phase == GamePhase.QUESTION_BETTING) onBack()
                        else viewModel.setPhase(GamePhase.QUESTION_BETTING)
                    },
                    modifier = Modifier
                        .size(38.dp)
                        .clip(CircleShape)
                        .background(CasinoSurfaceContainer)
                        .testTag("game_table_back_btn")
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowForwardIos,
                        contentDescription = "رجوع",
                        tint = CasinoOnSurface,
                        modifier = Modifier.size(16.dp)
                    )
                }

                Text(
                    text = "Live Game Table",
                    fontFamily = CairoFontFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 17.sp,
                    color = CasinoPrimary
                )

                Box(
                    modifier = Modifier
                        .size(32.dp)
                        .clip(CircleShape)
                        .background(CasinoPrimary),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Person,
                        contentDescription = null,
                        tint = CasinoOnPrimary,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }

            // Phase Content
            when (phase) {
                GamePhase.QUESTION_BETTING -> {
                    QuestionBettingContent(
                        viewModel = viewModel,
                        roundIndex = roundIndex,
                        pot = pot,
                        userChips = userChips
                    )
                }
                GamePhase.SECRET_CLUE -> {
                    SecretClueContent(
                        viewModel = viewModel,
                        roundIndex = roundIndex,
                        isGoldenHint = isGoldenHint,
                        onUnderstood = {
                            viewModel.setPhase(GamePhase.GUESS_INPUT)
                        }
                    )
                }
                GamePhase.GUESS_INPUT -> {
                    GuessInputContent(
                        viewModel = viewModel,
                        roundIndex = roundIndex,
                        onSubmit = {
                            viewModel.submitGuess()
                        }
                    )
                }
                GamePhase.FINAL_BETTING -> {
                    FinalBettingContent(
                        viewModel = viewModel,
                        roundIndex = roundIndex,
                        pot = pot,
                        userChips = userChips
                    )
                }
                GamePhase.ROUND_REVEAL -> {
                    RoundRevealContent(
                        viewModel = viewModel,
                        roundIndex = roundIndex,
                        pot = pot,
                        onNextRound = {
                            viewModel.nextRound()
                        }
                    )
                }
                GamePhase.PODIUM_FINISH -> {
                    // Handled in LeaderboardScreen
                }
            }
        }
    }
}

/* =======================================================================
   PHASE 1: QUESTION & FIRST BETTING ROUND (Image 11 / 12)
   ======================================================================= */
@Composable
private fun QuestionBettingContent(
    viewModel: GameViewModel,
    roundIndex: Int,
    pot: Long,
    userChips: Long
) {
    val question = viewModel.currentQuestion
    val players by viewModel.players.collectAsState()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        // Round Indicator & Secret Clue Quick Button
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "الجولة ${roundIndex + 1} من 5",
                        fontFamily = CairoFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = CasinoPrimary
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        repeat(5) { i ->
                            Box(
                                modifier = Modifier
                                    .size(if (i == roundIndex) 8.dp else 6.dp)
                                    .clip(CircleShape)
                                    .background(if (i <= roundIndex) CasinoPrimaryContainer else CasinoSurfaceContainerHighest)
                            )
                        }
                    }
                }

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(CasinoSurfaceContainer)
                            .clickable { viewModel.setPhase(GamePhase.SECRET_CLUE) }
                            .padding(horizontal = 10.dp, vertical = 5.dp)
                            .testTag("view_secret_clue_button"),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Visibility,
                            contentDescription = null,
                            tint = CasinoPrimary,
                            modifier = Modifier.size(14.dp)
                        )
                        Text(
                            text = "تلميحك السري",
                            fontFamily = CairoFontFamily,
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp,
                            color = CasinoOnSurface
                        )
                    }

                    IconButton(
                        onClick = { viewModel.showToast("خيارات الطاولة الملكية") },
                        modifier = Modifier
                            .size(32.dp)
                            .clip(CircleShape)
                            .background(CasinoSurfaceContainerHigh)
                    ) {
                        Icon(
                            imageVector = Icons.Default.MoreVert,
                            contentDescription = null,
                            tint = CasinoOnSurfaceVariant,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }
        }

        // Parchment Trivia Question Card
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .border(1.dp, CasinoPrimaryContainer.copy(alpha = 0.35f), RoundedCornerShape(16.dp)),
                colors = CardDefaults.cardColors(containerColor = CasinoFeltGlow)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Quiz,
                            contentDescription = null,
                            tint = CasinoPrimaryContainer,
                            modifier = Modifier.size(16.dp)
                        )
                        Text(
                            text = question.category,
                            fontFamily = CairoFontFamily,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 12.sp,
                            color = CasinoPrimary.copy(alpha = 0.8f)
                        )
                    }

                    Text(
                        text = question.questionText,
                        fontFamily = CairoFontFamily,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 19.sp,
                        color = CasinoPrimary,
                        textAlign = TextAlign.Center,
                        lineHeight = 26.sp
                    )

                    Row(
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(CasinoSurfaceContainerLowest.copy(alpha = 0.8f))
                            .padding(horizontal = 12.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(6.dp)
                                .clip(CircleShape)
                                .background(CasinoSecondary)
                        )
                        Text(
                            text = "دورك في التخمين أو المراهنة الآن",
                            fontFamily = TajawalFontFamily,
                            fontSize = 11.sp,
                            color = CasinoSecondary
                        )
                    }
                }
            }
        }

        // Central Felt Casino Table Arena
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(310.dp)
                    .clip(RoundedCornerShape(32.dp))
                    .background(
                        Brush.verticalGradient(
                            listOf(
                                Color(0xFF1E120B),
                                Color(0xFF120A07),
                                Color(0xFF090604)
                            )
                        )
                    )
                    .border(1.5.dp, CasinoPrimaryContainer.copy(alpha = 0.25f), RoundedCornerShape(32.dp))
                    .padding(8.dp)
            ) {
                // Top Row: Maya (Left) & Karim (Right) + Timer Center
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 14.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top
                ) {
                    // Maya
                    TableAvatarPill(
                        name = "Maya",
                        avatarUrl = viewModel.avatarMaya,
                        bet = 480,
                        status = "جاهز",
                        statusColor = CasinoSecondary
                    )

                    // Timer Center
                    CircularTimerRing(
                        initialSeconds = 16,
                        totalSeconds = 20,
                        size = 46.dp,
                        strokeWidth = 3.dp,
                        label = "ثانية للتفكير"
                    )

                    // Karim
                    TableAvatarPill(
                        name = "Karim",
                        avatarUrl = viewModel.avatarKarim,
                        bet = 520,
                        status = "راهن",
                        statusColor = CasinoPrimaryContainer
                    )
                }

                // Middle Center Pot Display
                Box(
                    modifier = Modifier
                        .align(Alignment.Center)
                        .clip(RoundedCornerShape(20.dp))
                        .background(CasinoSurfaceContainerLowest.copy(alpha = 0.95f))
                        .border(1.dp, CasinoPrimaryContainer.copy(alpha = 0.4f), RoundedCornerShape(20.dp))
                        .padding(horizontal = 24.dp, vertical = 8.dp)
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Toll,
                                contentDescription = null,
                                tint = CasinoPrimaryContainer,
                                modifier = Modifier.size(15.dp)
                            )
                            Text(
                                text = "إجمالي الرهان (Pot)",
                                fontFamily = CairoFontFamily,
                                fontSize = 11.sp,
                                color = CasinoOnSurfaceVariant
                            )
                        }

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.MonetizationOn,
                                contentDescription = null,
                                tint = CasinoPrimaryContainer,
                                modifier = Modifier.size(20.dp)
                            )
                            Text(
                                text = String.format("%,d", pot),
                                fontFamily = CairoFontFamily,
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 24.sp,
                                color = CasinoPrimary
                            )
                        }

                        // Decorative stacked chips
                        Row(horizontalArrangement = Arrangement.spacedBy((-4).dp)) {
                            Box(modifier = Modifier.size(12.dp).clip(CircleShape).background(CasinoPrimaryContainer))
                            Box(modifier = Modifier.size(12.dp).clip(CircleShape).background(CasinoSecondary))
                            Box(modifier = Modifier.size(12.dp).clip(CircleShape).background(CasinoError))
                        }
                    }
                }

                // Middle Row: Nour (Left) & Omar (Right)
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.Center)
                        .padding(horizontal = 6.dp)
                ) {
                    Box(modifier = Modifier.align(Alignment.CenterStart)) {
                        TableAvatarPill(
                            name = "Nour",
                            avatarUrl = viewModel.avatarNour,
                            bet = 310,
                            status = "جاهز",
                            statusColor = CasinoSecondary
                        )
                    }

                    Box(modifier = Modifier.align(Alignment.CenterEnd)) {
                        TableAvatarPill(
                            name = "Omar",
                            avatarUrl = viewModel.avatarOmar,
                            bet = 600,
                            status = "جاهز",
                            statusColor = CasinoSecondary
                        )
                    }
                }

                // Bottom Center: User Hero Avatar
                Column(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 6.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(contentAlignment = Alignment.TopCenter) {
                        Box(
                            modifier = Modifier
                                .size(56.dp)
                                .clip(CircleShape)
                                .border(2.dp, CasinoPrimaryContainer, CircleShape)
                        ) {
                            AsyncImage(
                                model = viewModel.avatarUser,
                                contentDescription = "أنت",
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop
                            )
                        }

                        Box(
                            modifier = Modifier
                                .clip(CircleShape)
                                .background(CasinoPrimaryContainer)
                                .padding(horizontal = 6.dp, vertical = 1.dp)
                        ) {
                            Text(
                                text = "👑 دورك",
                                fontFamily = CairoFontFamily,
                                fontWeight = FontWeight.Bold,
                                fontSize = 9.sp,
                                color = CasinoOnPrimary
                            )
                        }
                    }

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Text(
                            text = "أنت",
                            fontFamily = CairoFontFamily,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = CasinoPrimary
                        )
                        Row(
                            modifier = Modifier
                                .clip(CircleShape)
                                .background(CasinoSurfaceContainerLowest)
                                .padding(horizontal = 6.dp, vertical = 2.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.MonetizationOn,
                                contentDescription = null,
                                tint = CasinoPrimaryContainer,
                                modifier = Modifier.size(12.dp)
                            )
                            Text(
                                text = "$userChips",
                                fontFamily = CairoFontFamily,
                                fontWeight = FontWeight.Bold,
                                fontSize = 11.sp,
                                color = CasinoPrimary
                            )
                        }
                    }
                }
            }
        }

        // Status Pill
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(CasinoSurfaceContainerLow)
                    .padding(horizontal = 14.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "المطلوب للمتابعة: ٥٠ فيشة",
                    fontFamily = TajawalFontFamily,
                    fontSize = 12.sp,
                    color = CasinoOnSurfaceVariant
                )
                Text(
                    text = "رصيدك: $userChips",
                    fontFamily = CairoFontFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                    color = CasinoPrimary
                )
            }
        }

        // 4 Tactical Action Buttons
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 80.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // 1. Fold
                ActionBetButton(
                    title = "انسحاب",
                    subtitle = null,
                    icon = Icons.Default.Close,
                    containerColor = CasinoErrorContainer,
                    contentColor = CasinoOnError,
                    modifier = Modifier.weight(1f),
                    testTag = "btn_fold",
                    onClick = {
                        viewModel.playerAction("fold", 50)
                    }
                )

                // 2. Call 50
                ActionBetButton(
                    title = "مساواة",
                    subtitle = "50 🪙",
                    icon = null,
                    containerColor = CasinoBlueCall,
                    contentColor = Color.White,
                    modifier = Modifier.weight(1f),
                    testTag = "btn_call",
                    onClick = {
                        viewModel.playerAction("call", 50)
                    }
                )

                // 3. Raise 100
                ActionBetButton(
                    title = "زيادة",
                    subtitle = "+100 🪙",
                    icon = Icons.Default.ArrowUpward,
                    containerColor = CasinoSecondaryContainer,
                    contentColor = CasinoOnSecondary,
                    modifier = Modifier.weight(1f),
                    testTag = "btn_raise",
                    onClick = {
                        viewModel.playerAction("raise", 100)
                    }
                )

                // 4. All-In
                ActionBetButton(
                    title = "الكل",
                    subtitle = "$userChips 🪙",
                    icon = Icons.Default.LocalFireDepartment,
                    containerColor = CasinoPrimaryContainer,
                    contentColor = CasinoOnPrimary,
                    modifier = Modifier.weight(1f),
                    testTag = "btn_allin",
                    onClick = {
                        viewModel.playerAction("allin", userChips)
                    }
                )
            }
        }
    }
}

/* =======================================================================
   PHASE 2: SECRET CLUE CARD SCREEN (Image 13 / 14)
   ======================================================================= */
@Composable
private fun SecretClueContent(
    viewModel: GameViewModel,
    roundIndex: Int,
    isGoldenHint: Boolean,
    onUnderstood: () -> Unit
) {
    val question = viewModel.currentQuestion

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Round Tracker & Dots
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Casino,
                        contentDescription = null,
                        tint = CasinoPrimary,
                        modifier = Modifier.size(16.dp)
                    )
                    Text(
                        text = "الجولة ${roundIndex + 1} من 5",
                        fontFamily = CairoFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = CasinoPrimary
                    )
                }

                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    repeat(5) { i ->
                        Box(
                            modifier = Modifier
                                .size(if (i == roundIndex) 8.dp else 5.dp)
                                .clip(CircleShape)
                                .background(if (i <= roundIndex) CasinoPrimaryContainer else CasinoSurfaceContainerHighest)
                        )
                    }
                }
            }
        }

        // Hint Mode Switcher: Standard vs Golden VIP
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(CircleShape)
                    .background(CasinoSurfaceContainerLowest)
                    .padding(4.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                // Standard Hint Tab
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(CircleShape)
                        .background(if (!isGoldenHint) CasinoSurfaceContainerHigh else Color.Transparent)
                        .clickable { viewModel.toggleHintMode(false) }
                        .padding(vertical = 8.dp)
                        .testTag("tab_standard_hint"),
                    contentAlignment = Alignment.Center
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.VisibilityOff,
                            contentDescription = null,
                            tint = if (!isGoldenHint) CasinoPrimary else CasinoOnSurfaceVariant,
                            modifier = Modifier.size(16.dp)
                        )
                        Text(
                            text = "تلميح تكتيكي",
                            fontFamily = CairoFontFamily,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            color = if (!isGoldenHint) CasinoPrimary else CasinoOnSurfaceVariant
                        )
                    }
                }

                // Golden VIP Hint Tab
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(CircleShape)
                        .background(if (isGoldenHint) CasinoPrimaryContainer else Color.Transparent)
                        .clickable { viewModel.toggleHintMode(true) }
                        .padding(vertical = 8.dp)
                        .testTag("tab_golden_hint"),
                    contentAlignment = Alignment.Center
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Stars,
                            contentDescription = null,
                            tint = if (isGoldenHint) CasinoOnPrimaryContainer else CasinoPrimaryContainer,
                            modifier = Modifier.size(16.dp)
                        )
                        Text(
                            text = "تلميح ذهبي VIP",
                            fontFamily = CairoFontFamily,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            color = if (isGoldenHint) CasinoOnPrimaryContainer else CasinoPrimary
                        )
                        Box(
                            modifier = Modifier
                                .clip(CircleShape)
                                .background(if (isGoldenHint) CasinoOnPrimaryContainer else CasinoPrimary)
                                .padding(horizontal = 6.dp, vertical = 1.dp)
                        ) {
                            Text(
                                text = "نادر",
                                fontFamily = CairoFontFamily,
                                fontWeight = FontWeight.Bold,
                                fontSize = 9.sp,
                                color = if (isGoldenHint) CasinoPrimaryContainer else CasinoOnPrimary
                            )
                        }
                    }
                }
            }
        }

        // Luxury 3D Card Face
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp),
                contentAlignment = Alignment.Center
            ) {
                // Card stack shadow layers
                Box(
                    modifier = Modifier
                        .fillMaxWidth(0.9f)
                        .height(350.dp)
                        .rotate(4f)
                        .clip(RoundedCornerShape(20.dp))
                        .background(CasinoSurfaceContainerLow.copy(alpha = 0.6f))
                )

                // Main Parchment / Foil Card
                Card(
                    modifier = Modifier
                        .fillMaxWidth(0.95f)
                        .clip(RoundedCornerShape(20.dp))
                        .border(
                            width = 1.5.dp,
                            color = if (isGoldenHint) CasinoPrimaryContainer else CasinoOutlineVariant,
                            shape = RoundedCornerShape(20.dp)
                        ),
                    colors = CardDefaults.cardColors(
                        containerColor = if (isGoldenHint) Color(0xFF261A05) else Color(0xFF1E1710)
                    )
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(18.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        // Card Top Row Corner Symbols
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(
                                    text = "K",
                                    fontFamily = CairoFontFamily,
                                    fontWeight = FontWeight.ExtraBold,
                                    fontSize = 16.sp,
                                    color = CasinoPrimaryContainer
                                )
                                Icon(
                                    imageVector = Icons.Default.LocalFireDepartment,
                                    contentDescription = null,
                                    tint = CasinoPrimaryContainer,
                                    modifier = Modifier.size(14.dp)
                                )
                            }

                            Box(
                                modifier = Modifier
                                    .size(54.dp)
                                    .clip(CircleShape)
                                    .background(CasinoSurfaceContainerLowest),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = if (isGoldenHint) Icons.Default.WorkspacePremium else Icons.Default.TheaterComedy,
                                    contentDescription = null,
                                    tint = CasinoPrimaryContainer,
                                    modifier = Modifier.size(28.dp)
                                )
                            }

                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(
                                    text = "K",
                                    fontFamily = CairoFontFamily,
                                    fontWeight = FontWeight.ExtraBold,
                                    fontSize = 16.sp,
                                    color = CasinoPrimaryContainer
                                )
                                Icon(
                                    imageVector = Icons.Default.LocalFireDepartment,
                                    contentDescription = null,
                                    tint = CasinoPrimaryContainer,
                                    modifier = Modifier.size(14.dp)
                                )
                            }
                        }

                        // Title & Subtitle
                        Text(
                            text = if (isGoldenHint) "التلميح الذهبي الاستثنائي" else "تلميحك السري",
                            fontFamily = CairoFontFamily,
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 20.sp,
                            color = if (isGoldenHint) CasinoPrimaryFixed else CasinoPrimary
                        )

                        Text(
                            text = if (isGoldenHint) "الرقم الفعلي المؤكد بنسبة ١٠٠٪:" else "النطاق التقريبي للإجابة:",
                            fontFamily = TajawalFontFamily,
                            fontSize = 13.sp,
                            color = CasinoOnSurfaceVariant
                        )

                        // Highlight Range Box
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(CasinoSurfaceContainerLowest.copy(alpha = 0.9f))
                                .padding(vertical = 12.dp, horizontal = 8.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(
                                    text = if (isGoldenHint) question.goldenHintAnswer else question.standardHintRange,
                                    fontFamily = CairoFontFamily,
                                    fontWeight = FontWeight.ExtraBold,
                                    fontSize = if (isGoldenHint) 26.sp else 20.sp,
                                    color = CasinoPrimary,
                                    letterSpacing = 1.sp
                                )

                                Spacer(modifier = Modifier.height(4.dp))

                                Row(
                                    modifier = Modifier
                                        .clip(CircleShape)
                                        .background(CasinoSurfaceContainerHigh)
                                        .padding(horizontal = 8.dp, vertical = 2.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(6.dp)
                                            .clip(CircleShape)
                                            .background(if (isGoldenHint) CasinoPrimaryContainer else CasinoSecondary)
                                    )
                                    Text(
                                        text = if (isGoldenHint) "دقة مطلقة ١٠٠٪ - لا شكوك" else question.standardAccuracy,
                                        fontFamily = TajawalFontFamily,
                                        fontSize = 10.sp,
                                        color = if (isGoldenHint) CasinoPrimaryContainer else CasinoSecondary
                                    )
                                }
                            }
                        }

                        // Warning Note
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(10.dp))
                                .background(CasinoSurfaceContainerLow.copy(alpha = 0.8f))
                                .padding(10.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                imageVector = if (isGoldenHint) Icons.Default.Verified else Icons.Default.Warning,
                                contentDescription = null,
                                tint = if (isGoldenHint) CasinoSecondary else CasinoError,
                                modifier = Modifier.size(18.dp)
                            )
                            Text(
                                text = if (isGoldenHint)
                                    "مكافأة VIP حصرية: أنت اللاعب الوحيد في هذه الجولة الممنوح له التلميح الذهبي الحقيقي. راهن بحكمة دون فضح سرك!"
                                else
                                    question.advisoryNote,
                                fontFamily = TajawalFontFamily,
                                fontSize = 11.sp,
                                color = CasinoOnSurfaceVariant,
                                lineHeight = 16.sp
                            )
                        }

                        // Watermark Code
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "شفرة: #88X-BLUFF",
                                fontFamily = CairoFontFamily,
                                fontSize = 10.sp,
                                color = CasinoOnSurfaceVariant.copy(alpha = 0.6f)
                            )
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(2.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Lock,
                                    contentDescription = null,
                                    tint = CasinoOnSurfaceVariant.copy(alpha = 0.6f),
                                    modifier = Modifier.size(12.dp)
                                )
                                Text(
                                    text = "سري للغاية",
                                    fontFamily = TajawalFontFamily,
                                    fontSize = 10.sp,
                                    color = CasinoOnSurfaceVariant.copy(alpha = 0.6f)
                                )
                            }
                        }
                    }
                }
            }
        }

        // Tension Timer Ring
        item {
            CircularTimerRing(
                initialSeconds = 24,
                totalSeconds = 30,
                size = 54.dp,
                label = "ينتهي وقت قراءة التلميح قريباً"
            )
        }

        // CTA: Understood, Go to Guessing
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 80.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = onUnderstood,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(54.dp)
                        .shadow(12.dp, RoundedCornerShape(16.dp))
                        .testTag("understood_to_betting_button"),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = CasinoPrimaryContainer,
                        contentColor = CasinoOnPrimary
                    )
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.DoneAll,
                            contentDescription = null,
                            modifier = Modifier.size(20.dp)
                        )
                        Text(
                            text = "فهمت، إلى إدخال التخمين!",
                            fontFamily = CairoFontFamily,
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 16.sp
                        )
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "رصيدك: 12,450 🪙",
                        fontFamily = CairoFontFamily,
                        fontSize = 12.sp,
                        color = CasinoPrimary
                    )
                    Text(
                        text = "ترتيب الطاولة: #2",
                        fontFamily = CairoFontFamily,
                        fontSize = 12.sp,
                        color = CasinoSecondary
                    )
                }
            }
        }
    }
}

/* =======================================================================
   PHASE 3: NUMERIC GUESS INPUT SCREEN (Image 5 / 6)
   ======================================================================= */
@Composable
private fun GuessInputContent(
    viewModel: GameViewModel,
    roundIndex: Int,
    onSubmit: () -> Unit
) {
    val guessInput by viewModel.userGuessInput.collectAsState()
    val question = viewModel.currentQuestion

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        // Game State Pill & Context Badge
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    modifier = Modifier
                        .clip(CircleShape)
                        .background(CasinoSurfaceContainerHigh)
                        .padding(horizontal = 10.dp, vertical = 5.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(6.dp)
                            .clip(CircleShape)
                            .background(CasinoSecondary)
                    )
                    Text(
                        text = "الجولة ${roundIndex + 1} من 5",
                        fontFamily = CairoFontFamily,
                        fontSize = 12.sp,
                        color = CasinoOnSurfaceVariant
                    )
                }

                Row(
                    modifier = Modifier
                        .clip(CircleShape)
                        .background(CasinoSurfaceContainerHigh)
                        .padding(horizontal = 10.dp, vertical = 5.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.MonetizationOn,
                        contentDescription = null,
                        tint = CasinoPrimaryContainer,
                        modifier = Modifier.size(16.dp)
                    )
                    Text(
                        text = "رهانك: 450",
                        fontFamily = CairoFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        color = CasinoPrimary
                    )
                }
            }
        }

        // Clue Snapshot Mini Card
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp)),
                colors = CardDefaults.cardColors(containerColor = CasinoSurfaceContainerLow)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Visibility,
                                contentDescription = null,
                                tint = CasinoPrimary,
                                modifier = Modifier.size(14.dp)
                            )
                            Text(
                                text = "تلميحك السري المحفوظ:",
                                fontFamily = TajawalFontFamily,
                                fontSize = 11.sp,
                                color = CasinoOnSurfaceVariant
                            )
                        }

                        Text(
                            text = "نطاق تقريبي",
                            fontFamily = CairoFontFamily,
                            fontSize = 10.sp,
                            color = CasinoSecondary,
                            modifier = Modifier
                                .clip(CircleShape)
                                .background(CasinoSecondaryContainer.copy(alpha = 0.3f))
                                .padding(horizontal = 8.dp, vertical = 2.dp)
                        )
                    }

                    Text(
                        text = question.standardHintRange,
                        fontFamily = CairoFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp,
                        color = CasinoPrimary,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }

        // Input Display Section
        item {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Text(
                    text = "أدخل تخمينك النهائي:",
                    fontFamily = TajawalFontFamily,
                    fontSize = 13.sp,
                    color = CasinoOnSurfaceVariant
                )

                // Luxurious Display Box
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(64.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(CasinoSurfaceContainerLowest)
                        .border(1.dp, CasinoPrimaryContainer.copy(alpha = 0.4f), RoundedCornerShape(16.dp))
                        .padding(horizontal = 14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Icon(
                        imageVector = Icons.Default.Casino,
                        contentDescription = null,
                        tint = CasinoPrimaryContainer.copy(alpha = 0.7f),
                        modifier = Modifier.size(20.dp)
                    )

                    Text(
                        text = formatNumberWithCommas(guessInput),
                        fontFamily = CairoFontFamily,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 24.sp,
                        color = CasinoPrimary,
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .weight(1f)
                            .testTag("guess_display_text")
                    )

                    IconButton(
                        onClick = { viewModel.clearGuess() },
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(CasinoSurfaceContainerHigh)
                            .testTag("clear_guess_btn")
                    ) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "مسح",
                            tint = CasinoError,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }
        }

        // Custom High-Roller Numeric Keypad (3 columns)
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Row 1: 1, 2, 3
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    KeypadButton(key = "1", onClick = { viewModel.updateGuessInput("1") }, modifier = Modifier.weight(1f))
                    KeypadButton(key = "2", onClick = { viewModel.updateGuessInput("2") }, modifier = Modifier.weight(1f))
                    KeypadButton(key = "3", onClick = { viewModel.updateGuessInput("3") }, modifier = Modifier.weight(1f))
                }

                // Row 2: 4, 5, 6
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    KeypadButton(key = "4", onClick = { viewModel.updateGuessInput("4") }, modifier = Modifier.weight(1f))
                    KeypadButton(key = "5", onClick = { viewModel.updateGuessInput("5") }, modifier = Modifier.weight(1f))
                    KeypadButton(key = "6", onClick = { viewModel.updateGuessInput("6") }, modifier = Modifier.weight(1f))
                }

                // Row 3: 7, 8, 9
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    KeypadButton(key = "7", onClick = { viewModel.updateGuessInput("7") }, modifier = Modifier.weight(1f))
                    KeypadButton(key = "8", onClick = { viewModel.updateGuessInput("8") }, modifier = Modifier.weight(1f))
                    KeypadButton(key = "9", onClick = { viewModel.updateGuessInput("9") }, modifier = Modifier.weight(1f))
                }

                // Row 4: 000, 0, Backspace
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    KeypadButton(
                        key = "000",
                        onClick = { viewModel.updateGuessInput("000") },
                        modifier = Modifier.weight(1f),
                        isGold = true
                    )
                    KeypadButton(key = "0", onClick = { viewModel.updateGuessInput("0") }, modifier = Modifier.weight(1f))
                    KeypadIconButton(
                        icon = Icons.Default.Backspace,
                        onClick = { viewModel.backspaceGuess() },
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }

        // Circular Tension Countdown Timer
        item {
            CircularTimerRing(
                initialSeconds = 16,
                totalSeconds = 30,
                size = 54.dp,
                label = "ثانية متبقية"
            )
        }

        // Primary Hero Submission CTA Button
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 80.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = onSubmit,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp)
                        .shadow(16.dp, RoundedCornerShape(16.dp))
                        .testTag("submit_guess_button"),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = CasinoPrimaryContainer,
                        contentColor = CasinoOnPrimary
                    )
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            modifier = Modifier.size(22.dp)
                        )
                        Text(
                            text = "تثبيت التخمين",
                            fontFamily = CairoFontFamily,
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 18.sp
                        )
                    }
                }

                Text(
                    text = "كلما اقترب تخمينك من الرقم الحقيقي، زادت أرباحك في الجولة!",
                    fontFamily = TajawalFontFamily,
                    fontSize = 11.sp,
                    color = CasinoOnSurfaceVariant,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
    }
}

/* =======================================================================
   PHASE 4: FINAL BETTING ARENA (Image 7 / 8)
   ======================================================================= */
@Composable
private fun FinalBettingContent(
    viewModel: GameViewModel,
    roundIndex: Int,
    pot: Long,
    userChips: Long
) {
    val guessInput by viewModel.userGuessInput.collectAsState()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        // Banner with Tension & Status
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Row(
                    modifier = Modifier
                        .clip(CircleShape)
                        .background(CasinoSurfaceContainerHigh)
                        .padding(horizontal = 14.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.LocalFireDepartment,
                        contentDescription = null,
                        tint = CasinoPrimary,
                        modifier = Modifier.size(16.dp)
                    )
                    Text(
                        text = "المراهنة النهائية",
                        fontFamily = CairoFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = CasinoPrimary
                    )
                    Icon(
                        imageVector = Icons.Default.LocalFireDepartment,
                        contentDescription = null,
                        tint = CasinoPrimary,
                        modifier = Modifier.size(16.dp)
                    )
                }

                Text(
                    text = "راهن بناءً على ثقتك في تخمينك أو بلف للفوز بالوعاء",
                    fontFamily = TajawalFontFamily,
                    fontSize = 12.sp,
                    color = CasinoOnSurfaceVariant
                )
            }
        }

        // Round Progression & Timer Bar
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(CasinoSurfaceContainerLow)
                    .padding(horizontal = 14.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Box(modifier = Modifier.size(6.dp).clip(CircleShape).background(CasinoSecondary))
                    Text(
                        text = "الجولة ${roundIndex + 1} من 5",
                        fontFamily = CairoFontFamily,
                        fontSize = 12.sp,
                        color = CasinoOnSurface
                    )
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.HourglassTop,
                        contentDescription = null,
                        tint = CasinoPrimary,
                        modifier = Modifier.size(14.dp)
                    )
                    Text(
                        text = "12 ثانية",
                        fontFamily = CairoFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                        color = CasinoPrimary
                    )
                }

                Text(
                    text = "الحد الأدنى: 200",
                    fontFamily = TajawalFontFamily,
                    fontSize = 11.sp,
                    color = CasinoOnSurfaceVariant
                )
            }
        }

        // Tactical Poker Felt Arena (Oval table)
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(310.dp)
                    .clip(RoundedCornerShape(44.dp))
                    .background(
                        Brush.verticalGradient(
                            listOf(
                                Color(0xFF251F15),
                                Color(0xFF1A1715),
                                Color(0xFF121114)
                            )
                        )
                    )
                    .border(2.dp, CasinoPrimaryContainer.copy(alpha = 0.35f), RoundedCornerShape(44.dp))
                    .padding(8.dp)
            ) {
                // Top Row: Maya (Left, Raised 1200) & Karim (Right, Confirmed 800)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 14.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top
                ) {
                    TableAvatarPill(
                        name = "Maya",
                        avatarUrl = viewModel.avatarMaya,
                        bet = 1200,
                        status = "رفعت",
                        statusColor = CasinoPrimaryContainer
                    )

                    TableAvatarPill(
                        name = "Karim",
                        avatarUrl = viewModel.avatarKarim,
                        bet = 800,
                        status = "تأكيد",
                        statusColor = CasinoSecondary
                    )
                }

                // Center Pot Display
                Box(
                    modifier = Modifier
                        .align(Alignment.Center)
                        .clip(RoundedCornerShape(20.dp))
                        .background(CasinoSurfaceContainerLowest.copy(alpha = 0.95f))
                        .border(1.dp, CasinoPrimaryContainer.copy(alpha = 0.4f), RoundedCornerShape(20.dp))
                        .padding(horizontal = 20.dp, vertical = 10.dp)
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.MonetizationOn,
                                contentDescription = null,
                                tint = CasinoPrimaryContainer,
                                modifier = Modifier.size(16.dp)
                            )
                            Text(
                                text = "إجمالي الوعاء • POT",
                                fontFamily = CairoFontFamily,
                                fontSize = 10.sp,
                                color = CasinoOnSurfaceVariant
                            )
                        }

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text(
                                text = "4,800",
                                fontFamily = CairoFontFamily,
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 28.sp,
                                color = CasinoPrimary
                            )
                            Text(
                                text = "فيشة",
                                fontFamily = CairoFontFamily,
                                fontSize = 12.sp,
                                color = CasinoPrimaryFixed
                            )
                        }

                        Text(
                            text = "+600 في هذه الجولة",
                            fontFamily = TajawalFontFamily,
                            fontSize = 10.sp,
                            color = CasinoSecondary
                        )
                    }
                }

                // Middle Row: Nour (Left, Called 450) & Omar (Right, Thinking 1000)
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.Center)
                        .padding(horizontal = 8.dp)
                ) {
                    Box(modifier = Modifier.align(Alignment.CenterStart)) {
                        TableAvatarPill(
                            name = "Nour",
                            avatarUrl = viewModel.avatarNour,
                            bet = 450,
                            status = "مساواة",
                            statusColor = CasinoSecondary
                        )
                    }

                    Box(modifier = Modifier.align(Alignment.CenterEnd)) {
                        TableAvatarPill(
                            name = "Omar",
                            avatarUrl = viewModel.avatarOmar,
                            bet = 1000,
                            status = "يفكر",
                            statusColor = CasinoOnSurfaceVariant
                        )
                    }
                }

                // Bottom Center: User Hero
                Column(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 6.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(contentAlignment = Alignment.BottomCenter) {
                        Box(
                            modifier = Modifier
                                .size(60.dp)
                                .clip(CircleShape)
                                .border(2.dp, CasinoPrimaryContainer, CircleShape)
                        ) {
                            AsyncImage(
                                model = viewModel.avatarUser,
                                contentDescription = "أنت",
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop
                            )
                        }

                        Box(
                            modifier = Modifier
                                .clip(CircleShape)
                                .background(CasinoPrimaryContainer)
                                .padding(horizontal = 8.dp, vertical = 1.dp)
                        ) {
                            Text(
                                text = "دورك الآن",
                                fontFamily = CairoFontFamily,
                                fontWeight = FontWeight.Bold,
                                fontSize = 9.sp,
                                color = CasinoOnPrimary
                            )
                        }
                    }

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Text(
                            text = "أنت ⭐",
                            fontFamily = CairoFontFamily,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = CasinoPrimary
                        )
                        Row(
                            modifier = Modifier
                                .clip(CircleShape)
                                .background(CasinoSurfaceContainerLowest)
                                .padding(horizontal = 8.dp, vertical = 2.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Toll,
                                contentDescription = null,
                                tint = CasinoPrimaryContainer,
                                modifier = Modifier.size(12.dp)
                            )
                            Text(
                                text = "$userChips رصيدك",
                                fontFamily = CairoFontFamily,
                                fontSize = 11.sp,
                                color = CasinoPrimary
                            )
                        }
                    }
                }
            }
        }

        // Secret Registered Guess Peek Strip
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp)),
                colors = CardDefaults.cardColors(containerColor = CasinoSurfaceContainerHigh.copy(alpha = 0.9f))
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(CasinoSurfaceContainerHighest),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Visibility,
                                contentDescription = null,
                                tint = CasinoPrimary,
                                modifier = Modifier.size(20.dp)
                            )
                        }

                        Column {
                            Text(
                                text = "تخمينك السري المسجل",
                                fontFamily = TajawalFontFamily,
                                fontSize = 11.sp,
                                color = CasinoOnSurfaceVariant
                            )
                            Text(
                                text = "${formatNumberWithCommas(guessInput)} نسمة",
                                fontFamily = CairoFontFamily,
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp,
                                color = CasinoOnSurface
                            )
                        }
                    }

                    Column(horizontalAlignment = Alignment.End) {
                        Text(
                            text = "دقيق بنسبة 92%",
                            fontFamily = CairoFontFamily,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            color = CasinoSecondary
                        )
                        Text(
                            text = "أقرب من المنافسين",
                            fontFamily = TajawalFontFamily,
                            fontSize = 10.sp,
                            color = CasinoOnSurfaceVariant
                        )
                    }
                }
            }
        }

        // Tactical 4 Betting Buttons
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // 1. Fold
                ActionBetButton(
                    title = "انسحاب",
                    subtitle = "خسارة 50",
                    icon = Icons.Default.Close,
                    containerColor = CasinoErrorContainer,
                    contentColor = CasinoOnError,
                    modifier = Modifier.weight(1f),
                    testTag = "btn_final_fold",
                    onClick = { viewModel.playerAction("fold", 50) }
                )

                // 2. Call 200
                ActionBetButton(
                    title = "مساواة",
                    subtitle = "200 🪙",
                    icon = Icons.Default.DoneAll,
                    containerColor = CasinoBlueCall,
                    contentColor = Color.White,
                    modifier = Modifier.weight(1f),
                    testTag = "btn_final_call",
                    onClick = { viewModel.playerAction("call", 200) }
                )

                // 3. Raise 400
                ActionBetButton(
                    title = "زيادة",
                    subtitle = "400 🪙",
                    icon = Icons.Default.ArrowUpward,
                    containerColor = CasinoSecondaryContainer,
                    contentColor = CasinoOnSecondary,
                    modifier = Modifier.weight(1f),
                    testTag = "btn_final_raise",
                    onClick = { viewModel.playerAction("raise", 400) }
                )

                // 4. All-In 450
                ActionBetButton(
                    title = "الكل",
                    subtitle = "450 🪙",
                    icon = Icons.Default.Stars,
                    containerColor = CasinoPrimaryContainer,
                    contentColor = CasinoOnPrimary,
                    modifier = Modifier.weight(1f),
                    testTag = "btn_final_allin",
                    onClick = { viewModel.playerAction("allin", 450) }
                )
            }
        }

        // Quick Emoji Reaction Bar
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(CasinoSurfaceContainerLow)
                    .padding(horizontal = 14.dp, vertical = 6.dp)
                    .padding(bottom = 80.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "💬 إرسال تعليق أو إيموجي",
                    fontFamily = TajawalFontFamily,
                    fontSize = 12.sp,
                    color = CasinoOnSurfaceVariant
                )

                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    listOf("🔥", "👀", "🤫", "🤑").forEach { emoji ->
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape)
                                .background(CasinoSurfaceContainer)
                                .clickable { viewModel.showToast("أرسلت $emoji إلى الطاولة!") },
                            contentAlignment = Alignment.Center
                        ) {
                            Text(text = emoji, fontSize = 14.sp)
                        }
                    }
                }
            }
        }
    }
}

/* =======================================================================
   PHASE 5: REVEAL & BLUFF BUSTED (Image 9 / 10)
   ======================================================================= */
@Composable
private fun RoundRevealContent(
    viewModel: GameViewModel,
    roundIndex: Int,
    pot: Long,
    onNextRound: () -> Unit
) {
    val question = viewModel.currentQuestion
    var showCluesDrawer by remember { mutableStateOf(false) }

    Box(modifier = Modifier.fillMaxSize()) {
        // Confetti Fireworks Overlay
        ConfettiEffect()

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // Golden Crown Badge & Real Answer Parchment
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp)
                        .clip(RoundedCornerShape(20.dp))
                        .border(1.dp, CasinoPrimaryContainer.copy(alpha = 0.5f), RoundedCornerShape(20.dp)),
                    colors = CardDefaults.cardColors(containerColor = CasinoSurfaceContainerHigh)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // Golden Crown Pin
                        Box(
                            modifier = Modifier
                                .size(46.dp)
                                .clip(CircleShape)
                                .background(
                                    Brush.verticalGradient(
                                        listOf(CasinoGoldShimmer, CasinoPrimaryContainer)
                                    )
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.MilitaryTech,
                                contentDescription = null,
                                tint = CasinoOnPrimary,
                                modifier = Modifier.size(26.dp)
                            )
                        }

                        // Banner ribbon
                        Row(
                            modifier = Modifier
                                .clip(CircleShape)
                                .background(CasinoSurfaceContainerHighest)
                                .padding(horizontal = 14.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Verified,
                                contentDescription = null,
                                tint = CasinoPrimary,
                                modifier = Modifier.size(14.dp)
                            )
                            Text(
                                text = "الإجابة الصحيحة كانت",
                                fontFamily = CairoFontFamily,
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp,
                                color = CasinoOnSurfaceVariant
                            )
                        }

                        // Massive Golden Numerical Readout
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(CasinoSurfaceContainerLowest)
                                .padding(vertical = 10.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = String.format("%,d", question.realAnswer),
                                fontFamily = CairoFontFamily,
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 28.sp,
                                color = CasinoGoldShimmer,
                                letterSpacing = 1.sp
                            )
                        }

                        Text(
                            text = "سؤال الجولة: ${question.questionText}",
                            fontFamily = TajawalFontFamily,
                            fontSize = 12.sp,
                            color = CasinoOnSurfaceVariant,
                            textAlign = TextAlign.Center
                        )

                        // Pot Won Badge
                        Row(
                            modifier = Modifier
                                .clip(CircleShape)
                                .background(CasinoPrimary.copy(alpha = 0.15f))
                                .padding(horizontal = 12.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.MonetizationOn,
                                contentDescription = null,
                                tint = CasinoPrimaryContainer,
                                modifier = Modifier.size(16.dp)
                            )
                            Text(
                                text = "وعاء الجولة: 4,800 فيشة",
                                fontFamily = CairoFontFamily,
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp,
                                color = CasinoPrimary
                            )
                        }
                    }
                }
            }

            // Leaderboard & Guess Comparison Header
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "كشف التخمينات والبلوف",
                        fontFamily = CairoFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = CasinoOnSurface
                    )
                    Text(
                        text = "5 لاعبين",
                        fontFamily = TajawalFontFamily,
                        fontSize = 11.sp,
                        color = CasinoOnSurfaceVariant,
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(CasinoSurfaceContainerHigh)
                            .padding(horizontal = 8.dp, vertical = 2.dp)
                    )
                }
            }

            // Table of Player Results (Ranks 1 to 5)
            item {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    // Rank 1: Maya (Winner)
                    RevealPlayerRow(
                        rank = 1,
                        name = "Maya",
                        avatarUrl = viewModel.avatarMaya,
                        subText = "الفائزة بالرهان",
                        guessText = "38,100,000",
                        guessSub = "الأقرب تماماً",
                        deltaText = "+94,762",
                        deltaSub = "فارق طفيف",
                        isWinner = true
                    )

                    // Rank 2: You
                    RevealPlayerRow(
                        rank = 2,
                        name = "أنت",
                        avatarUrl = viewModel.avatarUser,
                        subText = "المركز الثاني",
                        guessText = "35,000,000",
                        guessSub = "أقل من الواقع",
                        deltaText = "-3,005,238",
                        deltaSub = "فارق 3M",
                        isUser = true
                    )

                    // Rank 3: Karim
                    RevealPlayerRow(
                        rank = 3,
                        name = "Karim",
                        avatarUrl = viewModel.avatarKarim,
                        subText = "مراهن حذر",
                        guessText = "42,000,000",
                        guessSub = "أعلى",
                        deltaText = "+3,994,762",
                        deltaSub = "فارق 3.9M"
                    )

                    // Rank 4: Ahmed
                    RevealPlayerRow(
                        rank = 4,
                        name = "Ahmed",
                        avatarUrl = viewModel.avatarAhmed,
                        subText = "انسحب مبكراً",
                        guessText = "29,000,000",
                        guessSub = "تخمين بعيد",
                        deltaText = "-9,005,238",
                        deltaSub = "فارق 9M"
                    )

                    // Rank 5: Omar (Bluff Exposed!)
                    RevealPlayerRow(
                        rank = 5,
                        name = "Omar",
                        avatarUrl = viewModel.avatarOmar,
                        subText = "تم كشف بلوفه! 🎭",
                        guessText = "50,000,000",
                        guessSub = "مبالغة كاذبة",
                        deltaText = "+11,994,762",
                        deltaSub = "أبعد تخمين",
                        isBluffExposed = true
                    )
                }
            }

            // Clues Breakdown Accordion
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp)),
                    colors = CardDefaults.cardColors(containerColor = CasinoSurfaceContainerLow)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { showCluesDrawer = !showCluesDrawer },
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Style,
                                    contentDescription = null,
                                    tint = CasinoPrimary,
                                    modifier = Modifier.size(18.dp)
                                )
                                Text(
                                    text = "التلميحات والبطاقات السرية",
                                    fontFamily = CairoFontFamily,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp,
                                    color = CasinoOnSurface
                                )
                            }
                            Icon(
                                imageVector = if (showCluesDrawer) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                                contentDescription = null,
                                tint = CasinoOnSurfaceVariant,
                                modifier = Modifier.size(20.dp)
                            )
                        }

                        AnimatedVisibility(visible = showCluesDrawer) {
                            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(CasinoSurfaceContainer)
                                        .padding(10.dp),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Verified,
                                        contentDescription = null,
                                        tint = CasinoSecondary,
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Column {
                                        Text(
                                            text = "التلميح الحقيقي المتاح:",
                                            fontFamily = CairoFontFamily,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 11.sp,
                                            color = CasinoSecondary
                                        )
                                        Text(
                                            text = "«نطاق التقدير يتراوح تقريباً بين 30,000,000 و 40,000,000 نسمة»",
                                            fontFamily = TajawalFontFamily,
                                            fontSize = 11.sp,
                                            color = CasinoOnSurfaceVariant
                                        )
                                    }
                                }

                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(CasinoSurfaceContainer)
                                        .padding(10.dp),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Warning,
                                        contentDescription = null,
                                        tint = CasinoError,
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Column {
                                        Text(
                                            text = "البلوف المضلل (Omar):",
                                            fontFamily = CairoFontFamily,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 11.sp,
                                            color = CasinoError
                                        )
                                        Text(
                                            text = "حاول عمر إيهام الجميع بأن كندا تجاوزت حاجز الـ 50 مليوناً لدفع باقي الخصوم للانسحاب!",
                                            fontFamily = TajawalFontFamily,
                                            fontSize = 11.sp,
                                            color = CasinoOnSurfaceVariant
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Action Buttons
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 80.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Next Round Button
                    Button(
                        onClick = onNextRound,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(54.dp)
                            .shadow(16.dp, RoundedCornerShape(16.dp))
                            .testTag("next_round_btn"),
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = CasinoPrimaryContainer,
                            contentColor = CasinoOnPrimary
                        )
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.SkipPrevious,
                                contentDescription = null,
                                modifier = Modifier.size(20.dp)
                            )
                            Text(
                                text = if (roundIndex >= 4) "عرض الترتيب النهائي للمباراة 🏆" else "الجولة التالية (${roundIndex + 2} من 5)",
                                fontFamily = CairoFontFamily,
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 16.sp
                            )
                        }
                    }

                    // Secondary button
                    Button(
                        onClick = { showCluesDrawer = !showCluesDrawer },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = CasinoSurfaceContainerHigh,
                            contentColor = CasinoOnSurface
                        )
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Visibility,
                                contentDescription = null,
                                tint = CasinoPrimary,
                                modifier = Modifier.size(16.dp)
                            )
                            Text(
                                text = "عرض التلميحات المضللة والصحيحة",
                                fontFamily = CairoFontFamily,
                                fontSize = 13.sp
                            )
                        }
                    }
                }
            }
        }
    }
}

/* =======================================================================
   REUSABLE UI PIECES
   ======================================================================= */
@Composable
private fun TableAvatarPill(
    name: String,
    avatarUrl: String,
    bet: Long,
    status: String,
    statusColor: Color
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        Box(contentAlignment = Alignment.BottomCenter) {
            Box(
                modifier = Modifier
                    .size(46.dp)
                    .clip(CircleShape)
                    .border(1.dp, CasinoSurfaceContainerHighest, CircleShape)
            ) {
                AsyncImage(
                    model = avatarUrl,
                    contentDescription = name,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )
            }

            Box(
                modifier = Modifier
                    .clip(CircleShape)
                    .background(statusColor)
                    .padding(horizontal = 5.dp, vertical = 1.dp)
            ) {
                Text(
                    text = status,
                    fontFamily = CairoFontFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 8.sp,
                    color = Color.Black
                )
            }
        }

        Text(
            text = name,
            fontFamily = CairoFontFamily,
            fontWeight = FontWeight.Bold,
            fontSize = 11.sp,
            color = CasinoOnSurface
        )

        Row(
            modifier = Modifier
                .clip(CircleShape)
                .background(CasinoSurfaceContainerLowest)
                .padding(horizontal = 6.dp, vertical = 2.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            Icon(
                imageVector = Icons.Default.MonetizationOn,
                contentDescription = null,
                tint = CasinoPrimaryContainer,
                modifier = Modifier.size(10.dp)
            )
            Text(
                text = "$bet",
                fontFamily = CairoFontFamily,
                fontWeight = FontWeight.Bold,
                fontSize = 10.sp,
                color = CasinoPrimary
            )
        }
    }
}

@Composable
private fun ActionBetButton(
    title: String,
    subtitle: String?,
    icon: androidx.compose.ui.graphics.vector.ImageVector?,
    containerColor: Color,
    contentColor: Color,
    modifier: Modifier = Modifier,
    testTag: String,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier
            .height(60.dp)
            .clip(RoundedCornerShape(16.dp))
            .clickable { onClick() }
            .testTag(testTag),
        colors = CardDefaults.cardColors(containerColor = containerColor)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(vertical = 4.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            if (icon != null) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = contentColor,
                    modifier = Modifier.size(18.dp)
                )
            }
            Text(
                text = title,
                fontFamily = CairoFontFamily,
                fontWeight = FontWeight.ExtraBold,
                fontSize = 13.sp,
                color = contentColor
            )
            if (subtitle != null) {
                Text(
                    text = subtitle,
                    fontFamily = CairoFontFamily,
                    fontSize = 10.sp,
                    color = contentColor.copy(alpha = 0.9f)
                )
            }
        }
    }
}

@Composable
private fun KeypadButton(
    key: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    isGold: Boolean = false
) {
    Card(
        modifier = modifier
            .height(54.dp)
            .clip(RoundedCornerShape(14.dp))
            .clickable { onClick() }
            .testTag("keypad_$key"),
        colors = CardDefaults.cardColors(
            containerColor = if (isGold) CasinoSurfaceContainerLow else CasinoSurfaceContainer
        )
    ) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = key,
                fontFamily = CairoFontFamily,
                fontWeight = FontWeight.ExtraBold,
                fontSize = if (key.length > 2) 16.sp else 20.sp,
                color = if (isGold) CasinoPrimaryFixed else CasinoOnSurface
            )
        }
    }
}

@Composable
private fun KeypadIconButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .height(54.dp)
            .clip(RoundedCornerShape(14.dp))
            .clickable { onClick() }
            .testTag("keypad_backspace"),
        colors = CardDefaults.cardColors(containerColor = CasinoSurfaceContainerLow)
    ) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = "حذف",
                tint = CasinoOnSurface,
                modifier = Modifier.size(22.dp)
            )
        }
    }
}

@Composable
private fun RevealPlayerRow(
    rank: Int,
    name: String,
    avatarUrl: String,
    subText: String,
    guessText: String,
    guessSub: String,
    deltaText: String,
    deltaSub: String,
    isWinner: Boolean = false,
    isUser: Boolean = false,
    isBluffExposed: Boolean = false
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp)),
        colors = CardDefaults.cardColors(
            containerColor = when {
                isWinner -> CasinoPrimaryContainer.copy(alpha = 0.2f)
                isBluffExposed -> CasinoErrorContainer.copy(alpha = 0.25f)
                isUser -> CasinoSurfaceContainerHigh
                else -> CasinoSurfaceContainerLow
            }
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            // Rank badge
            Box(
                modifier = Modifier
                    .size(26.dp)
                    .clip(CircleShape)
                    .background(
                        when {
                            isWinner -> CasinoPrimaryContainer
                            isBluffExposed -> CasinoError
                            else -> CasinoSurfaceContainerHighest
                        }
                    ),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "$rank",
                    fontFamily = CairoFontFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                    color = if (isWinner || isBluffExposed) Color.Black else CasinoOnSurface
                )
            }

            // Avatar & Name
            Row(
                modifier = Modifier.width(130.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                ) {
                    AsyncImage(
                        model = avatarUrl,
                        contentDescription = name,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                }

                Column {
                    Text(
                        text = name,
                        fontFamily = CairoFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                        color = if (isWinner) CasinoPrimary else CasinoOnSurface
                    )
                    Text(
                        text = subText,
                        fontFamily = TajawalFontFamily,
                        fontSize = 10.sp,
                        color = if (isWinner) CasinoSecondary else if (isBluffExposed) CasinoError else CasinoOnSurfaceVariant
                    )
                }
            }

            // Guess
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = guessText,
                    fontFamily = CairoFontFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp,
                    color = if (isBluffExposed) CasinoError else CasinoOnSurface,
                    textDecoration = if (isBluffExposed) TextDecoration.LineThrough else TextDecoration.None
                )
                Text(
                    text = guessSub,
                    fontFamily = TajawalFontFamily,
                    fontSize = 10.sp,
                    color = CasinoOnSurfaceVariant
                )
            }

            // Delta
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = deltaText,
                    fontFamily = CairoFontFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                    color = if (isWinner) CasinoSecondary else if (isBluffExposed) CasinoError else CasinoOnSurfaceVariant
                )
                Text(
                    text = deltaSub,
                    fontFamily = TajawalFontFamily,
                    fontSize = 10.sp,
                    color = CasinoOnSurfaceVariant
                )
            }
        }
    }
}

private fun formatNumberWithCommas(raw: String): String {
    if (raw.isBlank() || raw == "0") return "0"
    return try {
        raw.toLong().let { String.format("%,d", it) }
    } catch (e: Exception) {
        raw
    }
}
