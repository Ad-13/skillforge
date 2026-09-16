import { createApp } from './app.ts'
import { env } from './config/env.ts'
import { disconnectPrisma, prisma } from './lib/prisma.ts'

const start = async (): Promise<void> => {
  // Fail loudly at boot rather than on a user's first request.
  await prisma.$queryRaw`SELECT 1`
  console.log('[skillforge] database reachable')

  const app = createApp()

  const server = app.listen(env.PORT, () => {
    console.log(`[skillforge] listening on ${env.BASE_URL} (${env.NODE_ENV})`)
  })

  const shutdown = (signal: string) => {
    console.log(`[skillforge] ${signal} received, shutting down`)
    server.close(() => {
      void disconnectPrisma().finally(() => process.exit(0))
    })
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

start().catch((error: unknown) => {
  console.error('[skillforge] failed to start:', error)
  process.exit(1)
})
