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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Done
import androidx.compose.material.icons.filled.LockOpen
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Mood
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Style
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material.icons.filled.WorkspacePremium
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.R
import com.example.data.GameViewModel
import com.example.data.model.GamePhase
import com.example.data.model.NavigationTab
import com.example.ui.theme.CairoFontFamily
import com.example.ui.theme.CasinoError
import com.example.ui.theme.CasinoErrorContainer
import com.example.ui.theme.CasinoGoldShimmer
import com.example.ui.theme.CasinoOnError
import com.example.ui.theme.CasinoOnPrimary
import com.example.ui.theme.CasinoOnPrimaryContainer
import com.example.ui.theme.CasinoOnSecondaryContainer
import com.example.ui.theme.CasinoOnSurface
import com.example.ui.theme.CasinoOnSurfaceVariant
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
fun LobbyScreen(
    viewModel: GameViewModel,
    onStartMatch: () -> Unit
) {
    val roomCode by viewModel.roomCode.collectAsState()
    val chatMessages by viewModel.chatMessages.collectAsState()
    val clipboardManager = LocalClipboardManager.current
    var chatInput by remember { mutableStateOf("") }
    var emojiIndex by remember { mutableIntStateOf(0) }
    val emojiList = listOf("🔥", "👑", "🎲", "🤑", "🤫", "🃏")

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(CasinoSurface)
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Spacer(modifier = Modifier.height(6.dp))

            // Top Bar: Room Code, Active Players Count & Leave Button
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(CasinoSurfaceContainerLow.copy(alpha = 0.9f))
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                // Exit / Leave Button
                Row(
                    modifier = Modifier
                        .clip(CircleShape)
                        .background(CasinoErrorContainer.copy(alpha = 0.8f))
                        .clickable { viewModel.setTab(NavigationTab.HOME) }
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                        .testTag("leave_room_button"),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Logout,
                        contentDescription = "مغادرة",
                        tint = CasinoOnError,
                        modifier = Modifier.size(16.dp)
                    )
                    Text(
                        text = "مغادرة",
                        fontFamily = CairoFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        color = CasinoOnError
                    )
                }

                // Room Code with Copy
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "رمز الغرفة الملكية",
                        fontFamily = CairoFontFamily,
                        fontSize = 10.sp,
                        color = CasinoOnSurfaceVariant
                    )
                    Row(
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(CasinoSurfaceContainerHighest)
                            .clickable {
                                clipboardManager.setText(AnnotatedString(roomCode))
                                viewModel.showToast("تم نسخ رمز الغرفة: $roomCode")
                            }
                            .padding(horizontal = 10.dp, vertical = 3.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text(
                            text = roomCode,
                            fontFamily = CairoFontFamily,
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 15.sp,
                            color = CasinoPrimaryContainer
                        )
                        Icon(
                            imageVector = Icons.Default.ContentCopy,
                            contentDescription = "نسخ",
                            tint = CasinoOnSurfaceVariant,
                            modifier = Modifier.size(14.dp)
                        )
                    }
                }

                // Active Count Indicator
                Row(
                    modifier = Modifier
                        .clip(CircleShape)
                        .background(CasinoSurfaceContainer)
                        .padding(horizontal = 10.dp, vertical = 5.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(7.dp)
                            .clip(CircleShape)
                            .background(CasinoSecondary)
                    )
                    Text(
                        text = "6/8",
                        fontFamily = CairoFontFamily,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        color = CasinoSecondary
                    )
                }
            }
        }

        // Ambient Casino Banner
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp)),
                colors = CardDefaults.cardColors(containerColor = CasinoSurfaceContainerHigh)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.WorkspacePremium,
                                contentDescription = null,
                                tint = CasinoPrimaryContainer,
                                modifier = Modifier.size(16.dp)
                            )
                            Text(
                                text = "طاولة كبار الشخصيات",
                                fontFamily = CairoFontFamily,
                                fontWeight = FontWeight.Bold,
                                fontSize = 11.sp,
                                color = CasinoPrimaryContainer
                            )
                        }
                        Text(
                            text = "صالة التخمين والمراوغة",
                            fontFamily = CairoFontFamily,
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp,
                            color = CasinoOnSurface
                        )
                        Text(
                            text = "انتظر اكتمال النصاب أو ابدأ الجولة الآن كقائد للطاولة",
                            fontFamily = TajawalFontFamily,
                            fontSize = 12.sp,
                            color = CasinoOnSurfaceVariant
                        )
                    }

                    Spacer(modifier = Modifier.width(8.dp))

                    Box(
                        modifier = Modifier
                            .size(60.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(CasinoSurfaceContainerLowest),
                        contentAlignment = Alignment.Center
                    ) {
                        Image(
                            painter = painterResource(id = R.drawable.app_logo),
                            contentDescription = "Chits Art",
                            modifier = Modifier.size(54.dp),
                            contentScale = ContentScale.Crop
                        )
                    }
                }
            }
        }

        // Seats Available (6 Ready)
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "المقاعد المتاحة (6 جاهزون)",
                    fontFamily = CairoFontFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = CasinoPrimary
                )
                Text(
                    text = "🔒 تحديث تلقائي",
                    fontFamily = TajawalFontFamily,
                    fontSize = 11.sp,
                    color = CasinoOnSurfaceVariant
                )
            }
        }

        // Grid of 8 seats (2 rows x 4 columns)
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(CasinoSurfaceContainerLow)
                    .padding(10.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Row 1: You (Host), Maya, Karim, Omar
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceAround
                ) {
                    PlayerSeat(
                        name = "أنت (المضيف)",
                        avatarUrl = viewModel.avatarUser,
                        isHost = true,
                        isReady = true
                    )
                    PlayerSeat(
                        name = "Maya",
                        avatarUrl = viewModel.avatarMaya,
                        isHost = false,
                        isReady = true
                    )
                    PlayerSeat(
                        name = "Karim",
                        avatarUrl = viewModel.avatarKarim,
                        isHost = false,
                        isReady = true
                    )
                    PlayerSeat(
                        name = "Omar",
                        avatarUrl = viewModel.avatarOmar,
                        isHost = false,
                        isReady = true
                    )
                }

                // Row 2: Nour, Sara, Empty Waiting, Invite Friend
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceAround
                ) {
                    PlayerSeat(
                        name = "Nour",
                        avatarUrl = viewModel.avatarNour,
                        isHost = false,
                        isReady = true
                    )
                    PlayerSeat(
                        name = "Sara",
                        avatarUrl = viewModel.avatarSara,
                        isHost = false,
                        isReady = true
                    )
                    EmptySeat(
                        title = "انتظار...",
                        icon = Icons.Default.Add,
                        onClick = { viewModel.showToast("جاري البحث عن لاعب للانضمام...") }
                    )
                    EmptySeat(
                        title = "دعوة صديق",
                        icon = Icons.Default.PersonAdd,
                        onClick = { viewModel.showToast("تم إنشاء رابط الدعوة لمشاركته مع أصدقائك!") }
                    )
                }
            }
        }

        // Match Settings Bento Box
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "إعدادات المباراة",
                    fontFamily = CairoFontFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = CasinoOnSurface
                )
                Row(
                    modifier = Modifier.clickable { viewModel.showToast("إعدادات الطاولة الملكية مخصصة للغرفة") },
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Tune,
                        contentDescription = null,
                        tint = CasinoPrimary,
                        modifier = Modifier.size(14.dp)
                    )
                    Text(
                        text = "تعديل",
                        fontFamily = CairoFontFamily,
                        fontSize = 12.sp,
                        color = CasinoPrimary
                    )
                }
            }
        }

        // 4 Settings Pills
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                SettingPill(
                    icon = Icons.Default.Style,
                    value = "5",
                    label = "جولات",
                    tint = CasinoPrimaryContainer,
                    modifier = Modifier.weight(1f)
                )
                SettingPill(
                    icon = Icons.Default.Timer,
                    value = "60",
                    label = "ثانية",
                    tint = CasinoSecondary,
                    modifier = Modifier.weight(1f)
                )
                SettingPill(
                    icon = Icons.Default.WorkspacePremium,
                    value = "500",
                    label = "شريحة",
                    tint = CasinoPrimaryContainer,
                    modifier = Modifier.weight(1f)
                )
                SettingPill(
                    icon = Icons.Default.LockOpen,
                    value = "عام",
                    label = "الدخول",
                    tint = CasinoSecondary,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        // Live Room Chat Feed
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp)),
                colors = CardDefaults.cardColors(containerColor = CasinoSurfaceContainerLowest.copy(alpha = 0.9f))
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
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
                                imageVector = Icons.Default.Chat,
                                contentDescription = null,
                                tint = CasinoSecondary,
                                modifier = Modifier.size(14.dp)
                            )
                            Text(
                                text = "دردشة الغرفة المباشرة",
                                fontFamily = CairoFontFamily,
                                fontWeight = FontWeight.Bold,
                                fontSize = 11.sp,
                                color = CasinoOnSurfaceVariant
                            )
                        }
                        Text(
                            text = "الكل متصل",
                            fontFamily = TajawalFontFamily,
                            fontSize = 11.sp,
                            color = CasinoSecondary
                        )
                    }

                    // Messages List
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        chatMessages.takeLast(3).forEach { msg ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(CasinoSurfaceContainer.copy(alpha = 0.7f))
                                    .padding(horizontal = 8.dp, vertical = 4.dp),
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "${msg.senderName}:",
                                    fontFamily = CairoFontFamily,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 11.sp,
                                    color = Color(msg.colorHex)
                                )
                                Text(
                                    text = msg.text,
                                    fontFamily = TajawalFontFamily,
                                    fontSize = 12.sp,
                                    color = CasinoOnSurface
                                )
                            }
                        }
                    }

                    // Chat Input Bar
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        IconButton(
                            onClick = {
                                chatInput += emojiList[emojiIndex % emojiList.size]
                                emojiIndex++
                            },
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(CasinoSurfaceContainer)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Mood,
                                contentDescription = "إيموجي",
                                tint = CasinoPrimaryContainer,
                                modifier = Modifier.size(18.dp)
                            )
                        }

                        OutlinedTextField(
                            value = chatInput,
                            onValueChange = { chatInput = it },
                            placeholder = {
                                Text(
                                    text = "اكتب رسالة سريعة للجميع...",
                                    fontFamily = TajawalFontFamily,
                                    fontSize = 12.sp,
                                    color = CasinoOnSurfaceVariant.copy(alpha = 0.7f)
                                )
                            },
                            modifier = Modifier
                                .weight(1f)
                                .height(44.dp)
                                .testTag("lobby_chat_input"),
                            shape = CircleShape,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedContainerColor = CasinoSurfaceContainer,
                                unfocusedContainerColor = CasinoSurfaceContainer,
                                focusedBorderColor = CasinoPrimaryContainer,
                                unfocusedBorderColor = Color.Transparent,
                                focusedTextColor = CasinoOnSurface,
                                unfocusedTextColor = CasinoOnSurface
                            ),
                            singleLine = true
                        )

                        IconButton(
                            onClick = {
                                if (chatInput.isNotBlank()) {
                                    viewModel.sendChat(chatInput)
                                    chatInput = ""
                                }
                            },
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(CasinoPrimaryContainer)
                                .testTag("lobby_chat_send_button")
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.Send,
                                contentDescription = "إرسال",
                                tint = CasinoOnPrimaryContainer,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                }
            }
        }

        // Primary Grand CTA: Start Game
        item {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Button(
                    onClick = {
                        viewModel.setPhase(GamePhase.QUESTION_BETTING)
                        onStartMatch()
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp)
                        .shadow(16.dp, RoundedCornerShape(16.dp))
                        .testTag("start_game_now_button"),
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
                            imageVector = Icons.Default.PlayCircle,
                            contentDescription = null,
                            modifier = Modifier.size(24.dp)
                        )
                        Text(
                            text = "ابدأ المباراة الآن",
                            fontFamily = CairoFontFamily,
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 18.sp
                        )
                    }
                }

                Row(
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
                        text = "الحد الأدنى للبدء 4 لاعبين (تم استيفاء الشروط)",
                        fontFamily = TajawalFontFamily,
                        fontSize = 11.sp,
                        color = CasinoOnSurfaceVariant
                    )
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(90.dp))
        }
    }
}

@Composable
private fun PlayerSeat(
    name: String,
    avatarUrl: String,
    isHost: Boolean,
    isReady: Boolean
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Box(contentAlignment = Alignment.Center) {
            Box(
                modifier = Modifier
                    .size(54.dp)
                    .clip(CircleShape)
                    .border(
                        width = if (isHost) 2.dp else 1.dp,
                        color = if (isHost) CasinoPrimaryContainer else CasinoSurfaceContainerHighest,
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

            // Star host badge
            if (isHost) {
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .size(18.dp)
                        .clip(CircleShape)
                        .background(CasinoPrimaryContainer),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Star,
                        contentDescription = "المضيف",
                        tint = CasinoOnPrimaryContainer,
                        modifier = Modifier.size(12.dp)
                    )
                }
            }

            // Ready Badge
            if (isReady) {
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .clip(CircleShape)
                        .background(CasinoSecondaryContainer)
                        .padding(horizontal = 6.dp, vertical = 1.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(2.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Done,
                            contentDescription = null,
                            tint = CasinoOnSecondaryContainer,
                            modifier = Modifier.size(10.dp)
                        )
                        Text(
                            text = "جاهز",
                            fontFamily = CairoFontFamily,
                            fontWeight = FontWeight.Bold,
                            fontSize = 9.sp,
                            color = CasinoOnSecondaryContainer
                        )
                    }
                }
            }
        }

        Text(
            text = name,
            fontFamily = CairoFontFamily,
            fontWeight = FontWeight.Bold,
            fontSize = 12.sp,
            color = if (isHost) CasinoPrimary else CasinoOnSurface,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@Composable
private fun EmptySeat(
    title: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp),
        modifier = Modifier.clickable { onClick() }
    ) {
        Box(
            modifier = Modifier
                .size(54.dp)
                .clip(CircleShape)
                .background(CasinoSurfaceContainerHighest.copy(alpha = 0.5f))
                .border(1.dp, CasinoSurfaceContainerHighest, CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = title,
                tint = CasinoOnSurfaceVariant,
                modifier = Modifier.size(24.dp)
            )
        }

        Text(
            text = title,
            fontFamily = TajawalFontFamily,
            fontSize = 11.sp,
            color = CasinoOnSurfaceVariant
        )
    }
}

@Composable
private fun SettingPill(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    value: String,
    label: String,
    tint: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.clip(RoundedCornerShape(12.dp)),
        colors = CardDefaults.cardColors(containerColor = CasinoSurfaceContainerHigh)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 8.dp, horizontal = 4.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = tint,
                modifier = Modifier.size(18.dp)
            )
            Text(
                text = value,
                fontFamily = CairoFontFamily,
                fontWeight = FontWeight.Bold,
                fontSize = 15.sp,
                color = tint
            )
            Text(
                text = label,
                fontFamily = TajawalFontFamily,
                fontSize = 10.sp,
                color = CasinoOnSurfaceVariant
            )
        }
    }
}
