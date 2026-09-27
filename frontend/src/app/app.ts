import { Component, ChangeDetectionStrategy, computed, effect, inject, signal, OnInit } from '@angular/core'
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'
import { filter } from 'rxjs'
import { SessionStore } from './core/session.store'
import { SkillsStore } from './core/skills.store'
import { Rune } from './shared/rune'
import { RuneLoader } from './shared/rune-loader'
import { Icon } from './shared/icon'
import { SkillBadge } from './shared/skill-badge'
import { SkillSearch } from './shared/skill-search'
import { Starfield } from './shared/starfield'
import { MountainArt } from './shared/mountain-art'
import { isHandoverUrl, loginUrlFor } from './core/handover'
import type { Skill } from './core/api.types'

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    Rune,
    RuneLoader,
    Icon,
    SkillBadge,
    SkillSearch,
    Starfield,
    MountainArt,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected readonly session = inject(SessionStore)
  protected readonly skills = inject(SkillsStore)
  private readonly router = inject(Router)

  private readonly url = signal(this.router.url)
  private readonly redirecting = signal(false)

  protected readonly activeSlug = computed(() => {
    const match = /^\/skills\/([^/?#]+)/.exec(this.url())
    return match?.[1] ?? null
  })

  protected readonly activeSkill = computed(() => {
    const slug = this.activeSlug()
    return slug ? this.skills.bySlug(slug) : null
  })

  protected readonly activeName = computed(() => this.activeSkill()?.name ?? this.activeSlug() ?? '')

  protected readonly userLabel = computed(() => {
    const user = this.session.user()
    return user?.email ?? this.session.displayName() ?? ''
  })

  protected readonly userInitials = computed(() => {
    const label = this.userLabel()
    const local = label.split('@')[0] ?? ''
    const letters = local.replace(/[^\p{L}\p{N}]/gu, '')
    return (letters.slice(0, 2) || '?').toUpperCase()
  })

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.url.set(event.urlAfterRedirects))

    effect(() => {
      if (this.session.status() !== 'anonymous' || this.redirecting()) return

      const { pathname, search, hash } = window.location
      if (!isHandoverUrl(pathname, search)) return

      this.redirecting.set(true)
      window.location.assign(loginUrlFor(pathname, search, hash))
    })

    effect(() => {
      if (this.session.isAuthenticated()) void this.skills.load()
    })
  }

  ngOnInit(): void {
    void this.session.load()
  }

  protected pct(skill: Skill): number {
    return Math.round(skill.progress * 100)
  }

  protected retry(): void {
    void this.session.load()
  }

  protected signInHref(): string {
    const { pathname, search, hash } = window.location
    return loginUrlFor(pathname, search, hash)
  }
}
