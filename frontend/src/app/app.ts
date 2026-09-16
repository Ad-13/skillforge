import { Component, inject, signal, computed, OnInit } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { SkillForgeApi } from './skill.service'
import type { CurrentUser, Skill, SkillLevel } from './api.types'

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private readonly api = inject(SkillForgeApi)

  protected readonly user = signal<CurrentUser | null>(null)
  protected readonly peerAppUrl = signal<string | null>(null)
  protected readonly skills = signal<Skill[]>([])
  protected readonly loading = signal(true)
  protected readonly saving = signal(false)
  protected readonly error = signal<string | null>(null)

  protected readonly levels: readonly SkillLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED']

  protected draftName = ''
  protected draftLevel: SkillLevel = 'BEGINNER'

  protected readonly canSubmit = computed(() => !this.saving())

  ngOnInit(): void {
    this.api.me().subscribe({
      next: (response) => {
        this.user.set(response.user)
        this.peerAppUrl.set(response.peerAppUrl)
        this.loadSkills()
        this.loading.set(false)
      },
      error: () => {
        this.user.set(null)
        this.loading.set(false)
      },
    })
  }

  protected addSkill(): void {
    const name = this.draftName.trim()
    if (name.length === 0 || this.saving()) return

    this.saving.set(true)
    this.error.set(null)

    this.api.addSkill(name, this.draftLevel).subscribe({
      next: (response) => {
        this.skills.update((current) =>
          [...current, response.skill].sort((a, b) => a.name.localeCompare(b.name)),
        )
        this.draftName = ''
        this.saving.set(false)
      },
      error: (err: unknown) => {
        this.error.set(this.describe(err))
        this.saving.set(false)
      },
    })
  }

  protected removeSkill(id: string): void {
    this.api.removeSkill(id).subscribe({
      next: () => this.skills.update((current) => current.filter((skill) => skill.id !== id)),
      error: (err: unknown) => this.error.set(this.describe(err)),
    })
  }

  private loadSkills(): void {
    this.api.listSkills().subscribe({
      next: (response) => this.skills.set(response.skills),
      error: (err: unknown) => this.error.set(this.describe(err)),
    })
  }

  private describe(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const body = (error as { error?: { message?: string } }).error
      if (body?.message) return body.message
    }
    return 'Request failed'
  }
}
