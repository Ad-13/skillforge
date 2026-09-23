import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutSkillMap } from './tree-layout.ts';
import type { MapNode } from '../../core/api.types.ts';

const node = (id: string, children: MapNode[] = []): MapNode => ({
  id,
  label: id,
  slug: id,
  summary: `About ${id}.`,
  relation: 'CORE',
  origin: 'AI',
  expanded: children.length > 0,
  expandedAt: children.length > 0 ? '2026-09-21T00:00:00.000Z' : null,
  linked: null,
  children,
});

const sample: MapNode = node('root', [
  node('a', [node('a1'), node('a2'), node('a3')]),
  node('b'),
  node('c', [node('c1'), node('c2')]),
]);

test('an absent map lays out to nothing rather than throwing', () => {
  const layout = layoutSkillMap(null);
  assert.deepEqual(layout, { nodes: [], links: [], width: 0, height: 0 });
});

test('every node of the tree is placed exactly once', () => {
  const { nodes } = layoutSkillMap(sample);
  assert.equal(nodes.length, 9);
  assert.equal(new Set(nodes.map((n) => n.id)).size, 9);
});

test('depth decides the column, so nodes of one depth share an x', () => {
  const { nodes } = layoutSkillMap(sample);
  const xByDepth = new Map<number, Set<number>>();

  for (const n of nodes) {
    if (!xByDepth.has(n.depth)) xByDepth.set(n.depth, new Set());
    xByDepth.get(n.depth)!.add(n.x);
  }

  for (const [, xs] of xByDepth) assert.equal(xs.size, 1);
});

test('columns advance strictly to the right', () => {
  const { nodes } = layoutSkillMap(sample);
  const x = (depth: number) => nodes.find((n) => n.depth === depth)!.x;

  assert.ok(x(0) < x(1));
  assert.ok(x(1) < x(2));
});

test('nothing is placed at a negative coordinate', () => {
  const { nodes } = layoutSkillMap(sample);
  for (const n of nodes) {
    assert.ok(n.x >= 0, `${n.id} has x ${n.x}`);
    assert.ok(n.y >= 0, `${n.id} has y ${n.y}`);
  }
});

test('no two boxes in the same column overlap vertically', () => {
  const { nodes } = layoutSkillMap(sample);

  for (const depth of new Set(nodes.map((n) => n.depth))) {
    const column = nodes.filter((n) => n.depth === depth).sort((a, b) => a.y - b.y);

    for (let i = 1; i < column.length; i += 1) {
      const above = column[i - 1]!;
      const below = column[i]!;
      assert.ok(
        above.y + above.height <= below.y,
        `${above.id} and ${below.id} overlap at depth ${depth}`,
      );
    }
  }
});

test('the reported size contains every node', () => {
  const { nodes, width, height } = layoutSkillMap(sample);
  for (const n of nodes) {
    assert.ok(n.x + n.width <= width);
    assert.ok(n.y + n.height <= height);
  }
});

test('there is one link per node except the root', () => {
  const { nodes, links } = layoutSkillMap(sample);
  assert.equal(links.length, nodes.length - 1);
});

test('each link starts at its parent edge and ends at its child edge', () => {
  const { nodes, links } = layoutSkillMap(sample);
  const byId = new Map(nodes.map((n) => [n.id, n]));

  for (const link of links) {
    const [fromId, toId] = link.id.split(':') as [string, string];
    const from = byId.get(fromId)!;
    const to = byId.get(toId)!;

    const start = `M${from.x + from.width},${from.y + from.height / 2}`;
    assert.ok(link.path.startsWith(start), `${link.id} starts at ${link.path.slice(0, 20)}`);
    assert.ok(link.path.endsWith(`${to.x},${to.y + to.height / 2}`));
  }
});

test('a root with no children is still a valid one-node layout', () => {
  const { nodes, links, width, height } = layoutSkillMap(node('lonely'));

  assert.equal(nodes.length, 1);
  assert.equal(links.length, 0);
  assert.ok(width > 0 && height > 0);
});

test('a chain deeper than three levels lays out without overlaps', () => {
  let deep = node('level-6');
  for (let i = 5; i >= 0; i -= 1) deep = node(`level-${i}`, [deep, node(`side-${i}`)]);

  const { nodes, links, width } = layoutSkillMap(deep);

  assert.equal(Math.max(...nodes.map((n) => n.depth)), 6);
  assert.equal(links.length, nodes.length - 1);
  assert.ok(width > 0);

  const xByDepth = new Map<number, number>();
  for (const n of nodes) xByDepth.set(n.depth, n.x);

  for (let d = 1; d <= 6; d += 1) {
    assert.ok(xByDepth.get(d)! > xByDepth.get(d - 1)!, `column ${d} did not advance`);
  }

  for (const depth of new Set(nodes.map((n) => n.depth))) {
    const column = nodes.filter((n) => n.depth === depth).sort((a, b) => a.y - b.y);
    for (let i = 1; i < column.length; i += 1) {
      assert.ok(column[i - 1]!.y + column[i - 1]!.height <= column[i]!.y);
    }
  }
});

test('an expanded node with no children is marked terminal, an unopened one is not', () => {
  const opened: MapNode = { ...node('css'), expanded: true, expandedAt: 'now' };
  const untouched = node('html');

  const { nodes } = layoutSkillMap(node('root', [opened, untouched]));
  const byId = new Map(nodes.map((n) => [n.id, n]));

  assert.equal(byId.get('css')!.terminal, true);
  assert.equal(byId.get('html')!.terminal, false);
});
