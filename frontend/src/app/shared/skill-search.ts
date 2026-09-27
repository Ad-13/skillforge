import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core'
import { Router } from '@angular/router'
import { SkillsStore } from '../core/skills.store'
import { SkillBadge } from './skill-badge'
import { Icon } from './icon'
import type { Skill } from '../core/api.types'

type Option = { kind: 'skill'; skill: Skill } | { kind: 'add'; name: string }

const normalise = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')

@Component({
  selector: 'sf-skill-search',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SkillBadge, Icon],
  templateUrl: './skill-search.html',
  styleUrl: './skill-search.css',
  host: {
    '(document:keydown)': 'onGlobalKey($event)',
  },
})
export class SkillSearch {
  protected readonly store = inject(SkillsStore)
  private readonly router = inject(Router)
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef)

  private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('input')

  protected readonly creating = signal(false)
  protected readonly query = signal('')
  protected readonly open = signal(false)
  protected readonly activeIndex = signal(0)

  protected readonly matches = computed(() => {
    const needle = normalise(this.query())
    const skills = this.store.skills()
    const found = needle.length === 0 ? skills : skills.filter((skill) => normalise(skill.name).includes(needle))
    return found.slice(0, 8)
  })

  protected readonly exact = computed(() => {
    const needle = normalise(this.query())
    return this.store.skills().some((skill) => normalise(skill.name) === needle || normalise(skill.slug) === needle)
  })

  protected readonly options = computed<Option[]>(() => {
    const name = this.query().trim()
    const found: Option[] = (this.creating() && name.length === 0 ? [] : this.matches()).map(
      (skill) => ({ kind: 'skill', skill }),
    )
    if (name.length === 0 || this.exact()) return found
    const add: Option = { kind: 'add', name }
    return this.creating() ? [add, ...found] : [...found, add]
  })

  protected readonly showPanel = computed(
    () =>
      this.open() &&
      (this.creating() ||
        this.options().length > 0 ||
        this.store.creating() ||
        this.store.suggestion() !== null ||
        this.store.error() !== null),
  )

  protected readonly placeholder = computed(() =>
    this.creating() ? 'What do you want to learn? Angular, Docker…' : 'Find one of your skills',
  )

  constructor() {
    inject(DestroyRef).onDestroy(() => this.store.dismissSuggestion())
  }

  protected percent(skill: Skill): number {
    return Math.round(skill.progress * 100)
  }

  protected optionId(index: number): string {
    return `skill-option-${index}`
  }

  protected onInput(value: string): void {
    this.query.set(value)
    this.activeIndex.set(0)
    this.open.set(true)
    if (this.store.suggestion()) this.store.dismissSuggestion()
  }

  protected onFocus(): void {
    this.open.set(true)
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null
    if (next && this.host.nativeElement.contains(next)) return
    this.open.set(false)
    if (this.query().trim().length === 0) this.creating.set(false)
  }

  protected startCreating(): void {
    this.creating.set(true)
    this.activeIndex.set(0)
    this.open.set(true)
    this.input().nativeElement.focus()
  }

  protected onKey(event: KeyboardEvent): void {
    const count = this.options().length

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        this.open.set(true)
        if (count > 0) this.activeIndex.set((this.activeIndex() + 1) % count)
        break
      case 'ArrowUp':
        event.preventDefault()
        if (count > 0) this.activeIndex.set((this.activeIndex() - 1 + count) % count)
        break
      case 'Enter': {
        event.preventDefault()
        const option = this.options()[this.activeIndex()]
        if (option) void this.choose(option)
        break
      }
      case 'Escape':
        this.open.set(false)
        this.creating.set(false)
        this.input().nativeElement.blur()
        break
    }
  }

  protected onGlobalKey(event: KeyboardEvent): void {
    if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return
    const target = event.target as HTMLElement | null
    if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return
    event.preventDefault()
    this.input().nativeElement.focus()
  }

  protected async choose(option: Option): Promise<void> {
    if (option.kind === 'skill') {
      this.finish()
      await this.router.navigate(['/skills', option.skill.slug])
      return
    }

    const skill = await this.store.add(option.name)
    if (skill) {
      this.finish()
      await this.router.navigate(['/skills', skill.slug])
    }
  }

  protected async accept(): Promise<void> {
    const skill = await this.store.acceptSuggestion()
    if (skill) {
      this.finish()
      await this.router.navigate(['/skills', skill.slug])
    }
  }

  protected dismiss(): void {
    this.store.dismissSuggestion()
    this.input().nativeElement.focus()
  }

  private finish(): void {
    this.creating.set(false)
    this.query.set('')
    this.activeIndex.set(0)
    this.open.set(false)
    this.input().nativeElement.blur()
  }
}
