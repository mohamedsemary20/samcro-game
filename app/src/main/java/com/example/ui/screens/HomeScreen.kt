package com.example.ui.screens

import androidx.compose.foundation.Image
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CardGiftcard
import androidx.compose.material.icons.filled.Casino
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.MonetizationOn
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.WorkspacePremium
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
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
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.R
import com.example.data.GameViewModel
import com.example.data.model.NavigationTab
import com.example.ui.theme.CairoFontFamily
import com.example.ui.theme.CasinoFeltDark
import com.example.ui.theme.CasinoGoldShimmer
import com.example.ui.theme.CasinoOnPrimary
import com.example.ui.theme.CasinoOnSurface
import com.example.ui.theme.CasinoOnSurfaceVariant
import com.example.ui.theme.CasinoPrimary
import com.example.ui.theme.CasinoPrimaryContainer
import com.example.ui.theme.CasinoSecondary
import com.example.ui.theme.CasinoSecondaryContainer
import com.example.ui.theme.CasinoSurface
import com.example.ui.theme.CasinoSurfaceContainer
import com.example.ui.theme.CasinoSurfaceContainerHigh
import com.example.ui.theme.CasinoSurfaceContainerLow
import com.example.ui.theme.CasinoSurfaceContainerLowest
import com.example.ui.theme.TajawalFontFamily

@Composable
fun HomeScreen(
    viewModel: GameViewModel,
    onStartGame: () -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(CasinoSurface)
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Spacer(modifier = Modifier.height(8.dp))

            // Hero Brand Banner with 3D Crown & Casino Table Art
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(210.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .shadow(16.dp)
                    .border(
                        width = 1.dp,
                        brush = Brush.verticalGradient(
                            listOf(CasinoPrimaryContainer.copy(alpha = 0.5f), Color.Transparent)
                        ),
                        shape = RoundedCornerShape(24.dp)
                    )
            ) {
                // Background Casino Art
                Image(
                    painter = painterResource(id = R.drawable.hero_casino_banner),
                    contentDescription = "Casino Banner",
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )

                // Dark Gradient Scrim Overlay
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    Color.Black.copy(alpha = 0.3f),
                                    CasinoFeltDark.copy(alpha = 0.92f)
                                )
                            )
                        )
                )

                // Centered App Title & Logo
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Image(
                        painter = painterResource(id = R.drawable.app_logo),
                        contentDescription = "سمكرو شعار",
                        modifier = Modifier
                            .size(72.dp)
                            .clip(CircleShape)
                            .shadow(12.dp)
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = "سمكرو",
                        fontFamily = CairoFontFamily,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 28.sp,
                        color = CasinoGoldShimmer
                    )

                    Text(
                        text = "صالة التخمين والمراوغة الملكية",
                        fontFamily = TajawalFontFamily,
                        fontWeight = FontWeight.Medium,
                        fontSize = 13.sp,
                        color = CasinoOnSurfaceVariant,
                        textAlign = TextAlign.Center
                    )
                }
            }
        }

        // Quick Play Main CTA Button
        item {
            Button(
                onClick = onStartGame,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .shadow(12.dp, RoundedCornerShape(16.dp))
                    .testTag("home_quick_play_button"),
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
                        imageVector = Icons.Default.PlayArrow,
                        contentDescription = null,
                        modifier = Modifier.size(26.dp)
                    )
                    Text(
                        text = "انضمام سريع إلى الطاولة",
                        fontFamily = CairoFontFamily,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 16.sp
                    )
                }
            }
        }

        // Daily Bonus Card
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .clickable { viewModel.showToast("تم تحصيل المكافأة اليومية +5,000 فيشة ذهبية! 🎁") },
                colors = CardDefaults.cardColors(containerColor = CasinoSurfaceContainerLow)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(44.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(CasinoSurfaceContainerHigh),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.CardGiftcard,
                                contentDescription = null,
                                tint = CasinoPrimaryContainer,
                                modifier = Modifier.size(24.dp)
                            )
                        }

                        Column {
                            Text(
                                text = "المكافأة اليومية الملكية",
                                fontFamily = CairoFontFamily,
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                color = CasinoOnSurface
                            )
                            Text(
                                text = "جاهزة للتحصيل الآن: 5,000 فيشة",
                                fontFamily = TajawalFontFamily,
                                fontSize = 12.sp,
                                color = CasinoSecondary
                            )
                        }
                    }

                    Box(
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(CasinoSecondaryContainer.copy(alpha = 0.3f))
                            .border(1.dp, CasinoSecondary, CircleShape)
                            .padding(horizontal = 10.dp, vertical = 5.dp)
                    ) {
                        Text(
                            text = "تحصيل",
                            fontFamily = CairoFontFamily,
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp,
                            color = CasinoSecondary
                        )
                    }
                }
            }
        }

        // VIP Lounges / Active Rooms List
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "طاولات كبار الشخصيات المفتوحة",
                    fontFamily = CairoFontFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    color = CasinoPrimary
                )

                Text(
                    text = "عرض الكل",
                    fontFamily = CairoFontFamily,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 12.sp,
                    color = CasinoOnSurfaceVariant,
                    modifier = Modifier.clickable { viewModel.setTab(NavigationTab.LOBBY) }
                )
            }
        }

        // Table 1: High Roller
        item {
            TableItemCard(
                title = "صالة السلاطين VIP",
                minBet = "500 فيشة",
                playersCount = "6 / 8 لاعبين",
                isVip = true,
                onClick = {
                    viewModel.setTab(NavigationTab.LOBBY)
                }
            )
        }

        // Table 2: Pro Table
        item {
            TableItemCard(
                title = "طاولة المحترفين الذهبية",
                minBet = "200 فيشة",
                playersCount = "4 / 8 لاعبين",
                isVip = false,
                onClick = {
                    viewModel.setTab(NavigationTab.LOBBY)
                }
            )
        }

        // Table 3: Quick Bluffers
        item {
            TableItemCard(
                title = "طاولة التخمين والمراوغة",
                minBet = "100 فيشة",
                playersCount = "5 / 8 لاعبين",
                isVip = false,
                onClick = {
                    viewModel.setTab(NavigationTab.LOBBY)
                }
            )
        }

        item {
            Spacer(modifier = Modifier.height(90.dp))
        }
    }
}

@Composable
private fun TableItemCard(
    title: String,
    minBet: String,
    playersCount: String,
    isVip: Boolean,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = CasinoSurfaceContainerLow)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(46.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(if (isVip) CasinoPrimaryContainer.copy(alpha = 0.2f) else CasinoSurfaceContainerHigh),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = if (isVip) Icons.Default.WorkspacePremium else Icons.Default.Casino,
                        contentDescription = null,
                        tint = if (isVip) CasinoPrimaryContainer else CasinoOnSurfaceVariant,
                        modifier = Modifier.size(24.dp)
                    )
                }

                Column {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text(
                            text = title,
                            fontFamily = CairoFontFamily,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = CasinoOnSurface
                        )
                        if (isVip) {
                            Text(
                                text = "VIP",
                                fontFamily = CairoFontFamily,
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 9.sp,
                                color = CasinoOnPrimary,
                                modifier = Modifier
                                    .clip(RoundedCornerShape(4.dp))
                                    .background(CasinoPrimaryContainer)
                                    .padding(horizontal = 4.dp, vertical = 1.dp)
                            )
                        }
                    }

                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.MonetizationOn,
                                contentDescription = null,
                                tint = CasinoPrimaryContainer,
                                modifier = Modifier.size(14.dp)
                            )
                            Text(
                                text = minBet,
                                fontFamily = TajawalFontFamily,
                                fontSize = 11.sp,
                                color = CasinoPrimary
                            )
                        }
                        Text(text = "•", color = CasinoOnSurfaceVariant, fontSize = 10.sp)
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Group,
                                contentDescription = null,
                                tint = CasinoSecondary,
                                modifier = Modifier.size(14.dp)
                            )
                            Text(
                                text = playersCount,
                                fontFamily = TajawalFontFamily,
                                fontSize = 11.sp,
                                color = CasinoSecondary
                            )
                        }
                    }
                }
            }

            Box(
                modifier = Modifier
                    .clip(CircleShape)
                    .background(CasinoPrimaryContainer)
                    .padding(horizontal = 12.dp, vertical = 6.dp)
            ) {
                Text(
                    text = "دخول",
                    fontFamily = CairoFontFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                    color = CasinoOnPrimary
                )
            }
        }
    }
}
