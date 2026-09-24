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
import type { Resource, ResourceSourceType, ResourceStage, SkillResources } from '../../core/api.types'

const SOURCE_LABEL: Record<ResourceSourceType, string> = {
  DOCS: 'docs',
  ARTICLE: 'article',
  VIDEO: 'video',
  REPO: 'repo',
  COURSE: 'course',
}

@Component({
  selector: 'sf-resources-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Rune, RuneLoader],
  templateUrl: './resources-page.html',
  styleUrl: './resources-page.css',
})
export class ResourcesPage {
  readonly slug = input.required<string>()

  private readonly api = inject(SkillForgeApi)
  protected readonly skills = inject(SkillsStore)

  protected readonly resources = signal<SkillResources | null>(null)
  protected readonly loading = signal(true)
  protected readonly error = signal<string | null>(null)
  protected readonly missing = signal(false)

  private readonly openStageIds = signal<ReadonlySet<string>>(new Set<string>())

  protected readonly skill = computed(() => this.skills.bySlug(this.slug()))
  protected readonly title = computed(() => this.skill()?.name ?? this.slug())

  protected readonly stageCount = computed(() => this.resources()?.stages.length ?? 0)
  protected readonly openCount = computed(() => {
    const open = this.openStageIds()
    return (this.resources()?.stages ?? []).filter((stage) => open.has(stage.id)).length
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
      const response = await this.api.getResources(slug)
      this.resources.set(response.resources)
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
    this.openStageIds.set(new Set((this.resources()?.stages ?? []).map((stage) => stage.id)))
  }

  protected countIn(stage: ResourceStage): number {
    return stage.steps.reduce((total, step) => total + step.resources.length, 0)
  }

  protected sourceLabel(resource: Resource): string {
    return resource.sourceType ? SOURCE_LABEL[resource.sourceType] : 'link'
  }

  protected hrefFor(resource: Resource): string {
    if (resource.url) return resource.url
    const query = encodeURIComponent(resource.searchQuery ?? resource.title)
    return `https://duckduckgo.com/?q=${query}`
  }

}
