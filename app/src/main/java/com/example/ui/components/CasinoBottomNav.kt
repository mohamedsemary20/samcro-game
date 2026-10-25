package com.example.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
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
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.Casino
import androidx.compose.material.icons.filled.Leaderboard
import androidx.compose.material.icons.filled.Style
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.NavigationTab
import com.example.ui.theme.CairoFontFamily
import com.example.ui.theme.CasinoOnSurfaceVariant
import com.example.ui.theme.CasinoPrimaryContainer
import com.example.ui.theme.CasinoSurfaceContainerLowest

@Composable
fun CasinoBottomNav(
    currentTab: NavigationTab,
    onTabSelected: (NavigationTab) -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(72.dp)
            .shadow(16.dp)
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        CasinoSurfaceContainerLowest.copy(alpha = 0.96f),
                        CasinoSurfaceContainerLowest
                    )
                )
            )
            .padding(horizontal = 8.dp),
        contentAlignment = Alignment.Center
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceAround,
            verticalAlignment = Alignment.CenterVertically
        ) {
            NavItem(
                icon = Icons.Default.Casino,
                label = "الرئيسية",
                isSelected = currentTab == NavigationTab.HOME,
                testTag = "nav_home",
                onClick = { onTabSelected(NavigationTab.HOME) }
            )

            NavItem(
                icon = Icons.Default.Style,
                label = "الطاولات",
                isSelected = currentTab == NavigationTab.LOBBY,
                testTag = "nav_lobby",
                onClick = { onTabSelected(NavigationTab.LOBBY) }
            )

            NavItem(
                icon = Icons.Default.Leaderboard,
                label = "المتصدرين",
                isSelected = currentTab == NavigationTab.LEADERBOARD,
                testTag = "nav_leaderboard",
                onClick = { onTabSelected(NavigationTab.LEADERBOARD) }
            )

            NavItem(
                icon = Icons.Default.AccountCircle,
                label = "الملف",
                isSelected = currentTab == NavigationTab.PROFILE,
                testTag = "nav_profile",
                onClick = { onTabSelected(NavigationTab.PROFILE) }
            )
        }
    }
}

@Composable
private fun NavItem(
    icon: ImageVector,
    label: String,
    isSelected: Boolean,
    testTag: String,
    onClick: () -> Unit
) {
    val interactionSource = remember { MutableInteractionSource() }

    Column(
        modifier = Modifier
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                onClick = onClick
            )
            .padding(horizontal = 12.dp, vertical = 6.dp)
            .testTag(testTag),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(3.dp)
    ) {
        Box(contentAlignment = Alignment.Center) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = if (isSelected) CasinoPrimaryContainer else CasinoOnSurfaceVariant,
                modifier = Modifier.size(24.dp)
            )
        }

        Text(
            text = label,
            fontFamily = CairoFontFamily,
            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
            fontSize = 11.sp,
            color = if (isSelected) CasinoPrimaryContainer else CasinoOnSurfaceVariant
        )

        if (isSelected) {
            Box(
                modifier = Modifier
                    .size(4.dp)
                    .clip(CircleShape)
                    .background(CasinoPrimaryContainer)
            )
        }
    }
}
