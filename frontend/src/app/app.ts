import {
  Component,
  ChangeDetectionStrategy,
  computed,
  effect,
  inject,
  signal,
  OnInit,
} from '@angular/core'
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'
import { filter } from 'rxjs'
import { SessionStore } from './core/session.store'
import { SkillsStore } from './core/skills.store'
import { ThemeService } from './core/theme.service'
import { Rune } from './shared/rune'
import { RuneLoader } from './shared/rune-loader'
import { isHandoverUrl, loginUrlFor } from './core/handover'
import type { RuneName } from './shared/runes'
import type { Skill } from './core/api.types'

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Rune, RuneLoader],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected readonly session = inject(SessionStore)
  protected readonly skills = inject(SkillsStore)
  protected readonly theme = inject(ThemeService)
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

  protected readonly activeName = computed(
    () => this.activeSkill()?.name ?? this.activeSlug() ?? null,
  )

  protected readonly themeRune = computed<RuneName>(() => {
    switch (this.theme.choice()) {
      case 'light':
        return 'SOWILO'
      case 'dark':
        return 'ISA'
      default:
        return 'JERA'
    }
  })

  protected readonly themeLabel = computed(() => {
    const choice = this.theme.choice()
    return choice === 'system' ? 'Auto' : choice === 'light' ? 'Light' : 'Dark'
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
