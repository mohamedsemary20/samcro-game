import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/** Unverified development examples copied from the original web demo; intentionally disabled. */
const examples = [
  {
    id: 'dev-ar-ca-population-2020',
    promptAr: 'مثال تجريبي غير معتمد: ما عدد سكان كندا تقريباً في عام ٢٠٢٠؟',
    answer: 38_005_238n,
    category: 'جغرافيا',
    type: 'number',
  },
  {
    id: 'dev-ar-nile-length',
    promptAr: 'مثال تجريبي غير معتمد: كم يبلغ طول نهر النيل بالكيلومترات؟',
    answer: 6_650n,
    category: 'جغرافيا',
    type: 'number',
  },
  {
    id: 'dev-ar-mercury-orbit',
    promptAr: 'مثال تجريبي غير معتمد: كم يوماً تستغرق دورة عطارد حول الشمس؟',
    answer: 88n,
    category: 'علوم',
    type: 'number',
  },
]

try {
  if (process.env.NODE_ENV === 'production') throw new Error('The development question seed cannot run in production.')
  for (const item of examples) {
    await prisma.question.upsert({
      where: { id: item.id },
      create: { ...item, enabled: false, difficulty: 'development-only', source: 'Unverified demo fixture; do not use for competitive games.' },
      update: { ...item, enabled: false, difficulty: 'development-only', source: 'Unverified demo fixture; do not use for competitive games.' },
    })
  }
  console.info(`Inserted ${examples.length} disabled, unverified development questions.`)
} finally {
  await prisma.$disconnect()
}
