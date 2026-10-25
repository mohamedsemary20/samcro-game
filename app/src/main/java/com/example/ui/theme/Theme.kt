package com.example.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val DarkColorScheme = darkColorScheme(
    primary = CasinoPrimary,
    onPrimary = CasinoOnPrimary,
    primaryContainer = CasinoPrimaryContainer,
    onPrimaryContainer = CasinoOnPrimaryContainer,
    inversePrimary = CasinoInversePrimary,
    secondary = CasinoSecondary,
    onSecondary = CasinoOnSecondary,
    secondaryContainer = CasinoSecondaryContainer,
    onSecondaryContainer = CasinoOnSecondaryContainer,
    tertiary = CasinoTertiary,
    onTertiary = CasinoOnTertiary,
    tertiaryContainer = CasinoTertiaryContainer,
    onTertiaryContainer = CasinoOnTertiaryContainer,
    background = CasinoSurface,
    onBackground = CasinoOnSurface,
    surface = CasinoSurface,
    onSurface = CasinoOnSurface,
    surfaceVariant = CasinoSurfaceVariant,
    onSurfaceVariant = CasinoOnSurfaceVariant,
    surfaceTint = CasinoSurfaceTint,
    inverseSurface = CasinoInverseSurface,
    inverseOnSurface = CasinoInverseOnSurface,
    error = CasinoError,
    onError = CasinoOnError,
    errorContainer = CasinoErrorContainer,
    onErrorContainer = CasinoOnErrorContainer,
    outline = CasinoOutline,
    outlineVariant = CasinoOutlineVariant
)

@Composable
fun MyApplicationTheme(
    content: @Composable () -> Unit,
) {
    // Preserve custom luxury casino aesthetic
    MaterialTheme(
        colorScheme = DarkColorScheme,
        typography = AppTypography,
        content = content
    )
}
