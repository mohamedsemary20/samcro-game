import { PrismaClient } from '@prisma/client';
import { importLocalTestQuestionPool } from '../src/questions/localTestQuestionPool.js';
async function main() {
    const prisma = new PrismaClient();
    try {
        const result = await importLocalTestQuestionPool(prisma);
        console.info(JSON.stringify({ pool: 'local-development-only', ...result, productionApprovalsChanged: 0 }));
    }
    finally {
        await prisma.$disconnect();
    }
}
main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Local test question pool import failed.');
    process.exitCode = 1;
});
