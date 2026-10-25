package com.example.ui.screens

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
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.MilitaryTech
import androidx.compose.material.icons.filled.MonetizationOn
import androidx.compose.material.icons.filled.PsychologyAlt
import androidx.compose.material.icons.filled.Replay
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Toll
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.data.GameViewModel
import com.example.data.model.NavigationTab
import com.example.ui.theme.CairoFontFamily
import com.example.ui.theme.CasinoGoldShimmer
import com.example.ui.theme.CasinoInverseOnSurface
import com.example.ui.theme.CasinoInverseSurface
import com.example.ui.theme.CasinoOnPrimary
import com.example.ui.theme.CasinoOnPrimaryContainer
import com.example.ui.theme.CasinoOnSurface
import com.example.ui.theme.CasinoOnSurfaceVariant
import com.example.ui.theme.CasinoOnTertiaryContainer
import com.example.ui.theme.CasinoPrimary
import com.example.ui.theme.CasinoPrimaryContainer
import com.example.ui.theme.CasinoPrimaryFixed
import com.example.ui.theme.CasinoPrimaryFixedDim
import com.example.ui.theme.CasinoSecondary
import com.example.ui.theme.CasinoSurface
import com.example.ui.theme.CasinoSurfaceContainer
import com.example.ui.theme.CasinoSurfaceContainerHigh
import com.example.ui.theme.CasinoSurfaceContainerHighest
import com.example.ui.theme.CasinoSurfaceContainerLow
import com.example.ui.theme.CasinoSurfaceContainerLowest
import com.example.ui.theme.CasinoTertiary
import com.example.ui.theme.TajawalFontFamily

@Composable
fun LeaderboardScreen(
    viewModel: GameViewModel,
    onPlayAgain: () -> Unit,
    onHome: () -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(CasinoSurface)
            .padding(horizontal = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Spacer(modifier = Modifier.height(4.dp))

            // Screen Top Header Bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(
                    onClick = onHome,
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(CasinoSurfaceContainerHigh)
                        .testTag("leaderboard_back_btn")
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                        contentDescription = "رجوع",
                        tint = CasinoOnSurface,
                        modifier = Modifier.size(20.dp)
                    )
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = "ترتيب المباراة",
                        fontFamily = CairoFontFamily,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 18.sp,
                        color = CasinoPrimary
                    )
                    Text(text = "🏆", fontSize = 20.sp)
                }

                IconButton(
                    onClick = { viewModel.showToast("تم نسخ رابط نتائج المباراة للمشاركة!") },
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(CasinoSurfaceContainerLow)
                ) {
                    Icon(
                        imageVector = Icons.Default.Share,
                        contentDescription = "مشاركة",
                        tint = CasinoOnSurfaceVariant,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }

        // Hero Podium Banner
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(20.dp))
                    .border(1.dp, CasinoPrimaryContainer.copy(alpha = 0.3f), RoundedCornerShape(20.dp)),
                colors = CardDefaults.cardColors(
                    containerColor = CasinoSurfaceContainerLow
                )
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // Completed badge
                    Row(
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(CasinoPrimaryContainer.copy(alpha = 0.15f))
                            .padding(horizontal = 12.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.MilitaryTech,
                            contentDescription = null,
                            tint = CasinoPrimary,
                            modifier = Modifier.size(14.dp)
                        )
                        Text(
                            text = "اكتملت ٥ من ٥ جولات",
                            fontFamily = CairoFontFamily,
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp,
                            color = CasinoPrimary
                        )
                    }

                    // Top 3 Podium Display (2nd, 1st, 3rd)
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 4.dp),
                        horizontalArrangement = Arrangement.SpaceAround,
                        verticalAlignment = Alignment.Bottom
                    ) {
                        // 2nd Place: Player (أنت)
                        PodiumAvatar(
                            rank = 2,
                            name = "أنت",
                            avatarUrl = viewModel.avatarUser,
                            wealth = "1,320 🪙",
                            rankColor = CasinoInverseSurface,
                            rankTextColor = CasinoInverseOnSurface,
                            size = 52.dp,
                            offsetY = 0.dp
                        )

                        // 1st Place: Winner Maya (Elevated with Crown)
                        PodiumAvatar(
                            rank = 1,
                            name = "Maya",
                            avatarUrl = viewModel.avatarMaya,
                            wealth = "1,850",
                            rankColor = CasinoPrimaryContainer,
                            rankTextColor = CasinoOnPrimaryContainer,
                            size = 64.dp,
                            offsetY = (-14).dp,
                            hasCrown = true,
                            isGold = true
                        )

                        // 3rd Place: Ahmed
                        PodiumAvatar(
                            rank = 3,
                            name = "Ahmed",
                            avatarUrl = viewModel.avatarAhmed,
                            wealth = "920 🪙",
                            rankColor = CasinoTertiary,
                            rankTextColor = CasinoOnTertiaryContainer,
                            size = 52.dp,
                            offsetY = 0.dp
                        )
                    }
                }
            }
        }

        // Leaderboard Table Container
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp)),
                colors = CardDefaults.cardColors(containerColor = CasinoSurfaceContainerLow)
            ) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    // Table Header
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(CasinoSurfaceContainerHigh)
                            .padding(horizontal = 14.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "#",
                            fontFamily = CairoFontFamily,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            color = CasinoOnSurfaceVariant,
                            modifier = Modifier.width(24.dp)
                        )
                        Text(
                            text = "اللاعب",
                            fontFamily = CairoFontFamily,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            color = CasinoOnSurfaceVariant,
                            modifier = Modifier.weight(1f)
                        )
                        Text(
                            text = "الجولات",
                            fontFamily = CairoFontFamily,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            color = CasinoOnSurfaceVariant,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.width(50.dp)
                        )
                        Text(
                            text = "صافي الثروة",
                            fontFamily = CairoFontFamily,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            color = CasinoOnSurfaceVariant,
                            textAlign = TextAlign.End,
                            modifier = Modifier.width(80.dp)
                        )
                    }

                    // Rows
                    StandingsRow(
                        rank = 1,
                        name = "Maya",
                        avatarUrl = viewModel.avatarMaya,
                        roundsWon = 3,
                        wealth = "1,850",
                        isWinner = true
                    )

                    StandingsRow(
                        rank = 2,
                        name = "أنت",
                        avatarUrl = viewModel.avatarUser,
                        roundsWon = 1,
                        wealth = "1,320",
                        isUser = true
                    )

                    StandingsRow(
                        rank = 3,
                        name = "Ahmed",
                        avatarUrl = viewModel.avatarAhmed,
                        roundsWon = 1,
                        wealth = "920"
                    )

                    StandingsRow(
                        rank = 4,
                        name = "Karim",
                        avatarUrl = viewModel.avatarKarim,
                        roundsWon = 0,
                        wealth = "680"
                    )

                    StandingsRow(
                        rank = 5,
                        name = "Omar",
                        avatarUrl = viewModel.avatarOmar,
                        roundsWon = 1,
                        wealth = "450"
                    )

                    StandingsRow(
                        rank = 6,
                        name = "Nour",
                        avatarUrl = viewModel.avatarNour,
                        roundsWon = 0,
                        wealth = "310"
                    )
                }
            }
        }

        // Performance Summary Mini Cards
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Accuracy Card
                Card(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(14.dp)),
                    colors = CardDefaults.cardColors(containerColor = CasinoSurfaceContainerLow)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(CasinoSurfaceContainerHigh),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.PsychologyAlt,
                                contentDescription = null,
                                tint = CasinoPrimary,
                                modifier = Modifier.size(20.dp)
                            )
                        }

                        Column {
                            Text(
                                text = "دقة التخمينات",
                                fontFamily = TajawalFontFamily,
                                fontSize = 11.sp,
                                color = CasinoOnSurfaceVariant
                            )
                            Text(
                                text = "٩١٪",
                                fontFamily = CairoFontFamily,
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 18.sp,
                                color = CasinoOnSurface
                            )
                        }
                    }
                }

                // Profit Card
                Card(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(14.dp)),
                    colors = CardDefaults.cardColors(containerColor = CasinoSurfaceContainerLow)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(CasinoSurfaceContainerHigh),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.TrendingUp,
                                contentDescription = null,
                                tint = CasinoSecondary,
                                modifier = Modifier.size(20.dp)
                            )
                        }

                        Column {
                            Text(
                                text = "صافي الأرباح",
                                fontFamily = TajawalFontFamily,
                                fontSize = 11.sp,
                                color = CasinoOnSurfaceVariant
                            )
                            Text(
                                text = "+٨٧٠ 🪙",
                                fontFamily = CairoFontFamily,
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 16.sp,
                                color = CasinoSecondary
                            )
                        }
                    }
                }
            }
        }

        // Bottom CTA Actions (Home & Play Again)
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 80.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Secondary: Home
                Button(
                    onClick = onHome,
                    modifier = Modifier
                        .weight(2f)
                        .height(52.dp)
                        .testTag("leaderboard_home_btn"),
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
                            imageVector = Icons.Default.Home,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                        Text(
                            text = "الرئيسية",
                            fontFamily = CairoFontFamily,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp
                        )
                    }
                }

                // Primary: Play Again
                Button(
                    onClick = onPlayAgain,
                    modifier = Modifier
                        .weight(3f)
                        .height(52.dp)
                        .shadow(12.dp, RoundedCornerShape(14.dp))
                        .testTag("play_again_btn"),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = CasinoPrimaryContainer,
                        contentColor = CasinoOnPrimary
                    )
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Replay,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                        Text(
                            text = "لعب مرة أخرى",
                            fontFamily = CairoFontFamily,
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 15.sp
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun PodiumAvatar(
    rank: Int,
    name: String,
    avatarUrl: String,
    wealth: String,
    rankColor: Color,
    rankTextColor: Color,
    size: androidx.compose.ui.unit.Dp,
    offsetY: androidx.compose.ui.unit.Dp,
    hasCrown: Boolean = false,
    isGold: Boolean = false
) {
    Column(
        modifier = Modifier.padding(bottom = if (offsetY < 0.dp) (-offsetY) else 0.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        if (hasCrown) {
            Text(text = "👑", fontSize = 20.sp)
        }

        Box(contentAlignment = Alignment.BottomEnd) {
            Box(
                modifier = Modifier
                    .size(size)
                    .clip(CircleShape)
                    .border(
                        width = if (isGold) 2.dp else 1.dp,
                        brush = if (isGold) Brush.radialGradient(listOf(CasinoGoldShimmer, CasinoPrimaryContainer))
                        else Brush.linearGradient(listOf(CasinoSurfaceContainerHighest, CasinoSurfaceContainerHighest)),
                        shape = CircleShape
                    )
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
                    .size(20.dp)
                    .clip(CircleShape)
                    .background(rankColor),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "$rank",
                    fontFamily = CairoFontFamily,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 11.sp,
                    color = rankTextColor
                )
            }
        }

        Text(
            text = name,
            fontFamily = CairoFontFamily,
            fontWeight = FontWeight.Bold,
            fontSize = if (isGold) 15.sp else 12.sp,
            color = if (isGold) CasinoPrimary else CasinoOnSurface
        )

        Row(
            modifier = Modifier
                .clip(CircleShape)
                .background(CasinoSurfaceContainerHighest)
                .padding(horizontal = 6.dp, vertical = 2.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            if (isGold) {
                Icon(
                    imageVector = Icons.Default.Toll,
                    contentDescription = null,
                    tint = CasinoPrimary,
                    modifier = Modifier.size(11.dp)
                )
            }
            Text(
                text = wealth,
                fontFamily = CairoFontFamily,
                fontWeight = FontWeight.Bold,
                fontSize = 10.sp,
                color = if (isGold) CasinoPrimary else CasinoPrimaryFixedDim
            )
        }
    }
}

@Composable
private fun StandingsRow(
    rank: Int,
    name: String,
    avatarUrl: String,
    roundsWon: Int,
    wealth: String,
    isWinner: Boolean = false,
    isUser: Boolean = false
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(if (isUser) CasinoSurfaceContainerHigh else Color.Transparent)
            .padding(horizontal = 14.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Rank Pin
        Box(
            modifier = Modifier
                .size(24.dp)
                .clip(CircleShape)
                .background(
                    when (rank) {
                        1 -> CasinoPrimaryContainer
                        2 -> CasinoInverseSurface
                        3 -> CasinoTertiary
                        else -> CasinoSurfaceContainerHighest
                    }
                ),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "$rank",
                fontFamily = CairoFontFamily,
                fontWeight = FontWeight.Bold,
                fontSize = 11.sp,
                color = when (rank) {
                    1 -> CasinoOnPrimaryContainer
                    2 -> CasinoInverseOnSurface
                    3 -> CasinoOnTertiaryContainer
                    else -> CasinoOnSurfaceVariant
                }
            )
        }

        // Avatar & Name
        Row(
            modifier = Modifier.weight(1f).padding(horizontal = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(CircleShape)
            ) {
                AsyncImage(
                    model = avatarUrl,
                    contentDescription = name,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )
            }

            Text(
                text = name,
                fontFamily = CairoFontFamily,
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp,
                color = if (isWinner) CasinoPrimary else CasinoOnSurface
            )

            if (isUser) {
                Text(
                    text = "أنا",
                    fontFamily = CairoFontFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 9.sp,
                    color = CasinoPrimary,
                    modifier = Modifier
                        .clip(RoundedCornerShape(3.dp))
                        .background(CasinoPrimary.copy(alpha = 0.2f))
                        .padding(horizontal = 4.dp, vertical = 1.dp)
                )
            }
        }

        // Rounds Won
        Box(
            modifier = Modifier
                .width(50.dp)
                .clip(CircleShape)
                .background(CasinoSurfaceContainer)
                .padding(vertical = 2.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "$roundsWon",
                fontFamily = CairoFontFamily,
                fontWeight = FontWeight.Bold,
                fontSize = 12.sp,
                color = if (roundsWon > 0) CasinoPrimary else CasinoOnSurfaceVariant
            )
        }

        // Net Wealth
        Row(
            modifier = Modifier.width(80.dp),
            horizontalArrangement = Arrangement.End,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = wealth,
                fontFamily = CairoFontFamily,
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp,
                color = if (isUser) CasinoSecondary else CasinoPrimary
            )
            Icon(
                imageVector = Icons.Default.MonetizationOn,
                contentDescription = null,
                tint = if (isUser) CasinoSecondary else CasinoPrimaryContainer,
                modifier = Modifier.size(13.dp)
            )
        }
    }
}
