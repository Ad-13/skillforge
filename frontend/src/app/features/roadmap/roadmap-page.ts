import {
  Component,
  ChangeDetectionStrategy,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core'
import { RouterLink } from '@angular/router'
import { SkillForgeApi, describeHttpError } from '../../core/skillforge-api'
import { SkillsStore } from '../../core/skills.store'
import { RuneLoader } from '../../shared/rune-loader'
import { Rune } from '../../shared/rune'
import type { Roadmap, RoadmapStage, RoadmapStep } from '../../core/api.types'

@Component({
  selector: 'sf-roadmap-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Rune, RuneLoader],
  templateUrl: './roadmap-page.html',
  styleUrl: './roadmap-page.css',
})
export class RoadmapPage {
  readonly slug = input.required<string>()

  private readonly api = inject(SkillForgeApi)
  protected readonly skills = inject(SkillsStore)

  protected readonly roadmap = signal<Roadmap | null>(null)
  protected readonly loading = signal(true)
  protected readonly forging = signal(false)
  protected readonly pendingStepId = signal<string | null>(null)
  protected readonly error = signal<string | null>(null)
  protected readonly missing = signal(false)
  protected readonly added = signal<string[]>([])

  private readonly openStageIds = signal<ReadonlySet<string>>(new Set<string>())

  protected readonly skill = computed(() => this.skills.bySlug(this.slug()))
  protected readonly title = computed(() => this.skill()?.name ?? this.slug())

  protected readonly percent = computed(() =>
    Math.round((this.roadmap()?.progress ?? 0) * 100),
  )

  protected readonly generatedAt = computed(() => {
    const at = this.roadmap()?.generatedAt
    return at ? new Date(at).toLocaleString() : null
  })

  protected readonly stageCount = computed(() => this.roadmap()?.stages.length ?? 0)
  protected readonly openCount = computed(() => {
    const open = this.openStageIds()
    return (this.roadmap()?.stages ?? []).filter((stage) => open.has(stage.id)).length
  })
  protected readonly allOpen = computed(
    () => this.stageCount() > 0 && this.openCount() === this.stageCount(),
  )

  constructor() {
    void this.skills.load()

    effect(() => {
      const slug = this.slug()
      void this.fetch(slug)
    })
  }

  private async fetch(slug: string): Promise<void> {
    this.loading.set(true)
    this.error.set(null)
    this.missing.set(false)

    try {
      const response = await this.api.getRoadmap(slug)
      this.roadmap.set(response.roadmap)
      this.openStageIds.set(new Set<string>())
    } catch (error: unknown) {
      const message = describeHttpError(error)
      if (message === 'Not found.' || message === 'Skill not found') this.missing.set(true)
      else this.error.set(message)
    } finally {
      this.loading.set(false)
    }
  }

  protected isOpen(stageId: string): boolean {
    return this.openStageIds().has(stageId)
  }

  protected toggleStage(stageId: string): void {
    const next = new Set(this.openStageIds())
    if (!next.delete(stageId)) next.add(stageId)
    this.openStageIds.set(next)
  }

  protected toggleAll(): void {
    if (this.allOpen()) {
      this.openStageIds.set(new Set<string>())
      return
    }
    this.openStageIds.set(new Set((this.roadmap()?.stages ?? []).map((stage) => stage.id)))
  }

  protected doneIn(stage: RoadmapStage): number {
    return stage.steps.filter((step) => step.complete).length
  }

  protected stagePercent(stage: RoadmapStage): number {
    if (stage.steps.length === 0) return 0
    return Math.round((this.doneIn(stage) / stage.steps.length) * 100)
  }

  protected async forge(): Promise<void> {
    if (this.forging()) return

    const existing = this.roadmap()
    if (existing && existing.completedSteps > 0) {
      const ok = confirm(
        `Regenerating replaces this plan. ${existing.completedSteps} completed step(s) will be lost. Continue?`,
      )
      if (!ok) return
    }

    this.forging.set(true)
    this.error.set(null)
    this.added.set([])

    try {
      const response = await this.api.forgeRoadmap(this.slug())
      this.roadmap.set(response.roadmap)
      this.openStageIds.set(new Set<string>())
      this.added.set(response.added)
      void this.skills.load(true)
    } catch (error: unknown) {
      this.error.set(describeHttpError(error))
    } finally {
      this.forging.set(false)
    }
  }

  protected async toggle(step: RoadmapStep): Promise<void> {
    if (this.pendingStepId() !== null) return

    this.pendingStepId.set(step.id)
    this.error.set(null)

    try {
      const response = await this.api.setStepComplete(this.slug(), step.id, !step.complete)
      this.roadmap.set(response.roadmap)
      void this.skills.load(true)
    } catch (error: unknown) {
      this.error.set(describeHttpError(error))
    } finally {
      this.pendingStepId.set(null)
    }
  }
}
