import 'dotenv/config'
import { defineConfig } from 'prisma/config'

/**
 * Prisma 7 reads CLI configuration from this file instead of from the
 * schema block and ad-hoc environment lookups.
 *
 * Migrations deliberately do NOT go through Neon's pooled endpoint.
 * The pooler runs PgBouncer in transaction mode, where a connection is
 * handed back to the pool after every transaction. Prisma Migrate relies on
 * session state that must survive between statements — a session-level
 * advisory lock that stops two deploys from migrating at the same time, plus
 * `SET` statements — and transaction mode cannot keep that state. The result
 * is a migration that hangs instead of failing loudly.
 *
 * So: DIRECT_URL (the endpoint WITHOUT "-pooler") for the CLI here,
 * DATABASE_URL (the endpoint WITH "-pooler") for the running application in
 * src/lib/prisma.ts. Falling back to DATABASE_URL keeps a single-URL setup
 * working for anyone who has not split the two yet.
 */
const migrationUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL

if (migrationUrl === undefined || migrationUrl.length === 0) {
  throw new Error('Set DIRECT_URL (preferred) or DATABASE_URL before running Prisma CLI commands')
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: migrationUrl,
  },
})
