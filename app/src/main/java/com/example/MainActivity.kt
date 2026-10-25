package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.Icon
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.GameViewModel
import com.example.data.model.GamePhase
import com.example.data.model.NavigationTab
import com.example.ui.components.CasinoBottomNav
import com.example.ui.components.TopCasinoHeader
import com.example.ui.screens.HomeScreen
import com.example.ui.screens.LeaderboardScreen
import com.example.ui.screens.LiveGameTableScreen
import com.example.ui.screens.LobbyScreen
import com.example.ui.screens.ProfileScreen
import com.example.ui.theme.CairoFontFamily
import com.example.ui.theme.CasinoPrimary
import com.example.ui.theme.CasinoPrimaryContainer
import com.example.ui.theme.CasinoSurface
import com.example.ui.theme.CasinoSurfaceContainerHighest
import com.example.ui.theme.MyApplicationTheme
import kotlinx.coroutines.delay

class MainActivity : ComponentActivity() {

    private val viewModel: GameViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            MyApplicationTheme {
                // Arabic RTL First Layout
                CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
                    CasinoAppRoot(viewModel = viewModel)
                }
            }
        }
    }
}

@Composable
fun CasinoAppRoot(viewModel: GameViewModel) {
    val currentTab by viewModel.currentTab.collectAsState()
    val toastMessage by viewModel.toastMessage.collectAsState()
    val userProfile by viewModel.userProfile.collectAsState()
    var isPlayingLiveTable by remember { mutableStateOf(false) }

    // Toast auto-dismiss
    LaunchedEffect(toastMessage) {
        if (toastMessage != null) {
            delay(2400)
            viewModel.clearToast()
        }
    }

    // Back handling
    BackHandler(enabled = isPlayingLiveTable || currentTab != NavigationTab.HOME) {
        if (isPlayingLiveTable) {
            isPlayingLiveTable = false
            viewModel.setTab(NavigationTab.LOBBY)
        } else if (currentTab != NavigationTab.HOME) {
            viewModel.setTab(NavigationTab.HOME)
        }
    }

    Scaffold(
        modifier = Modifier
            .fillMaxSize()
            .background(CasinoSurface)
            .statusBarsPadding()
            .navigationBarsPadding(),
        topBar = {
            if (!isPlayingLiveTable && currentTab != NavigationTab.LEADERBOARD && currentTab != NavigationTab.PROFILE) {
                TopCasinoHeader(
                    chips = userProfile.chips,
                    levelText = "المستوى ${userProfile.level}",
                    userTitle = "العراب",
                    showBack = false,
                    onProfileClick = { viewModel.setTab(NavigationTab.PROFILE) },
                    onNotificationsClick = { viewModel.showToast("لا توجد إشعارات جديدة حالياً") },
                    onStoreClick = { viewModel.showToast("المتجر الذهبي مفتوح للعروض الملكية!") }
                )
            }
        },
        bottomBar = {
            if (!isPlayingLiveTable) {
                CasinoBottomNav(
                    currentTab = currentTab,
                    onTabSelected = { tab ->
                        viewModel.setTab(tab)
                    }
                )
            }
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            if (isPlayingLiveTable) {
                LiveGameTableScreen(
                    viewModel = viewModel,
                    onBack = {
                        isPlayingLiveTable = false
                        viewModel.setTab(NavigationTab.LOBBY)
                    }
                )
            } else {
                when (currentTab) {
                    NavigationTab.HOME -> {
                        HomeScreen(
                            viewModel = viewModel,
                            onStartGame = {
                                isPlayingLiveTable = true
                                viewModel.setPhase(GamePhase.QUESTION_BETTING)
                            }
                        )
                    }
                    NavigationTab.LOBBY -> {
                        LobbyScreen(
                            viewModel = viewModel,
                            onStartMatch = {
                                isPlayingLiveTable = true
                            }
                        )
                    }
                    NavigationTab.LEADERBOARD -> {
                        LeaderboardScreen(
                            viewModel = viewModel,
                            onPlayAgain = {
                                viewModel.restartMatch()
                                isPlayingLiveTable = true
                            },
                            onHome = {
                                viewModel.setTab(NavigationTab.HOME)
                            }
                        )
                    }
                    NavigationTab.PROFILE -> {
                        ProfileScreen(
                            viewModel = viewModel,
                            onBack = {
                                viewModel.setTab(NavigationTab.HOME)
                            }
                        )
                    }
                }
            }

            // Interactive Toast Overlay
            AnimatedVisibility(
                visible = toastMessage != null,
                enter = fadeIn() + slideInVertically(animationSpec = tween(250), initialOffsetY = { it / 2 }),
                exit = fadeOut() + slideOutVertically(animationSpec = tween(250), targetOffsetY = { it / 2 }),
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = if (isPlayingLiveTable) 90.dp else 24.dp)
            ) {
                toastMessage?.let { msg ->
                    Row(
                        modifier = Modifier
                            .shadow(16.dp, RoundedCornerShape(24.dp))
                            .clip(RoundedCornerShape(24.dp))
                            .background(CasinoSurfaceContainerHighest.copy(alpha = 0.95f))
                            .border(1.dp, CasinoPrimaryContainer.copy(alpha = 0.5f), RoundedCornerShape(24.dp))
                            .padding(horizontal = 20.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = CasinoPrimaryContainer,
                            modifier = Modifier.size(18.dp)
                        )
                        Text(
                            text = msg,
                            fontFamily = CairoFontFamily,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = CasinoPrimary
                        )
                    }
                }
            }
        }
    }
}
