package com.example.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.MonetizationOn
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Toll
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.CairoFontFamily
import com.example.ui.theme.CasinoFeltDark
import com.example.ui.theme.CasinoGoldShimmer
import com.example.ui.theme.CasinoOnPrimary
import com.example.ui.theme.CasinoOnSurface
import com.example.ui.theme.CasinoOnSurfaceVariant
import com.example.ui.theme.CasinoPrimary
import com.example.ui.theme.CasinoPrimaryContainer
import com.example.ui.theme.CasinoSurfaceContainer
import com.example.ui.theme.CasinoSurfaceContainerHigh
import com.example.ui.theme.CasinoSurfaceContainerLow
import com.example.ui.theme.CasinoSurfaceContainerLowest

@Composable
fun TopCasinoHeader(
    chips: Long = 125500,
    levelText: String = "المستوى ١٤",
    userTitle: String = "العراب",
    showBack: Boolean = false,
    titleOverride: String? = null,
    onBackClick: () -> Unit = {},
    onProfileClick: () -> Unit = {},
    onNotificationsClick: () -> Unit = {},
    onStoreClick: () -> Unit = {}
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(64.dp)
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        CasinoSurfaceContainerLowest.copy(alpha = 0.98f),
                        CasinoSurfaceContainerLow.copy(alpha = 0.95f)
                    )
                )
            )
            .padding(horizontal = 16.dp),
        contentAlignment = Alignment.Center
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Left Side: Notifications & Golden VIP Store icons
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(
                    onClick = onNotificationsClick,
                    modifier = Modifier
                        .size(42.dp)
                        .clip(CircleShape)
                        .background(CasinoSurfaceContainer)
                        .testTag("notifications_button")
                ) {
                    Icon(
                        imageVector = Icons.Default.Notifications,
                        contentDescription = "الإشعارات",
                        tint = CasinoOnSurfaceVariant,
                        modifier = Modifier.size(20.dp)
                    )
                }

                IconButton(
                    onClick = onStoreClick,
                    modifier = Modifier
                        .size(42.dp)
                        .clip(CircleShape)
                        .background(CasinoSurfaceContainer)
                        .testTag("store_button")
                ) {
                    Icon(
                        imageVector = Icons.Default.Toll,
                        contentDescription = "المتجر الذهبي",
                        tint = CasinoPrimaryContainer,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }

            // Middle: If titleOverride present, display centered
            if (titleOverride != null) {
                Text(
                    text = titleOverride,
                    fontFamily = CairoFontFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    color = CasinoPrimary,
                    modifier = Modifier.testTag("header_title")
                )
            }

            // Right Side: If showBack, show back button; otherwise show Player Profile badge and Chips
            if (showBack) {
                IconButton(
                    onClick = onBackClick,
                    modifier = Modifier
                        .size(42.dp)
                        .clip(CircleShape)
                        .background(CasinoSurfaceContainerHigh)
                        .testTag("back_button")
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                        contentDescription = "رجوع",
                        tint = CasinoOnSurface,
                        modifier = Modifier.size(22.dp)
                    )
                }
            } else {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Chips counter pill
                    Row(
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(CasinoSurfaceContainerLow)
                            .border(1.dp, CasinoPrimaryContainer.copy(alpha = 0.3f), CircleShape)
                            .padding(horizontal = 10.dp, vertical = 5.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.MonetizationOn,
                            contentDescription = "فيشات",
                            tint = CasinoPrimaryContainer,
                            modifier = Modifier.size(18.dp)
                        )
                        Text(
                            text = String.format("%,d", chips),
                            fontFamily = CairoFontFamily,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = CasinoPrimary
                        )
                    }

                    // Profile Level Badge
                    Row(
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(CasinoSurfaceContainerHigh)
                            .clickable { onProfileClick() }
                            .padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                text = levelText,
                                fontFamily = CairoFontFamily,
                                fontWeight = FontWeight.Bold,
                                fontSize = 10.sp,
                                color = CasinoPrimary
                            )
                            Text(
                                text = userTitle,
                                fontFamily = CairoFontFamily,
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp,
                                color = CasinoOnSurface
                            )
                        }

                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape)
                                .background(
                                    Brush.radialGradient(
                                        listOf(CasinoGoldShimmer, CasinoPrimaryContainer)
                                    )
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Person,
                                contentDescription = "الملف الشخصي",
                                tint = CasinoOnPrimary,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}
