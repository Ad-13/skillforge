import { Injectable, computed, inject, signal } from '@angular/core';
import { SkillForgeApi, describeHttpError } from './skillforge-api';
import type { Skill } from './api.types';

@Injectable({ providedIn: 'root' })
export class SkillsStore {
  private readonly api = inject(SkillForgeApi);

  readonly skills = signal<Skill[]>([]);
  readonly loading = signal(false);
  readonly creating = signal(false);
  readonly busySlugs = signal<ReadonlySet<string>>(new Set());
  readonly error = signal<string | null>(null);
  readonly loaded = signal(false);

  readonly isEmpty = computed(() => this.loaded() && this.skills().length === 0);

  bySlug(slug: string): Skill | null {
    return this.skills().find((skill) => skill.slug === slug) ?? null;
  }

  isBusy(slug: string): boolean {
    return this.busySlugs().has(slug);
  }

  async load(force = false): Promise<void> {
    if (this.loading()) return;
    if (this.loaded() && !force) return;

    this.loading.set(true);
    this.error.set(null);

    try {
      const response = await this.api.listSkills();
      this.skills.set(this.sorted(response.skills));
      this.loaded.set(true);
    } catch (error: unknown) {
      this.error.set(describeHttpError(error));
    } finally {
      this.loading.set(false);
    }
  }

  async add(name: string): Promise<Skill | null> {
    const trimmed = name.trim();
    if (trimmed.length === 0 || this.creating()) return null;

    this.creating.set(true);
    this.error.set(null);

    try {
      const { skill } = await this.api.addSkill(trimmed);

      this.skills.update((current) =>
        this.sorted([...current.filter((s) => s.slug !== skill.slug), skill]),
      );
      return skill;
    } catch (error: unknown) {
      this.error.set(describeHttpError(error));
      return null;
    } finally {
      this.creating.set(false);
    }
  }

  async remove(slug: string): Promise<boolean> {
    if (this.isBusy(slug)) return false;

    this.markBusy(slug, true);
    this.error.set(null);

    try {
      await this.api.removeSkill(slug);
      this.skills.update((current) => current.filter((skill) => skill.slug !== slug));
      return true;
    } catch (error: unknown) {
      this.error.set(describeHttpError(error));
      return false;
    } finally {
      this.markBusy(slug, false);
    }
  }

  markHasMap(slug: string): void {
    this.skills.update((current) =>
      current.map((skill) => (skill.slug === slug ? { ...skill, hasMap: true } : skill)),
    );
  }

  private markBusy(slug: string, busy: boolean): void {
    this.busySlugs.update((current) => {
      const next = new Set(current);
      if (busy) next.add(slug);
      else next.delete(slug);
      return next;
    });
  }

  private sorted(skills: readonly Skill[]): Skill[] {
    return [...skills].sort((a, b) => a.name.localeCompare(b.name));
  }
}
