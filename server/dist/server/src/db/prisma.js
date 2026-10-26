import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger.js';
export const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});
export async function disconnectDatabase() {
    await prisma.$disconnect();
    logger.info('database_disconnected');
}
