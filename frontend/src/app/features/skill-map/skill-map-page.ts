import {
  Component,
  ChangeDetectionStrategy,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { SkillForgeApi, describeHttpError } from '../../core/skillforge-api';
import { SkillsStore } from '../../core/skills.store';
import { RuneLoader } from '../../shared/rune-loader';
import { Rune } from '../../shared/rune';
import { SkillTree } from './skill-tree';
import { LENSES, type LensDescriptor, type MapLens, type SkillMap } from '../../core/api.types';

@Component({
  selector: 'sf-skill-map-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Rune, RuneLoader, SkillTree],
  templateUrl: './skill-map-page.html',
  styleUrl: './skill-map-page.css',
})
export class SkillMapPage {
  readonly slug = input.required<string>();

  private readonly api = inject(SkillForgeApi);
  protected readonly skills = inject(SkillsStore);

  protected readonly lenses = LENSES;
  protected readonly lens = signal<LensDescriptor>(LENSES[0] as LensDescriptor);

  private readonly maps = signal<Partial<Record<MapLens, SkillMap | null>>>({});

  protected readonly loading = signal(false);
  protected readonly generating = signal(false);
  protected readonly pendingNodeId = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly missing = signal(false);
  protected readonly lastEmpty = signal<string | null>(null);

  protected readonly map = computed(() => this.maps()[this.lens().lens] ?? null);
  protected readonly skill = computed(() => this.skills.bySlug(this.slug()));
  protected readonly title = computed(() => this.skill()?.name ?? this.slug());

  protected readonly generatedAt = computed(() => {
    const at = this.map()?.generatedAt;
    return at ? new Date(at).toLocaleString() : null;
  });

  constructor() {
    void this.skills.load();

    effect(() => {
      const slug = this.slug();
      const lens = this.lens();
      void this.fetch(slug, lens);
    });
  }

  protected selectLens(lens: LensDescriptor): void {
    if (this.generating() || this.pendingNodeId() !== null) return;
    this.lens.set(lens);
  }

  private async fetch(slug: string, lens: LensDescriptor): Promise<void> {
    if (this.maps()[lens.lens] !== undefined) return;

    this.loading.set(true);
    this.error.set(null);
    this.missing.set(false);

    try {
      const response = await this.api.getMap(slug, lens.path);
      this.maps.update((current) => ({ ...current, [lens.lens]: response.map }));
    } catch (error: unknown) {
      const message = describeHttpError(error);
      if (message === 'Not found.' || message === 'Skill not found') this.missing.set(true);
      else this.error.set(message);
    } finally {
      this.loading.set(false);
    }
  }

  protected async generate(): Promise<void> {
    if (this.generating()) return;

    const lens = this.lens();
    this.generating.set(true);
    this.error.set(null);
    this.lastEmpty.set(null);

    try {
      const response = await this.api.generateMap(this.slug(), lens.path);
      this.maps.update((current) => ({ ...current, [lens.lens]: response.map }));
      this.skills.markHasMap(this.slug());
    } catch (error: unknown) {
      this.error.set(describeHttpError(error));
    } finally {
      this.generating.set(false);
    }
  }

  protected async expand(nodeId: string): Promise<void> {
    if (this.pendingNodeId() !== null) return;

    const lens = this.lens();
    this.pendingNodeId.set(nodeId);
    this.error.set(null);
    this.lastEmpty.set(null);

    try {
      const response = await this.api.expandNode(this.slug(), lens.path, nodeId);
      this.maps.update((current) => ({ ...current, [lens.lens]: response.map }));

      if (response.added === 0) {
        this.lastEmpty.set('Nothing further — this is where that branch ends.');
      }
    } catch (error: unknown) {
      this.error.set(describeHttpError(error));
    } finally {
      this.pendingNodeId.set(null);
    }
  }
}
