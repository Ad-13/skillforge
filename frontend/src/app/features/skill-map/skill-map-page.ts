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
import { SkillTree } from './skill-tree'
import { LENSES, type LensDescriptor, type MapLens, type SkillMap } from '../../core/api.types'

@Component({
  selector: 'sf-skill-map-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Rune, RuneLoader, SkillTree],
  templateUrl: './skill-map-page.html',
  styleUrl: './skill-map-page.css',
})
export class SkillMapPage {
  readonly slug = input.required<string>()

  private readonly api = inject(SkillForgeApi)
  protected readonly skills = inject(SkillsStore)

  protected readonly lenses = LENSES
  protected readonly lens = signal<LensDescriptor>(LENSES[0] as LensDescriptor)

  private readonly cache = signal<{
    slug: string
    maps: Partial<Record<MapLens, SkillMap | null>>
  }>({ slug: '', maps: {} })

  protected readonly loading = signal(false)
  protected readonly generating = signal(false)
  protected readonly pendingNodeId = signal<string | null>(null)
  protected readonly error = signal<string | null>(null)
  protected readonly missing = signal(false)
  protected readonly lastEmpty = signal<string | null>(null)
  protected readonly promotingNodeId = signal<string | null>(null)
  protected readonly promoted = signal<string | null>(null)

  protected readonly map = computed(() => {
    const cache = this.cache()
    return cache.slug === this.slug() ? (cache.maps[this.lens().lens] ?? null) : null
  })
  protected readonly skill = computed(() => this.skills.bySlug(this.slug()))
  protected readonly title = computed(() => this.skill()?.name ?? this.slug())

  protected readonly generatedAt = computed(() => {
    const at = this.map()?.generatedAt
    return at ? new Date(at).toLocaleString() : null
  })

  constructor() {

    void this.skills.load()

    effect(() => {

      const slug = this.slug()
      const lens = this.lens()
      void this.fetch(slug, lens)
    })
  }

  private store(slug: string, lens: MapLens, map: SkillMap | null): void {
    this.cache.update((current) =>
      current.slug === slug
        ? { slug, maps: { ...current.maps, [lens]: map } }
        : { slug, maps: { [lens]: map } },
    )
  }

  protected selectLens(lens: LensDescriptor): void {
    if (this.generating() || this.pendingNodeId() !== null) return
    this.lens.set(lens)
  }

  private async fetch(slug: string, lens: LensDescriptor): Promise<void> {
    const cached = this.cache()

    if (cached.slug !== slug) {
      this.cache.set({ slug, maps: {} })
      this.error.set(null)
      this.lastEmpty.set(null)
      this.promoted.set(null)
    } else if (cached.maps[lens.lens] !== undefined) {
      return
    }

    this.loading.set(true)
    this.error.set(null)
    this.missing.set(false)

    try {
      const response = await this.api.getMap(slug, lens.path)
      this.store(slug, lens.lens, response.map)
    } catch (error: unknown) {

      const message = describeHttpError(error)
      if (message === 'Not found.' || message === 'Skill not found') this.missing.set(true)
      else this.error.set(message)
    } finally {
      this.loading.set(false)
    }
  }

  protected async generate(): Promise<void> {
    if (this.generating()) return

    const lens = this.lens()
    this.generating.set(true)
    this.error.set(null)
    this.lastEmpty.set(null)

    try {
      const response = await this.api.generateMap(this.slug(), lens.path)
      this.store(this.slug(), lens.lens, response.map)
      this.skills.markHasMap(this.slug())
    } catch (error: unknown) {
      this.error.set(describeHttpError(error))
    } finally {
      this.generating.set(false)
    }
  }

  protected async expand(nodeId: string): Promise<void> {
    if (this.pendingNodeId() !== null) return

    const lens = this.lens()
    this.pendingNodeId.set(nodeId)
    this.error.set(null)
    this.lastEmpty.set(null)

    try {
      const response = await this.api.expandNode(this.slug(), lens.path, nodeId)
      this.store(this.slug(), lens.lens, response.map)

      if (response.added === 0) {
        this.lastEmpty.set('Nothing further — this is where that branch ends.')
      }
    } catch (error: unknown) {
      this.error.set(describeHttpError(error))
    } finally {
      this.pendingNodeId.set(null)
    }
  }

  protected async promote(nodeId: string): Promise<void> {
    if (this.promotingNodeId() !== null || this.pendingNodeId() !== null) return

    const lens = this.lens()
    this.promotingNodeId.set(nodeId)
    this.error.set(null)
    this.lastEmpty.set(null)
    this.promoted.set(null)

    try {
      const response = await this.api.promoteNode(this.slug(), lens.path, nodeId)
      this.cache.set({ slug: this.slug(), maps: { [lens.lens]: response.map } })

      this.promoted.set(
        response.alsoLinked > 0
          ? `Added to your skills, and linked on ${response.alsoLinked} other node(s).`
          : 'Added to your skills.',
      )

      void this.skills.load(true)
    } catch (error: unknown) {
      this.error.set(describeHttpError(error))
    } finally {
      this.promotingNodeId.set(null)
    }
  }
}
