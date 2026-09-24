import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { Router, RouterLink } from '@angular/router'
import { SkillsStore } from '../../core/skills.store'
import { Rune } from '../../shared/rune'
import { RuneLoader } from '../../shared/rune-loader'
import { runeForSlug } from '../../shared/runes'
import type { Skill } from '../../core/api.types'

@Component({
  selector: 'sf-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, FormsModule, RouterLink, Rune, RuneLoader],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  protected readonly store = inject(SkillsStore)
  private readonly router = inject(Router)

  protected readonly draft = signal('')
  protected readonly adding = signal(false)
  protected readonly runeFor = runeForSlug

  protected readonly justImported = signal<ReadonlySet<string>>(new Set<string>())

  protected readonly all = computed(() => this.store.skills())

  protected readonly active = computed(() =>
    this.all().filter((skill) => skill.hasRoadmap && skill.progress > 0 && skill.progress < 1),
  )

  protected readonly planned = computed(() =>
    this.all().filter((skill) => skill.hasRoadmap && skill.progress === 0),
  )

  protected readonly finished = computed(() =>
    this.all().filter((skill) => skill.hasRoadmap && skill.progress >= 1),
  )

  protected readonly untouched = computed(() => this.all().filter((skill) => !skill.hasRoadmap))

  protected readonly totalSteps = computed(() =>
    this.all().reduce((sum, skill) => sum + skill.totalSteps, 0),
  )

  protected readonly doneSteps = computed(() =>
    this.all().reduce((sum, skill) => sum + skill.completedSteps, 0),
  )

  protected readonly overall = computed(() => {
    const total = this.totalSteps()
    return total === 0 ? 0 : Math.round((this.doneSteps() / total) * 100)
  })

  protected readonly resume = computed(() => {
    const candidates = this.all().filter(
      (skill) => skill.nextStep !== null && skill.lastActivityAt !== null,
    )
    if (candidates.length === 0) return null

    return candidates.reduce((latest, skill) =>
      (skill.lastActivityAt ?? '') > (latest.lastActivityAt ?? '') ? skill : latest,
    )
  })

  constructor() {
    const state = this.router.getCurrentNavigation()?.extras.state as
      | { importedSlugs?: string[] }
      | undefined

    if (state?.importedSlugs) this.justImported.set(new Set(state.importedSlugs))
  }

  ngOnInit(): void {
    void this.store.load()
  }

  protected percent(skill: Skill): number {
    return Math.round(skill.progress * 100)
  }

  protected isNew(skill: Skill): boolean {
    return this.justImported().has(skill.slug)
  }

  protected async submit(): Promise<void> {
    if (this.adding()) return
    this.adding.set(true)
    try {
      const skill = await this.store.add(this.draft())
      if (skill) this.draft.set('')
    } finally {
      this.adding.set(false)
    }
  }

  protected async accept(): Promise<void> {
    const skill = await this.store.acceptSuggestion()
    if (skill) this.draft.set('')
  }

  protected async remove(event: Event, slug: string): Promise<void> {
    event.preventDefault()
    event.stopPropagation()
    await this.store.remove(slug)
  }
}
