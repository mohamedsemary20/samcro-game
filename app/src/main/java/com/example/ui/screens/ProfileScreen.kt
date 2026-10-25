package com.example.ui.screens

import androidx.compose.animation.AnimatedVisibility
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
import androidx.compose.material.icons.automirrored.filled.ArrowBackIos
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Analytics
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.Casino
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.MilitaryTech
import androidx.compose.material.icons.filled.Palette
import androidx.compose.material.icons.filled.Percent
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material.icons.filled.Vibration
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material.icons.filled.WorkspacePremium
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.data.GameViewModel
import com.example.ui.theme.CairoFontFamily
import com.example.ui.theme.CasinoError
import com.example.ui.theme.CasinoGoldShimmer
import com.example.ui.theme.CasinoOnPrimary
import com.example.ui.theme.CasinoOnPrimaryContainer
import com.example.ui.theme.CasinoOnSecondary
import com.example.ui.theme.CasinoOnSurface
import com.example.ui.theme.CasinoOnSurfaceVariant
import com.example.ui.theme.CasinoPrimary
import com.example.ui.theme.CasinoPrimaryContainer
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
fun ProfileScreen(
    viewModel: GameViewModel,
    onBack: () -> Unit
) {
    val profile by viewModel.userProfile.collectAsState()
    var isSettingsOpen by remember { mutableStateOf(true) }

    val cardSkinUrl = "https://lh3.googleusercontent.com/aida-public/AB6AXuC40MSy2EGhUlAXYhmKv0jzlh8ioOrmLVAnXC7Bwf4DUOJuBMTjYRBM19WOkMEjr2pMEhD4YtdATHxpONCJb7I3p4AJ78sZxytDTdDwmYdCm5QN_Ccwk6z2lTXgMH9UAifLyHoColOgfmYq0rLjMLy_NjPpfBJZsUlJWlckWNSg8vKYS0LgM7ufDpIVa6_4vyfSYXeg0PUwhjC4PbsnPDeLJprCmAuWqm8i_R_4SkGVKolo5jIInFd-zg"
    val tableFeltUrl = "https://lh3.googleusercontent.com/aida-public/AB6AXuC_dBdOBpvWDRpsgWh_zqZCQFnZYoZ-IJE-MvAo5g_mOwLaeO0hS0Gql2q-t71YRe6s6aV4D7wqaDf0O_3qCprMVEEk1loWctXkixZE4Ild_qhPwDtNjCvbFejb0op_AM_khm2PDJiS1-RzQ71osVLUlCo3Q6jDkWMQXBETCFp69plB9Co24pvryTgN79mEpqYLM7vGHEV1KDNv5Q8HpEiVCXl48M5d31EKb7mqa4QQfv8lWjWh69QDTg"

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

            // Top Navigation & Quick Controls Bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(
                    onClick = onBack,
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(CasinoSurfaceContainerHigh)
                        .testTag("profile_back_btn")
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                        contentDescription = "رجوع",
                        tint = CasinoOnSurface,
                        modifier = Modifier.size(20.dp)
                    )
                }

                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "ملفي الشخصي",
                        fontFamily = CairoFontFamily,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 17.sp,
                        color = CasinoPrimary
                    )
                    Row(
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
                            text = "متصل بالخادم العربي VIP",
                            fontFamily = TajawalFontFamily,
                            fontSize = 11.sp,
                            color = CasinoOnSurfaceVariant
                        )
                    }
                }

                IconButton(
                    onClick = { isSettingsOpen = !isSettingsOpen },
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(CasinoSurfaceContainerHigh)
                ) {
                    Icon(
                        imageVector = Icons.Default.Settings,
                        contentDescription = "الإعدادات",
                        tint = CasinoOnSurface,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }

        // Player Identity Card (Midnight Lounge Theme)
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(20.dp))
                    .border(1.dp, CasinoPrimaryContainer.copy(alpha = 0.35f), RoundedCornerShape(20.dp)),
                colors = CardDefaults.cardColors(containerColor = CasinoSurfaceContainerHigh)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(18.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // Avatar with Multi-layer Gold Frame
                    Box(contentAlignment = Alignment.BottomEnd) {
                        Box(
                            modifier = Modifier
                                .size(92.dp)
                                .clip(CircleShape)
                                .background(
                                    Brush.radialGradient(
                                        listOf(CasinoGoldShimmer, CasinoPrimaryContainer)
                                    )
                                )
                                .padding(3.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .clip(CircleShape)
                                    .background(CasinoSurfaceContainerLowest)
                            ) {
                                AsyncImage(
                                    model = viewModel.avatarUser,
                                    contentDescription = "أنت",
                                    modifier = Modifier.fillMaxSize(),
                                    contentScale = ContentScale.Crop
                                )
                            }
                        }

                        // Verified Green Badge
                        Box(
                            modifier = Modifier
                                .size(24.dp)
                                .clip(CircleShape)
                                .background(CasinoSurfaceContainerLowest)
                                .padding(2.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .clip(CircleShape)
                                    .background(CasinoSecondary),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Verified,
                                    contentDescription = "موثق",
                                    tint = CasinoOnSecondary,
                                    modifier = Modifier.size(14.dp)
                                )
                            }
                        }
                    }

                    // Crown Rank & Player Title
                    Row(
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(CasinoSurfaceContainer)
                            .padding(horizontal = 14.dp, vertical = 5.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.WorkspacePremium,
                            contentDescription = null,
                            tint = CasinoPrimaryContainer,
                            modifier = Modifier.size(16.dp)
                        )
                        Text(
                            text = "المستوى ${profile.level}",
                            fontFamily = CairoFontFamily,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = CasinoPrimary
                        )
                        Text(text = "•", color = CasinoOnSurfaceVariant, fontSize = 12.sp)
                        Text(
                            text = profile.title,
                            fontFamily = TajawalFontFamily,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = CasinoOnSurface
                        )
                    }

                    Text(
                        text = "معرّف اللاعب: ${profile.playerId}",
                        fontFamily = CairoFontFamily,
                        fontSize = 12.sp,
                        color = CasinoOnSurfaceVariant
                    )

                    // XP Progression Bar
                    Column(
                        modifier = Modifier
                            .fillMaxWidth(0.9f)
                            .clip(RoundedCornerShape(12.dp))
                            .background(CasinoSurfaceContainerLowest.copy(alpha = 0.8f))
                            .padding(10.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
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
                                    imageVector = Icons.Default.Bolt,
                                    contentDescription = null,
                                    tint = CasinoPrimary,
                                    modifier = Modifier.size(14.dp)
                                )
                                Text(
                                    text = "نقاط الخبرة (XP)",
                                    fontFamily = CairoFontFamily,
                                    fontSize = 11.sp,
                                    color = CasinoPrimary
                                )
                            }
                            Text(
                                text = "${profile.xp} / ${profile.maxXp}",
                                fontFamily = CairoFontFamily,
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp,
                                color = CasinoOnSurface
                            )
                        }

                        // Progress track
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(8.dp)
                                .clip(CircleShape)
                                .background(CasinoSurfaceContainer)
                        ) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth(profile.xp.toFloat() / profile.maxXp.toFloat())
                                    .height(8.dp)
                                    .clip(CircleShape)
                                    .background(
                                        Brush.horizontalGradient(
                                            listOf(CasinoSecondary, CasinoPrimaryContainer)
                                        )
                                    )
                            )
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "المستوى الحالي",
                                fontFamily = TajawalFontFamily,
                                fontSize = 10.sp,
                                color = CasinoOnSurfaceVariant
                            )
                            Text(
                                text = "باقي ${profile.maxXp - profile.xp} للمستوى القادم",
                                fontFamily = TajawalFontFamily,
                                fontSize = 10.sp,
                                color = CasinoOnSurfaceVariant
                            )
                        }
                    }
                }
            }
        }

        // Key Statistics Grid (3 Columns)
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                ProfileStatCard(
                    icon = Icons.Default.WorkspacePremium,
                    value = String.format("%,d", profile.maxBet),
                    label = "أكبر رهان",
                    tint = CasinoPrimaryContainer,
                    modifier = Modifier.weight(1f)
                )

                ProfileStatCard(
                    icon = Icons.Default.Percent,
                    value = "${profile.winRate}%",
                    label = "معدل الفوز",
                    tint = CasinoSecondary,
                    modifier = Modifier.weight(1f)
                )

                ProfileStatCard(
                    icon = Icons.Default.Casino,
                    value = "${profile.totalRounds}",
                    label = "إجمالي الجولات",
                    tint = CasinoOnSurface,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        // Interactive Modules List
        item {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // 1. Achievements
                ProfileModuleCard(
                    icon = Icons.Default.MilitaryTech,
                    title = "الإنجازات والكؤوس",
                    badgeText = "14/25",
                    subText = "تم فتح وسام \"صائد البلوف\" مؤخراً",
                    iconColor = CasinoPrimaryContainer,
                    onClick = { viewModel.showToast("قائمة الأوسمة والكؤوس الملكية 🏆") }
                )

                // 2. Detailed Stats
                ProfileModuleCard(
                    icon = Icons.Default.Analytics,
                    title = "الإحصائيات التفصيلية",
                    badgeText = null,
                    subText = "تحليل دقة التخمين وكشف الخدع",
                    iconColor = CasinoSecondary,
                    onClick = { viewModel.showToast("نسبة كشف البلوف: 74% • أعلى ربح جولة: 4,800 🪙") }
                )

                // 3. Appearance & Custom Card Foil
                ProfileModuleCard(
                    icon = Icons.Default.Palette,
                    title = "المظهر وفيشات البوكر",
                    badgeText = null,
                    subText = "الخلفيات الملكية ونقش البطاقات السري",
                    iconColor = CasinoPrimary,
                    onClick = { viewModel.showToast("تم فتح المتجر الملكي للمظاهر") }
                )

                // 4. Sound & Quick Game Settings Accordion
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp)),
                    colors = CardDefaults.cardColors(containerColor = CasinoSurfaceContainerHigh)
                ) {
                    Column(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { isSettingsOpen = !isSettingsOpen }
                                .padding(14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(42.dp)
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(CasinoSurfaceContainer),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Tune,
                                        contentDescription = null,
                                        tint = CasinoGoldShimmer,
                                        modifier = Modifier.size(22.dp)
                                    )
                                }

                                Column {
                                    Text(
                                        text = "إعدادات الصوت واللعبة",
                                        fontFamily = CairoFontFamily,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 14.sp,
                                        color = CasinoOnSurface
                                    )
                                    Text(
                                        text = "المؤثرات الصوتية والاهتزاز التفاعلي",
                                        fontFamily = TajawalFontFamily,
                                        fontSize = 12.sp,
                                        color = CasinoOnSurfaceVariant
                                    )
                                }
                            }

                            Icon(
                                imageVector = if (isSettingsOpen) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                                contentDescription = null,
                                tint = CasinoOnSurfaceVariant,
                                modifier = Modifier.size(20.dp)
                            )
                        }

                        // Accordion Content
                        AnimatedVisibility(visible = isSettingsOpen) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 14.dp, vertical = 8.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                // Sound Effects Switch
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(CasinoSurfaceContainer)
                                        .padding(horizontal = 12.dp, vertical = 6.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.VolumeUp,
                                            contentDescription = null,
                                            tint = CasinoPrimary,
                                            modifier = Modifier.size(18.dp)
                                        )
                                        Text(
                                            text = "مؤثرات الكازينو الصوتية",
                                            fontFamily = TajawalFontFamily,
                                            fontSize = 13.sp,
                                            color = CasinoOnSurface
                                        )
                                    }

                                    Switch(
                                        checked = profile.soundEffects,
                                        onCheckedChange = { viewModel.toggleSound(it) },
                                        colors = SwitchDefaults.colors(
                                            checkedThumbColor = CasinoOnPrimary,
                                            checkedTrackColor = CasinoSecondaryContainer
                                        ),
                                        modifier = Modifier.testTag("sound_toggle")
                                    )
                                }

                                // Haptics Switch
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(CasinoSurfaceContainer)
                                        .padding(horizontal = 12.dp, vertical = 6.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Vibration,
                                            contentDescription = null,
                                            tint = CasinoPrimary,
                                            modifier = Modifier.size(18.dp)
                                        )
                                        Text(
                                            text = "الاهتزاز اللمسي أثناء الرهان",
                                            fontFamily = TajawalFontFamily,
                                            fontSize = 13.sp,
                                            color = CasinoOnSurface
                                        )
                                    }

                                    Switch(
                                        checked = profile.hapticFeedback,
                                        onCheckedChange = { viewModel.toggleHaptics(it) },
                                        colors = SwitchDefaults.colors(
                                            checkedThumbColor = CasinoOnPrimary,
                                            checkedTrackColor = CasinoSecondaryContainer
                                        ),
                                        modifier = Modifier.testTag("haptics_toggle")
                                    )
                                }

                                // Language Pill
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(CasinoSurfaceContainer)
                                        .padding(horizontal = 12.dp, vertical = 10.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Language,
                                            contentDescription = null,
                                            tint = CasinoPrimary,
                                            modifier = Modifier.size(18.dp)
                                        )
                                        Text(
                                            text = "لغة الواجهة",
                                            fontFamily = TajawalFontFamily,
                                            fontSize = 13.sp,
                                            color = CasinoOnSurface
                                        )
                                    }

                                    Text(
                                        text = "العربية (الفصحى)",
                                        fontFamily = CairoFontFamily,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 11.sp,
                                        color = CasinoPrimary,
                                        modifier = Modifier
                                            .clip(CircleShape)
                                            .background(CasinoSurfaceContainerHigh)
                                            .padding(horizontal = 8.dp, vertical = 3.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // Active Cosmetics Showcase
        item {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "التجهيزات النشطة للطاولة",
                        fontFamily = CairoFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = CasinoOnSurface
                    )
                    Text(
                        text = "المتجر الملكي",
                        fontFamily = CairoFontFamily,
                        fontSize = 12.sp,
                        color = CasinoPrimary,
                        modifier = Modifier.clickable { viewModel.showToast("المتجر الملكي مفتوح") }
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Item 1: Card Skin
                    CosmeticCard(
                        title = profile.cardSkinTitle,
                        subtitle = "مظهر بطاقة التخمين",
                        imageUrl = cardSkinUrl,
                        tagText = "مجهز",
                        tagColor = CasinoPrimaryContainer,
                        modifier = Modifier.weight(1f)
                    )

                    // Item 2: Table Felt Skin
                    CosmeticCard(
                        title = profile.tableFeltTitle,
                        subtitle = "أرضية البوكر الخاصة",
                        imageUrl = tableFeltUrl,
                        tagText = "مجهز",
                        tagColor = CasinoSecondary,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }

        // Logout Button
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .clickable { viewModel.showToast("تم تسجيل الخروج بنجاح") }
                    .padding(bottom = 80.dp),
                colors = CardDefaults.cardColors(containerColor = CasinoSurfaceContainer)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Logout,
                        contentDescription = null,
                        tint = CasinoError,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.size(8.dp))
                    Text(
                        text = "تسجيل الخروج من الحساب",
                        fontFamily = CairoFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                        color = CasinoError
                    )
                }
            }
        }
    }
}

@Composable
private fun ProfileStatCard(
    icon: ImageVector,
    value: String,
    label: String,
    tint: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.clip(RoundedCornerShape(14.dp)),
        colors = CardDefaults.cardColors(containerColor = CasinoSurfaceContainerHigh)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp, horizontal = 6.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(CircleShape)
                    .background(CasinoSurfaceContainerHighest),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = tint,
                    modifier = Modifier.size(16.dp)
                )
            }
            Text(
                text = value,
                fontFamily = CairoFontFamily,
                fontWeight = FontWeight.ExtraBold,
                fontSize = 18.sp,
                color = tint
            )
            Text(
                text = label,
                fontFamily = TajawalFontFamily,
                fontSize = 11.sp,
                color = CasinoOnSurfaceVariant
            )
        }
    }
}

@Composable
private fun ProfileModuleCard(
    icon: ImageVector,
    title: String,
    badgeText: String?,
    subText: String,
    iconColor: Color,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = CasinoSurfaceContainerHigh)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(42.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(CasinoSurfaceContainer),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = iconColor,
                        modifier = Modifier.size(22.dp)
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
                        if (badgeText != null) {
                            Text(
                                text = badgeText,
                                fontFamily = CairoFontFamily,
                                fontWeight = FontWeight.Bold,
                                fontSize = 10.sp,
                                color = CasinoOnPrimaryContainer,
                                modifier = Modifier
                                    .clip(CircleShape)
                                    .background(CasinoPrimaryContainer)
                                    .padding(horizontal = 6.dp, vertical = 1.dp)
                            )
                        }
                    }

                    Text(
                        text = subText,
                        fontFamily = TajawalFontFamily,
                        fontSize = 11.sp,
                        color = CasinoOnSurfaceVariant
                    )
                }
            }

            Icon(
                imageVector = Icons.AutoMirrored.Filled.ArrowBackIos,
                contentDescription = null,
                tint = CasinoOnSurfaceVariant,
                modifier = Modifier.size(16.dp)
            )
        }
    }
}

@Composable
private fun CosmeticCard(
    title: String,
    subtitle: String,
    imageUrl: String,
    tagText: String,
    tagColor: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.clip(RoundedCornerShape(14.dp)),
        colors = CardDefaults.cardColors(containerColor = CasinoSurfaceContainerHigh)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(96.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(CasinoSurfaceContainerLowest)
            ) {
                AsyncImage(
                    model = imageUrl,
                    contentDescription = title,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )

                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(4.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .background(CasinoSurfaceContainerLowest.copy(alpha = 0.85f))
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = tagText,
                        fontFamily = CairoFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 10.sp,
                        color = tagColor
                    )
                }
            }

            Column {
                Text(
                    text = title,
                    fontFamily = CairoFontFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                    color = CasinoOnSurface,
                    maxLines = 1
                )
                Text(
                    text = subtitle,
                    fontFamily = TajawalFontFamily,
                    fontSize = 10.sp,
                    color = CasinoOnSurfaceVariant
                )
            }
        }
    }
}
