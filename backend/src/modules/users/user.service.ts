import { userRepository, type UpsertFromIdentityInput } from './user.repository.ts'
import { NotFoundError } from '../../lib/errors.ts'
import type { User } from '../../generated/prisma/client.ts'

export interface PublicUser {
  id: string
  sub: string
  email: string | null
  displayName: string | null
  pictureUrl: string | null
  onboarded: boolean
  createdAt: string
}

const toPublicUser = (user: User): PublicUser => ({
  id: user.id,
  sub: user.authSub,
  email: user.email,
  displayName: user.displayName,
  pictureUrl: user.pictureUrl,
  onboarded: user.onboardedAt !== null,
  createdAt: user.createdAt.toISOString(),
})

export const userService = {
  async provisionFromIdentity(input: UpsertFromIdentityInput): Promise<User> {
    return userRepository.upsertFromIdentity(input)
  },

  async getBySub(sub: string): Promise<PublicUser | null> {
    const user = await userRepository.findByAuthSub(sub)
    return user ? toPublicUser(user) : null
  },

  async getBySubOrThrow(sub: string): Promise<PublicUser> {
    const user = await this.getBySub(sub)
    if (!user) throw new NotFoundError('User not found')
    return user
  },

  async completeOnboarding(id: string): Promise<PublicUser> {
    const user = await userRepository.markOnboarded(id)
    return toPublicUser(user)
  },
}

export { toPublicUser }
