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
import type { Resource, ResourceSourceType, ResourceStage } from '../../core/api.types';

const SOURCE_LABEL: Record<ResourceSourceType, string> = {
  DOCS: 'docs',
  ARTICLE: 'article',
  VIDEO: 'video',
  REPO: 'repo',
  COURSE: 'course',
};

@Component({
  selector: 'sf-stage-resources-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Rune, RuneLoader],
  templateUrl: './stage-resources-page.html',
  styleUrl: './stage-resources-page.css',
})
export class StageResourcesPage {
  readonly slug = input.required<string>();
  readonly stageId = input.required<string>();

  private readonly api = inject(SkillForgeApi);
  protected readonly skills = inject(SkillsStore);

  protected readonly stage = signal<ResourceStage | null>(null);
  protected readonly loading = signal(true);
  protected readonly forging = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly missing = signal(false);
  protected readonly notice = signal<string | null>(null);

  protected readonly skill = computed(() => this.skills.bySlug(this.slug()));
  protected readonly skillName = computed(() => this.skill()?.name ?? this.slug());

  protected readonly total = computed(() =>
    (this.stage()?.steps ?? []).reduce((sum, step) => sum + step.resources.length, 0),
  );

  constructor() {
    void this.skills.load();

    effect(() => {
      const slug = this.slug();
      const stageId = this.stageId();
      void this.fetch(slug, stageId);
    });
  }

  private async fetch(slug: string, stageId: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.missing.set(false);

    try {
      const response = await this.api.getStageResources(slug, stageId);
      this.stage.set(response.stage);
    } catch (error: unknown) {
      const message = describeHttpError(error);
      if (message === 'Not found.' || message.endsWith('not found')) this.missing.set(true);
      else this.error.set(message);
    } finally {
      this.loading.set(false);
    }
  }

  protected sourceLabel(resource: Resource): string {
    return resource.sourceType ? SOURCE_LABEL[resource.sourceType] : 'link';
  }

  protected hrefFor(resource: Resource): string {
    if (resource.url) return resource.url;
    const query = encodeURIComponent(resource.searchQuery ?? resource.title);
    return `https://duckduckgo.com/?q=${query}`;
  }

  protected async forge(): Promise<void> {
    if (this.forging()) return;

    const stage = this.stage();
    if (!stage) return;

    this.forging.set(true);
    this.error.set(null);
    this.notice.set(null);

    try {
      const response = await this.api.forgeStageResources(this.slug(), stage.id);
      const fresh = response.resources.stages.find((candidate) => candidate.id === stage.id);
      if (fresh) this.stage.set(fresh);

      this.notice.set(
        response.added === 0
          ? 'Nothing found. Try a step on its own, or add links by hand.'
          : `Found ${response.added} link(s) across this stage.`,
      );
    } catch (error: unknown) {
      this.error.set(describeHttpError(error));
    } finally {
      this.forging.set(false);
    }
  }
}
