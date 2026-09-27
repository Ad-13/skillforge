import { Component, ChangeDetectionStrategy, OnInit, computed, inject, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { SkillsStore } from '../../core/skills.store'
import { Rune } from '../../shared/rune'
import { RuneLoader } from '../../shared/rune-loader'
import { Icon } from '../../shared/icon'
import { SkillBadge } from '../../shared/skill-badge'
import { LENSES, type MapLens, type Skill } from '../../core/api.types'

type Filter = 'all' | 'active' | 'planned' | 'untouched' | 'finished'
type Sort = 'name' | 'recent' | 'progress'

const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

const stateOf = (skill: Skill): Exclude<Filter, 'all'> => {
  if (!skill.hasRoadmap) return 'untouched'
  if (skill.progress >= 1) return 'finished'
  if (skill.progress > 0) return 'active'
  return 'planned'
}

@Component({
  selector: 'sf-skills-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Rune, RuneLoader, Icon, SkillBadge],
  templateUrl: './skills-page.html',
  styleUrl: './skills-page.css',
})
export class SkillsPage implements OnInit {
  protected readonly store = inject(SkillsStore)

  protected readonly lenses = LENSES
  protected readonly filter = signal<Filter>('all')
  protected readonly sort = signal<Sort>('name')
  protected readonly query = signal('')
  protected readonly confirming = signal<string | null>(null)

  protected readonly tabs = computed(() => {
    const all = this.store.skills()
    const count = (state: Exclude<Filter, 'all'>) => all.filter((skill) => stateOf(skill) === state).length
    return (
      [
        { id: 'all', label: 'All', count: all.length },
        { id: 'active', label: 'Active', count: count('active') },
        { id: 'planned', label: 'Planned', count: count('planned') },
        { id: 'untouched', label: 'No plan', count: count('untouched') },
        { id: 'finished', label: 'Done', count: count('finished') },
      ] as const
    ).filter((tab) => tab.id === 'all' || tab.count > 0)
  })

  protected readonly visible = computed(() => {
    const needle = this.query().trim().toLowerCase()
    const filter = this.filter()

    const list = this.store
      .skills()
      .filter((skill) => filter === 'all' || stateOf(skill) === filter)
      .filter((skill) => needle.length === 0 || skill.name.toLowerCase().includes(needle))

    switch (this.sort()) {
      case 'recent':
        return [...list].sort((a, b) =>
          (b.lastActivityAt ?? b.createdAt).localeCompare(a.lastActivityAt ?? a.createdAt),
        )
      case 'progress':
        return [...list].sort((a, b) => b.progress - a.progress || a.name.localeCompare(b.name))
      default:
        return list
    }
  })

  ngOnInit(): void {
    void this.store.load()
  }

  protected percent(skill: Skill): number {
    return Math.round(skill.progress * 100)
  }

  protected hasLens(skill: Skill, lens: MapLens): boolean {
    return skill.mapLenses.includes(lens)
  }

  protected dateOf(value: string | null): string {
    return value ? DATE.format(new Date(value)) : '—'
  }

  protected state(skill: Skill): Exclude<Filter, 'all'> {
    return stateOf(skill)
  }

  protected askRemove(slug: string): void {
    this.confirming.set(slug)
  }

  protected cancelRemove(): void {
    this.confirming.set(null)
  }

  protected async remove(slug: string): Promise<void> {
    const removed = await this.store.remove(slug)
    if (removed) this.confirming.set(null)
  }
}
