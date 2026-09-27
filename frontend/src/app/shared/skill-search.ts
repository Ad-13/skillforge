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
    const list: Option[] = this.matches().map((skill) => ({ kind: 'skill', skill }))
    const name = this.query().trim()
    if (name.length > 0 && !this.exact()) list.push({ kind: 'add', name })
    return list
  })

  protected readonly showPanel = computed(
    () =>
      this.open() &&
      (this.options().length > 0 || this.store.creating() || this.store.suggestion() !== null || this.store.error() !== null),
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
    this.query.set('')
    this.activeIndex.set(0)
    this.open.set(false)
    this.input().nativeElement.blur()
  }
}
