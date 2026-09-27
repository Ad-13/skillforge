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
import { Icon, type IconName } from '../../shared/icon'
import {
  matchesFilter,
  resourceHost,
  resourceHref,
  resourceHue,
  resourceIcon,
  resourceLabel,
  type ResourceFilter,
} from '../../shared/resource-display'
import type { Resource, ResourceStage, SkillResources } from '../../core/api.types'

const GENERAL = 'general'

const FILTERS: readonly { id: ResourceFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'DOCS', label: 'Docs' },
  { id: 'ARTICLE', label: 'Articles' },
  { id: 'VIDEO', label: 'Videos' },
  { id: 'NOTE', label: 'Notes' },
]

@Component({
  selector: 'sf-resources-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Rune, RuneLoader, Icon],
  templateUrl: './resources-page.html',
  styleUrl: './resources-page.css',
})
export class ResourcesPage {
  readonly slug = input.required<string>()

  private readonly api = inject(SkillForgeApi)
  protected readonly skills = inject(SkillsStore)

  protected readonly filters = FILTERS
  protected readonly general = GENERAL

  protected readonly resources = signal<SkillResources | null>(null)
  protected readonly loading = signal(true)
  protected readonly error = signal<string | null>(null)
  protected readonly missing = signal(false)
  protected readonly selectedId = signal<string | null>(null)
  protected readonly filter = signal<ResourceFilter>('all')

  protected readonly skill = computed(() => this.skills.bySlug(this.slug()))
  protected readonly title = computed(() => this.skill()?.name ?? this.slug())

  protected readonly selectedStage = computed<ResourceStage | null>(() => {
    const set = this.resources()
    const id = this.selectedId()
    if (!set || id === GENERAL) return null
    return set.stages.find((stage) => stage.id === id) ?? set.stages[0] ?? null
  })

  protected readonly showingGeneral = computed(() => this.selectedId() === GENERAL)

  protected readonly groups = computed(() => {
    const stage = this.selectedStage()
    if (!stage) return []
    const filter = this.filter()
    return stage.steps
      .map((step) => ({ step, items: step.resources.filter((item) => matchesFilter(item, filter)) }))
      .filter((group) => filter === 'all' || group.items.length > 0)
  })

  protected readonly generalItems = computed(() => {
    const filter = this.filter()
    return (this.resources()?.general ?? []).filter((item) => matchesFilter(item, filter))
  })

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
      const first =
        response.resources.stages.find((stage) => this.countIn(stage) > 0) ?? response.resources.stages[0]
      this.selectedId.set(first?.id ?? (response.resources.general.length > 0 ? GENERAL : null))
    } catch (error: unknown) {
      const message = describeHttpError(error)
      if (message === 'Not found.' || message === 'Skill not found') this.missing.set(true)
      else this.error.set(message)
    } finally {
      this.loading.set(false)
    }
  }

  protected select(id: string): void {
    this.selectedId.set(id)
  }

  protected countIn(stage: ResourceStage): number {
    return stage.steps.reduce((total, step) => total + step.resources.length, 0)
  }

  protected label(resource: Resource): string {
    return resourceLabel(resource)
  }

  protected icon(resource: Resource): IconName {
    return resourceIcon(resource)
  }

  protected hue(resource: Resource): string {
    return resourceHue(resource)
  }

  protected host(resource: Resource): string {
    return resourceHost(resource)
  }

  protected href(resource: Resource): string {
    return resourceHref(resource)
  }
}
