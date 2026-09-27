import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SkillsStore } from '../../core/skills.store';
import { Rune } from '../../shared/rune';
import { RuneLoader } from '../../shared/rune-loader';
import { Icon } from '../../shared/icon';
import { SkillBadge } from '../../shared/skill-badge';
import type { RejectedImport, Skill } from '../../core/api.types';

type Filter = 'all' | 'active' | 'planned' | 'untouched' | 'finished';

const DATE = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
const TIME = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

@Component({
  selector: 'sf-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Rune, RuneLoader, Icon, SkillBadge],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  protected readonly store = inject(SkillsStore);
  private readonly router = inject(Router);

  protected readonly now = signal(new Date());
  protected readonly today = computed(() => DATE.format(this.now()));
  protected readonly time = computed(() => TIME.format(this.now()));

  protected readonly justImported = signal<ReadonlySet<string>>(new Set<string>());
  protected readonly dropped = signal<RejectedImport[]>([]);
  protected readonly filter = signal<Filter>('all');

  protected readonly all = computed(() => this.store.skills());

  protected readonly active = computed(() =>
    this.all().filter((skill) => skill.hasRoadmap && skill.progress > 0 && skill.progress < 1),
  );

  protected readonly planned = computed(() =>
    this.all().filter((skill) => skill.hasRoadmap && skill.progress === 0),
  );

  protected readonly finished = computed(() =>
    this.all().filter((skill) => skill.hasRoadmap && skill.progress >= 1),
  );

  protected readonly untouched = computed(() => this.all().filter((skill) => !skill.hasRoadmap));

  protected readonly tabs = computed(() =>
    (
      [
        { id: 'all', label: 'All', count: this.all().length },
        { id: 'active', label: 'Active', count: this.active().length },
        { id: 'planned', label: 'Planned', count: this.planned().length },
        { id: 'untouched', label: 'No plan', count: this.untouched().length },
        { id: 'finished', label: 'Done', count: this.finished().length },
      ] as const
    ).filter((tab) => tab.id === 'all' || tab.count > 0),
  );

  protected readonly visible = computed(() => {
    switch (this.filter()) {
      case 'active':
        return this.active();
      case 'planned':
        return this.planned();
      case 'untouched':
        return this.untouched();
      case 'finished':
        return this.finished();
      default:
        return this.all();
    }
  });

  protected readonly totalSteps = computed(() =>
    this.all().reduce((sum, skill) => sum + skill.totalSteps, 0),
  );

  protected readonly doneSteps = computed(() =>
    this.all().reduce((sum, skill) => sum + skill.completedSteps, 0),
  );

  protected readonly overall = computed(() => {
    const total = this.totalSteps();
    return total === 0 ? 0 : Math.round((this.doneSteps() / total) * 100);
  });

  protected readonly resume = computed(() => {
    const candidates = this.all().filter(
      (skill) => skill.nextStep !== null && skill.lastActivityAt !== null,
    );
    if (candidates.length === 0) return null;

    return candidates.reduce((latest, skill) =>
      (skill.lastActivityAt ?? '') > (latest.lastActivityAt ?? '') ? skill : latest,
    );
  });

  protected readonly imported = computed(() => {
    const slugs = this.justImported();
    return this.all().filter((skill) => slugs.has(skill.slug));
  });

  protected readonly showImport = computed(
    () => this.imported().length > 0 || this.dropped().length > 0,
  );

  constructor() {
    const state = this.router.getCurrentNavigation()?.extras.state as
      { importedSlugs?: string[]; rejected?: RejectedImport[] } | undefined;

    if (state?.importedSlugs) this.justImported.set(new Set(state.importedSlugs));
    if (state?.rejected) this.dropped.set(state.rejected);

    const timer = window.setInterval(() => this.now.set(new Date()), 1000);
    inject(DestroyRef).onDestroy(() => window.clearInterval(timer));
  }

  ngOnInit(): void {
    void this.store.load();
  }

  protected percent(skill: Skill): number {
    return Math.round(skill.progress * 100);
  }

  protected isNew(skill: Skill): boolean {
    return this.justImported().has(skill.slug);
  }

  protected dismissImport(): void {
    this.justImported.set(new Set<string>());
    this.dropped.set([]);
  }
}
