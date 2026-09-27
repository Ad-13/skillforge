import {
  Component,
  ChangeDetectionStrategy,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Router, RouterLink } from '@angular/router'
import { SkillForgeApi, describeHttpError } from '../../core/skillforge-api'
import { RuneLoader } from '../../shared/rune-loader'
import { Rune } from '../../shared/rune'
import { Markdown } from '../../shared/markdown'
import { Icon, type IconName } from '../../shared/icon'
import { resourceHost, resourceHref, resourceHue, resourceIcon, resourceLabel } from '../../shared/resource-display'
import { SkillsStore } from '../../core/skills.store'
import type { Resource, ResourceSourceType, StepWorkspace } from '../../core/api.types'

type Tab = 'links' | 'notes'

type Editor =
  | { mode: 'closed' }
  | { mode: 'note'; id: string | null; title: string; content: string }
  | { mode: 'link'; title: string; url: string; sourceType: ResourceSourceType }

@Component({
  selector: 'sf-step-resources-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, Rune, RuneLoader, Markdown, Icon],
  templateUrl: './step-resources-page.html',
  styleUrl: './step-resources-page.css',
})
export class StepResourcesPage {
  readonly slug = input.required<string>()
  readonly stepId = input.required<string>()

  private readonly api = inject(SkillForgeApi)
  private readonly router = inject(Router)
  private readonly skills = inject(SkillsStore)

  protected readonly sourceTypes: ResourceSourceType[] = [
    'DOCS',
    'ARTICLE',
    'VIDEO',
    'REPO',
    'COURSE',
  ]

  protected readonly workspace = signal<StepWorkspace | null>(null)
  protected readonly loading = signal(true)
  protected readonly forging = signal(false)
  protected readonly saving = signal(false)
  protected readonly removingId = signal<string | null>(null)
  protected readonly error = signal<string | null>(null)
  protected readonly missing = signal(false)
  protected readonly notice = signal<string | null>(null)

  protected readonly tab = signal<Tab>('links')
  protected readonly completing = signal(false)

  protected readonly editor = signal<Editor>({ mode: 'closed' })
  private readonly openNoteIds = signal<ReadonlySet<string>>(new Set<string>())

  protected readonly title = computed(() => this.workspace()?.step.title ?? 'Step')

  constructor() {
    effect(() => {
      const slug = this.slug()
      const stepId = this.stepId()
      void this.fetch(slug, stepId)
    })
  }

  private async fetch(slug: string, stepId: string): Promise<void> {
    this.loading.set(true)
    this.error.set(null)
    this.missing.set(false)
    this.editor.set({ mode: 'closed' })
    this.openNoteIds.set(new Set<string>())

    try {
      const response = await this.api.getStepResources(slug, stepId)
      this.workspace.set(response.step)
    } catch (error: unknown) {
      const message = describeHttpError(error)
      if (message === 'Not found.' || message.endsWith('not found')) this.missing.set(true)
      else this.error.set(message)
    } finally {
      this.loading.set(false)
    }
  }

  private async reload(): Promise<void> {
    const response = await this.api.getStepResources(this.slug(), this.stepId())
    this.workspace.set(response.step)
  }

  protected isNoteOpen(id: string): boolean {
    return this.openNoteIds().has(id)
  }

  protected toggleNote(id: string): void {
    const next = new Set(this.openNoteIds())
    if (!next.delete(id)) next.add(id)
    this.openNoteIds.set(next)
  }

  protected sourceLabel(resource: Resource): string {
    return resourceLabel(resource)
  }


  protected iconFor(resource: Resource): IconName {
    return resourceIcon(resource)
  }


  protected hueFor(resource: Resource): string {
    return resourceHue(resource)
  }


  protected hostOf(resource: Resource): string {
    return resourceHost(resource)
  }


  protected async toggleComplete(): Promise<void> {
    const ws = this.workspace()
    if (!ws || this.completing()) return

    this.completing.set(true)
    this.error.set(null)

    try {
      await this.api.setStepComplete(this.slug(), ws.step.id, !ws.step.complete)
      this.workspace.set({ ...ws, step: { ...ws.step, complete: !ws.step.complete } })
      void this.skills.load(true)
    } catch (error: unknown) {
      this.error.set(describeHttpError(error))
    } finally {
      this.completing.set(false)
    }
  }

  protected hrefFor(resource: Resource): string {
    return resourceHref(resource)
  }


  protected preview(resource: Resource): string {
    const body = (resource.content ?? '').replace(/[#>*`_\-]/g, ' ').replace(/\s+/g, ' ').trim()
    return body.length > 160 ? `${body.slice(0, 160)}…` : body
  }

  protected async forge(): Promise<void> {
    if (this.forging()) return

    this.forging.set(true)
    this.error.set(null)
    this.notice.set(null)

    try {
      const response = await this.api.forgeStepResources(this.slug(), this.stepId())
      this.workspace.set(response.step)
      this.notice.set(
        response.added === 0
          ? 'Nothing found for this step. Try again, or add a link of your own.'
          : `Found ${response.added} link(s).`,
      )
    } catch (error: unknown) {
      this.error.set(describeHttpError(error))
    } finally {
      this.forging.set(false)
    }
  }

  protected selectTab(tab: Tab): void {
    if (this.tab() === tab) return
    this.tab.set(tab)
    this.editor.set({ mode: 'closed' })
  }

  protected openNoteEditor(existing?: Resource): void {
    this.tab.set('notes')
    this.notice.set(null)
    this.editor.set({
      mode: 'note',
      id: existing?.id ?? null,
      title: existing?.title ?? '',
      content: existing?.content ?? '',
    })
  }

  protected openLinkEditor(): void {
    this.tab.set('links')
    this.notice.set(null)
    this.editor.set({ mode: 'link', title: '', url: '', sourceType: 'ARTICLE' })
  }

  protected closeEditor(): void {
    this.editor.set({ mode: 'closed' })
  }

  protected patchEditor(patch: Partial<Extract<Editor, { mode: 'note' | 'link' }>>): void {
    this.editor.update((current) =>
      current.mode === 'closed' ? current : ({ ...current, ...patch } as Editor),
    )
  }

  protected async save(): Promise<void> {
    const editor = this.editor()
    if (editor.mode === 'closed' || this.saving()) return

    this.saving.set(true)
    this.error.set(null)

    try {
      if (editor.mode === 'note') {
        if (editor.id) {
          await this.api.updateResource(this.slug(), editor.id, {
            title: editor.title.trim(),
            content: editor.content,
          })
        } else {
          await this.api.createResource(this.slug(), {
            kind: 'NOTE',
            stepId: this.stepId(),
            title: editor.title.trim(),
            content: editor.content,
          })
        }
      } else {
        await this.api.createResource(this.slug(), {
          kind: 'LINK',
          stepId: this.stepId(),
          title: editor.title.trim(),
          url: editor.url.trim(),
          sourceType: editor.sourceType,
        })
      }

      await this.reload()
      this.editor.set({ mode: 'closed' })
    } catch (error: unknown) {
      this.error.set(describeHttpError(error))
    } finally {
      this.saving.set(false)
    }
  }

  protected async importFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    this.saving.set(true)
    this.error.set(null)
    this.notice.set(null)

    try {
      const content = await file.text()
      const created = await this.api.importNote(this.slug(), {
        stepId: this.stepId(),
        filename: file.name,
        content,
      })
      await this.reload()
      this.tab.set('notes')
      this.notice.set(`Imported “${created.resource.title}”.`)
    } catch (error: unknown) {
      this.error.set(describeHttpError(error))
    } finally {
      this.saving.set(false)
      input.value = ''
    }
  }

  protected async remove(resource: Resource): Promise<void> {
    if (this.removingId() !== null) return
    if (resource.kind === 'NOTE' && !confirm(`Delete the note “${resource.title}”?`)) return

    this.removingId.set(resource.id)
    this.error.set(null)

    try {
      await this.api.deleteResource(this.slug(), resource.id)
      await this.reload()
    } catch (error: unknown) {
      this.error.set(describeHttpError(error))
    } finally {
      this.removingId.set(null)
    }
  }

  protected async go(stepId: string | null): Promise<void> {
    if (!stepId) return
    await this.router.navigate(['/skills', this.slug(), 'steps', stepId, 'resources'])
  }
}
