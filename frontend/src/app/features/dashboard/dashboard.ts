import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SkillsStore } from '../../core/skills.store';
import { Rune } from '../../shared/rune';
import { RuneLoader } from '../../shared/rune-loader';
import { runeForSlug } from '../../shared/runes';
import type { Skill } from '../../core/api.types';

@Component({
  selector: 'sf-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, Rune, RuneLoader],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  protected readonly store = inject(SkillsStore);
  private readonly router = inject(Router);

  protected readonly draft = signal('');
  protected readonly runeFor = runeForSlug;

  ngOnInit(): void {
    void this.store.load();
  }

  protected async submit(): Promise<void> {
    const skill = await this.store.add(this.draft());
    if (skill) this.draft.set('');
  }

  protected async accept(): Promise<void> {
    const skill = await this.store.acceptSuggestion();
    if (skill) this.draft.set('');
  }

  protected percent(skill: Skill): number {
    return Math.round(skill.progress * 100);
  }

  protected async remove(event: Event, slug: string): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    await this.store.remove(slug);
  }

  protected open(skill: Skill): void {
    void this.router.navigate(['/skills', skill.slug]);
  }
}
