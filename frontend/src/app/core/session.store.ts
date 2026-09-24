import { Injectable, computed, inject, signal } from '@angular/core'
import { SkillForgeApi, describeHttpError, isUnauthorized } from './skillforge-api'
import type { CurrentUser } from './api.types'

export type SessionStatus = 'idle' | 'loading' | 'authenticated' | 'anonymous' | 'error'

@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly api = inject(SkillForgeApi)

  readonly status = signal<SessionStatus>('idle')
  readonly user = signal<CurrentUser | null>(null)
  readonly peerAppUrl = signal<string | null>(null)
  readonly error = signal<string | null>(null)

  readonly isAuthenticated = computed(() => this.status() === 'authenticated')
  readonly isResolved = computed(() => this.status() !== 'idle' && this.status() !== 'loading')

  readonly displayName = computed(() => {
    const user = this.user()
    if (!user) return null
    return user.displayName ?? user.email ?? user.sub
  })

  async load(): Promise<void> {
    if (this.status() === 'loading') return

    this.status.set('loading')
    this.error.set(null)

    try {
      const response = await this.api.me()
      this.user.set(response.user)
      this.peerAppUrl.set(response.peerAppUrl)
      this.status.set('authenticated')
    } catch (error: unknown) {
      this.user.set(null)

      this.status.set(isUnauthorized(error) ? 'anonymous' : 'error')

      if (!isUnauthorized(error)) this.error.set(describeHttpError(error))
    }
  }
}
