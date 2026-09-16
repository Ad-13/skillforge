import { prisma } from '../../lib/prisma.ts'
import type { User } from '../../generated/prisma/client.ts'

export interface UpsertFromIdentityInput {
  authSub: string
  email: string | null
  displayName: string | null
  pictureUrl: string | null
}

/**
 * The repository is the only layer that knows Prisma exists. Services above
 * it speak in domain terms, so swapping the ORM — or adding a cache — never
 * reaches business logic.
 */
export const userRepository = {
  /**
   * Just-in-time provisioning.
   *
   * There is no registration endpoint in this application: people register
   * with the identity provider. The row appears here on the first successful
   * login and is refreshed on every later one, which keeps the local
   * projection of name and email current without any synchronisation job.
   */
  async upsertFromIdentity(input: UpsertFromIdentityInput): Promise<User> {
    const now = new Date()

    return prisma.user.upsert({
      where: { authSub: input.authSub },
      create: {
        authSub: input.authSub,
        email: input.email,
        displayName: input.displayName,
        pictureUrl: input.pictureUrl,
        lastLoginAt: now,
      },
      update: {
        email: input.email,
        displayName: input.displayName,
        pictureUrl: input.pictureUrl,
        lastLoginAt: now,
      },
    })
  },

  findByAuthSub(authSub: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { authSub } })
  },

  findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } })
  },

  markOnboarded(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { onboardedAt: new Date() },
    })
  },
}
