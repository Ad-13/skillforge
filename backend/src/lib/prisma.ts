import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.ts'
import { env } from '../config/env.ts'

/**
 * Prisma 7 dropped the Rust query engine: the client now talks to Postgres
 * through a driver adapter, which is why the connection string is handed to
 * `PrismaPg` rather than read from the schema at runtime.
 *
 * One client per process. Creating a client per request would open a new
 * connection pool each time and exhaust the database in minutes.
 */
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })

export const prisma = new PrismaClient({
  adapter,
  log: env.isProduction ? ['warn', 'error'] : ['warn', 'error'],
})

export const disconnectPrisma = async (): Promise<void> => {
  await prisma.$disconnect()
}
