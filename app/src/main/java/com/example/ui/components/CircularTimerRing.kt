package com.example.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.CairoFontFamily
import com.example.ui.theme.CasinoError
import com.example.ui.theme.CasinoOnSurfaceVariant
import com.example.ui.theme.CasinoPrimary
import com.example.ui.theme.CasinoPrimaryContainer
import com.example.ui.theme.CasinoSurfaceContainerHighest
import kotlinx.coroutines.delay

@Composable
fun CircularTimerRing(
    initialSeconds: Int = 18,
    totalSeconds: Int = 30,
    size: Dp = 64.dp,
    strokeWidth: Dp = 3.5.dp,
    label: String? = "ثانية متبقية",
    onTimeUp: () -> Unit = {}
) {
    var secondsLeft by remember(initialSeconds) { mutableIntStateOf(initialSeconds) }

    LaunchedEffect(initialSeconds) {
        secondsLeft = initialSeconds
        while (secondsLeft > 0) {
            delay(1000L)
            secondsLeft--
        }
        onTimeUp()
    }

    val progress = secondsLeft.toFloat() / totalSeconds.toFloat()
    val animatedProgress by animateFloatAsState(
        targetValue = progress.coerceIn(0f, 1f),
        animationSpec = tween(1000),
        label = "timer_progress"
    )

    val isUrgent = secondsLeft <= 5
    val ringColor by animateColorAsState(
        targetValue = if (isUrgent) CasinoError else CasinoPrimaryContainer,
        label = "timer_color"
    )

    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            modifier = Modifier.size(size),
            contentAlignment = Alignment.Center
        ) {
            Canvas(modifier = Modifier.size(size)) {
                // Background Track
                drawCircle(
                    color = CasinoSurfaceContainerHighest,
                    radius = (size.toPx() - strokeWidth.toPx()) / 2,
                    style = Stroke(width = strokeWidth.toPx())
                )

                // Animated Progress Arc
                drawArc(
                    color = ringColor,
                    startAngle = -90f,
                    sweepAngle = 360f * animatedProgress,
                    useCenter = false,
                    style = Stroke(
                        width = strokeWidth.toPx(),
                        cap = StrokeCap.Round
                    )
                )
            }

            Text(
                text = "$secondsLeft",
                fontFamily = CairoFontFamily,
                fontWeight = FontWeight.ExtraBold,
                fontSize = if (size > 60.dp) 18.sp else 14.sp,
                color = if (isUrgent) CasinoError else CasinoPrimary
            )
        }

        if (label != null) {
            Text(
                text = label,
                fontFamily = CairoFontFamily,
                fontWeight = FontWeight.SemiBold,
                fontSize = 10.sp,
                color = CasinoOnSurfaceVariant
            )
        }
    }
}
