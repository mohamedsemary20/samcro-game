package com.example.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import com.example.ui.theme.CasinoGoldShimmer
import com.example.ui.theme.CasinoPrimary
import com.example.ui.theme.CasinoPrimaryContainer
import com.example.ui.theme.CasinoSecondary
import kotlin.random.Random

data class ConfettiParticle(
    val initialX: Float,
    val speedY: Float,
    val speedX: Float,
    val size: Float,
    val color: Color
)

@Composable
fun ConfettiEffect(modifier: Modifier = Modifier) {
    val progress = remember { Animatable(0f) }

    val particles = remember {
        val colors = listOf(
            CasinoPrimaryContainer,
            CasinoGoldShimmer,
            CasinoPrimary,
            CasinoSecondary,
            Color.White
        )
        List(45) {
            ConfettiParticle(
                initialX = Random.nextFloat(),
                speedY = Random.nextFloat() * 400f + 250f,
                speedX = (Random.nextFloat() - 0.5f) * 120f,
                size = Random.nextFloat() * 10f + 6f,
                color = colors[Random.nextInt(colors.size)]
            )
        }
    }

    LaunchedEffect(Unit) {
        progress.animateTo(
            targetValue = 1f,
            animationSpec = tween(durationMillis = 3500, easing = LinearEasing)
        )
    }

    Canvas(modifier = modifier.fillMaxSize()) {
        val canvasWidth = size.width
        val canvasHeight = size.height

        val alpha = (1f - progress.value).coerceIn(0f, 1f)
        if (alpha > 0.01f) {
            particles.forEach { p ->
                val currentY = (p.speedY * progress.value * 2.5f) % (canvasHeight + 100f) - 50f
                val currentX = (p.initialX * canvasWidth + p.speedX * progress.value) % canvasWidth

                drawRect(
                    color = p.color.copy(alpha = alpha),
                    topLeft = Offset(currentX, currentY),
                    size = Size(p.size, p.size * 0.7f)
                )
            }
        }
    }
}
