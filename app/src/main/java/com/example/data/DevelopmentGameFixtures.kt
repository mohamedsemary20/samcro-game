package com.example.data

import com.example.data.model.ChatMessage
import com.example.data.model.Player
import com.example.data.model.PlayerStatusType
import com.example.data.model.TriviaQuestion

/** Static local fixtures for the UI preview and development build. */
object DevelopmentGameFixtures {
    // Default Avatar URLs from the project assets
    val avatarUser = "https://lh3.googleusercontent.com/aida-public/AB6AXuBpNdQzw7XB328n-doa-XGQmg4IsPGluBsY2uHdRr_8_hEsTn5jbaabgp4-bJW-3QbPPDynl6LB6PLoQTD-4jBfw1vvzr7T3hR2MIj_KeMNxQt7jUypSX3vJSTRi7mpCCRc92GE_4KVK7AhjXcjLkhiqNYQ9M5Kv8pYIPkds6ejAQ83a4UZYVh7uYlU1OUjHgYrh6RxvbJhkzAUqIk60WuNjdSC4KBSnklkbFtwbLQV0XRYeuVPrD_xtg"
    val avatarMaya = "https://lh3.googleusercontent.com/aida-public/AB6AXuB6IOz-j3Mdsm3Ch7wqBt91OVcb1JaJHVIIPvrZgu2GiqdaXKevuf13keCGMTgyCiZb7Unyvfaila4yFDuTQFl9rDpJQAt9-_G5cOsQJ3_2LAkrQUFr0rnXXFHNVnKF9o7XjsFM2Q8vzY3kzjUmMzeYYNXGRCohInojrM0-X1q0_fMhJUpwmJFtyvPGzvAmS2yYtRiM6lAf0O1KZ9Bu2c3ZofEbtfIaItVnSDDgZ0Wx_yTwkRZirwdgJA"
    val avatarKarim = "https://lh3.googleusercontent.com/aida-public/AB6AXuCxlH873vHScfRkaP-xQrywRc_MnqO29Rl6VQGBncw4l6EPfVMaCICotKOtpexECHIqWcrfRRtPR78vl52-hGA7WaYIKDQoLAvUNPZO2jRs0AkYPHaZqwm5tVsBYu9Ye0Hc9vTQ6iEGqJbU2NqY0ja91pK78Cis4QXkBlBLHJQR-1gLORcNlfPxBRoLLAngK1-fLGxe8B1WoGCWy2iSZP4sRn7R9Y7YNuEHZIqynD9NaDDvn_ZUfOewhw"
    val avatarOmar = "https://lh3.googleusercontent.com/aida-public/AB6AXuABhgqtDTXAPtf1O5Nvqo1f6Rx2XEo37aXrxbgOFjDPOLLQBH6xQ53Jhv15N560SaKcRzT-SgmN-UHk3Ug3kCCM81IhqeEloUdIBh7M50xkVlBbU1JsDNaoeKD1Ov0A6CuXK0ZPQ4boADnwQa_koOwSVbHvwU6EWcvRtzksU-_gVMpPw-696iFWM3FT5VDqS-N_53vHEV5kRDEc0GmxWYrCph9ibydJg0fBd3HQDR1439-juyYwICk-Pw"
    val avatarNour = "https://lh3.googleusercontent.com/aida-public/AB6AXuAzqaSDjyVPTkpiodgM8FP5T98B8ha883R8VjzTy9ztS5HO-4DXOkL1mvxI7NSAr02iiAE7r3aX39O6tjOwfvsPqkJdjl0KZHhzP8k0swqC8vw6HaeoOaowUT31rHxzTjdcQFQHcXiMNZGti5aS6NThjUFygSnI8GtJxW6OXy0XJyCR-k_NSyX4y7FpJjM_msyzt2JK-DLZfejDstBL7_nCW0YIjq3zIvdb95DUBrKRFYkLge0MFdNMCA"
    val avatarSara = "https://lh3.googleusercontent.com/aida-public/AB6AXuB0nwzfsakQ7nAPbnBX7Qh20oUJJDlf-4Ctn6CMtz3gUjbL3bukBXalRTGi-Op-klL7dkZMyyQMwCvwGSMicLM_pADDBvBZD7uERyXsddjACAOWHN3vCUU5QcW5IU69oj9n_0PQwqfkHo0XqOAy6M5BVyLqwd8dBfX2dBf0CTILiCmwtMPZN8UnRRRVr19pvpDI7CuscfPBdApEdCGRARwAr_F3yY8Y5CGiTYNB43RsvoirK_P-fy8Dpg"
    val avatarAhmed = "https://lh3.googleusercontent.com/aida-public/AB6AXuDsWtzfaIH5_P75gC6NvO_xiTw8veyhOxY9I-_vIX9DZCYupjt0lPvc5Zlt-ThiX3cpvUHM4fEFSCCJ6th5CCvmae9yBRYMc5US-QF3ZuZiEccMYcBFShl7f5m97spXgSRmtPxlelduaS5gtrhz7qZxdGOQl9TJ-q3WUR1s2Z5mOSlus1YA0Pc34IgnenZRnVKRVpcdhMOa1JWJ6qrtjWP6KRnj2Ot699LY6yod64VFEoaSZZ7o0lNjgg"

    val questions: List<TriviaQuestion> = listOf(
        TriviaQuestion(
            roundNumber = 1,
            questionText = "ما عدد سكان كندا تقريباً في عام ٢٠٢٠؟",
            realAnswer = 38005238L,
            standardHintRange = "30,000,000 – 40,000,000",
            goldenHintAnswer = "38,005,238",
            standardAccuracy = "دقة تكتيكية ٦٥٪",
            advisoryNote = "انتبه! قد يكون هذا النطاق حقيقياً أو فخاً مضللاً وضعته اللعبة لاختبار ثقتك وبلوفك أمام الخصوم."
        ),
        TriviaQuestion(
            roundNumber = 2,
            questionText = "كم يبلغ طول نهر النيل العظيم بالكيلومترات؟",
            realAnswer = 6650L,
            standardHintRange = "6,000 – 7,500",
            goldenHintAnswer = "6,650",
            standardAccuracy = "دقة تكتيكية ٧٠٪",
            advisoryNote = "تحقق من تقديرات خصومك، بعضهم قد يبالغ لرفع قيمة الوعاء!"
        ),
        TriviaQuestion(
            roundNumber = 3,
            questionText = "ما هي مساحة المملكة العربية السعودية بالكيلومتر المربع؟",
            realAnswer = 2149690L,
            standardHintRange = "1,800,000 – 2,500,000",
            goldenHintAnswer = "2,149,690",
            standardAccuracy = "دقة تكتيكية ٦٨٪",
            advisoryNote = "جولة حاسمة: الرهان هنا سيكشف من يلعب بذكاء ومن يخادع."
        ),
        TriviaQuestion(
            roundNumber = 4,
            questionText = "كم عدد الأيام التي يستغرقها كوكب عطارد للدوران حول الشمس؟",
            realAnswer = 88L,
            standardHintRange = "70 – 110",
            goldenHintAnswer = "88",
            standardAccuracy = "دقة تكتيكية ٧٥٪",
            advisoryNote = "الأرقام الصغيرة تضيق الفارق، كل رقم إضافي قد يحسم الفوز!"
        ),
        TriviaQuestion(
            roundNumber = 5,
            questionText = "ما هو الارتفاع القياسي لبرج خليفة بالأمتار؟",
            realAnswer = 828L,
            standardHintRange = "750 – 900",
            goldenHintAnswer = "828",
            standardAccuracy = "دقة تكتيكية ٨٠٪",
            advisoryNote = "الجولة الختامية! الوعاء مضاعف والفائز سيحصد لقب العراب!"
        )
    )
    val chatMessages: List<ChatMessage> = listOf(
            ChatMessage("1", "Maya", "مستعدين للتحدي! لا أحد يخمن عشوائي هالمرة 😉", false, 0xFFFFE4A9),
            ChatMessage("2", "Omar", "الرهان مضاعف يا شباب 🔥", false, 0xFF4EDEA3)
        )
    val players: List<Player> = listOf(
            Player(id = "1", name = "Maya", avatarUrl = avatarMaya, chips = 1850, currentBet = 1200, statusText = "رفعت", statusType = PlayerStatusType.RAISED, guess = 38100000L),
            Player(id = "2", name = "أنت", avatarUrl = avatarUser, chips = 1320, currentBet = 450, statusText = "دورك", statusType = PlayerStatusType.READY, isUser = true, guess = 35000000L),
            Player(id = "3", name = "Karim", avatarUrl = avatarKarim, chips = 680, currentBet = 800, statusText = "تأكيد", statusType = PlayerStatusType.CONFIRMED, guess = 42000000L),
            Player(id = "4", name = "Ahmed", avatarUrl = avatarAhmed, chips = 920, currentBet = 200, statusText = "انسحب", statusType = PlayerStatusType.FOLDED, hasFolded = true, guess = 29000000L),
            Player(id = "5", name = "Omar", avatarUrl = avatarOmar, chips = 450, currentBet = 1000, statusText = "تم كشف بلوفه!", statusType = PlayerStatusType.BLUFF_BUSTED, isBluffing = true, guess = 50000000L),
            Player(id = "6", name = "Nour", avatarUrl = avatarNour, chips = 310, currentBet = 450, statusText = "مساواة", statusType = PlayerStatusType.CALLED, guess = 32000000L)
        )
}
