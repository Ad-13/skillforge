import { prisma } from '../../lib/prisma.ts'
import type { User } from '../../generated/prisma/client.ts'

export interface UpsertFromIdentityInput {
  authSub: string
  email: string | null
  displayName: string | null
  pictureUrl: string | null
}

export const userRepository = {
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
