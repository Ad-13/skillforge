import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core'
import { Router, RouterLink } from '@angular/router'
import { SkillForgeApi, describeHttpError } from '../../core/skillforge-api'
import { SkillsStore } from '../../core/skills.store'
import { RuneLoader } from '../../shared/rune-loader'
import { Rune } from '../../shared/rune'
import { parseHandover } from '../../core/handover'
import type { Skill } from '../../core/api.types'

type Phase = 'working' | 'done' | 'empty' | 'error'

@Component({
  selector: 'sf-handover-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Rune, RuneLoader],
  templateUrl: './handover-page.html',
  styleUrl: './handover-page.css',
})
export class HandoverPage implements OnInit {
  private readonly api = inject(SkillForgeApi)
  private readonly skills = inject(SkillsStore)
  private readonly router = inject(Router)

  protected readonly phase = signal<Phase>('working')
  protected readonly names = signal<string[]>([])
  protected readonly imported = signal<Skill[]>([])
  protected readonly error = signal<string | null>(null)

  ngOnInit(): void {
    void this.run()
  }

  private async run(): Promise<void> {
    const { skills } = parseHandover(window.location.search)
    this.names.set(skills)

    if (skills.length === 0) {
      this.phase.set('empty')
      return
    }

    try {
      const response = await this.api.importSkills(skills)
      this.imported.set(response.skills)
      await this.skills.load(true)

      if (response.skills.length === 1) {
        const only = response.skills[0] as Skill
        await this.router.navigate(['/skills', only.slug], { replaceUrl: true })
        return
      }

      this.phase.set('done')
      await this.router.navigate(['/'], {
        replaceUrl: true,
        state: { importedSlugs: response.skills.map((skill) => skill.slug) },
      })
    } catch (error: unknown) {
      this.error.set(describeHttpError(error))
      this.phase.set('error')
    }
  }

  protected retry(): void {
    this.phase.set('working')
    this.error.set(null)
    void this.run()
  }
}
