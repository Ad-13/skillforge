import { Component, ChangeDetectionStrategy, computed, input, output, signal } from '@angular/core';
import { Rune } from '../../shared/rune';
import { RELATION_RUNE, runeForSlug, type RuneName } from '../../shared/runes';
import { layoutSkillMap, type LaidOutNode } from './tree-layout';
import type { MapLens, MapNode, NodeRelation } from '../../core/api.types';

@Component({
  selector: 'sf-skill-tree',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Rune],
  templateUrl: './skill-tree.html',
  styleUrl: './skill-tree.css',
})
export class SkillTree {
  readonly root = input<MapNode | null>(null);
  readonly rootSlug = input<string>('');
  readonly lens = input<MapLens>('FOUNDATION');
  readonly pendingId = input<string | null>(null);
  readonly expand = output<string>();

  protected readonly layout = computed(() => layoutSkillMap(this.root(), this.collapsedIds()));

  private readonly collapsedIds = signal<ReadonlySet<string>>(new Set());

  protected readonly rootRune = computed<RuneName>(() =>
    this.rootSlug() ? runeForSlug(this.rootSlug()) : 'ALGIZ',
  );

  protected readonly lensRelation = computed<NodeRelation>(() => {
    switch (this.lens()) {
      case 'FOUNDATION':
        return 'PREREQUISITE';
      case 'ANATOMY':
        return 'CORE';
      default:
        return 'ECOSYSTEM';
    }
  });

  protected readonly lensRune = computed<RuneName>(() => RELATION_RUNE[this.lensRelation()]);

  protected readonly activeId = signal<string | null>(null);

  protected isActiveLink(linkId: string): boolean {
    const active = this.activeId();
    return active !== null && linkId.endsWith(`:${active}`);
  }

  protected canExpand(node: LaidOutNode): boolean {
    return node.depth > 0 && !node.expanded && this.pendingId() === null;
  }

  protected canFold(node: LaidOutNode): boolean {
    return node.expanded && (node.collapsed || node.hiddenCount > 0 || !node.terminal);
  }

  protected onClick(node: LaidOutNode): void {
    if (this.canExpand(node)) {
      this.expand.emit(node.id);
      return;
    }

    if (!node.expanded) return;

    this.collapsedIds.update((current) => {
      const next = new Set(current);
      if (next.has(node.id)) next.delete(node.id);
      else next.add(node.id);
      return next;
    });
  }
}
