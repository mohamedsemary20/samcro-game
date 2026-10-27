import { createServer } from 'node:http'
import { app } from './http/app.js'
import { env } from './config/env.js'
import { logger } from './config/logger.js'
import { disconnectDatabase } from './db/prisma.js'
import { prisma } from './db/prisma.js'
import { expireDisconnectedLobbyMembers, getRoomSnapshot } from './rooms/roomService.js'
import { attachSocketServer } from './realtime/socketServer.js'
import { assertLiveLocalTestPoolDatabase, assertLocalTestPoolEnvironment } from './questions/localTestQuestionPool.js'

if (env.SAMKARO_ENABLE_TEST_QUESTION_POOL === '1') {
  assertLocalTestPoolEnvironment({
    NODE_ENV: env.NODE_ENV,
    DATABASE_URL: env.DATABASE_URL,
    SAMKARO_ENABLE_TEST_QUESTION_POOL: env.SAMKARO_ENABLE_TEST_QUESTION_POOL,
  })
  await assertLiveLocalTestPoolDatabase(async () => {
    const result = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`
    return result[0]?.name ?? ''
  })
}

const httpServer = createServer(app)
const io = attachSocketServer(httpServer)

let runningRoomMaintenance = false
const maintenanceTimer = setInterval(() => {
  if (runningRoomMaintenance) return
  runningRoomMaintenance = true
  void expireDisconnectedLobbyMembers().then(async (roomIds) => {
    for (const roomId of roomIds) {
      const room = await getRoomSnapshot(roomId)
      if (room) io.to(`room:${roomId}`).emit('room:state', room)
    }
  }).catch((error: unknown) => logger.error('room_maintenance_failed', { errorType: error instanceof Error ? error.name : 'unknown' }))
    .finally(() => { runningRoomMaintenance = false })
}, 5_000)
maintenanceTimer.unref()

httpServer.listen(env.PORT, () => logger.info('server_started', { port: env.PORT, environment: env.NODE_ENV }))

async function shutdown(signal: string): Promise<void> {
  logger.info('server_shutdown_started', { signal })
  clearInterval(maintenanceTimer)
  await new Promise<void>((resolve) => io.close(() => resolve()))
  await disconnectDatabase()
  process.exit(0)
}

process.once('SIGINT', () => void shutdown('SIGINT'))
process.once('SIGTERM', () => void shutdown('SIGTERM'))
