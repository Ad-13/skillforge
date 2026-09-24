import { hierarchy, tree } from 'd3-hierarchy'
import type { LinkedSkill, MapNode, NodeRelation } from '../../core/api.types'

const ROOT_WIDTH = 190
const NODE_WIDTH = 218
const COLUMN_GAP = 62

const ROOT_HEIGHT = 74
const NODE_HEIGHT = 92

const LINK_ROW = 26

const GAP_SIBLING = 12
const GAP_SUBTREE = 28
const PADDING = 20

const widthAt = (depth: number): number => (depth === 0 ? ROOT_WIDTH : NODE_WIDTH)

const heightOf = (node: MapNode, depth: number): number =>
  (depth === 0 ? ROOT_HEIGHT : NODE_HEIGHT) + (node.linked ? LINK_ROW : 0)

const columnLeft = (depth: number): number =>
  depth === 0 ? PADDING : PADDING + ROOT_WIDTH + COLUMN_GAP + (depth - 1) * (NODE_WIDTH + COLUMN_GAP)

export interface LaidOutNode {
  id: string
  label: string
  summary: string | null
  relation: NodeRelation | null
  origin: string
  linked: LinkedSkill | null
  expanded: boolean
  terminal: boolean
  collapsed: boolean
  hiddenCount: number
  depth: number
  x: number
  y: number
  width: number
  height: number
}

export interface LaidOutLink {
  id: string
  path: string
  relation: NodeRelation | null
  length: number
}

export interface TreeLayout {
  nodes: LaidOutNode[]
  links: LaidOutLink[]
  width: number
  height: number
}

const EMPTY: TreeLayout = { nodes: [], links: [], width: 0, height: 0 }

const countDescendants = (node: MapNode): number =>
  node.children.reduce((total, child) => total + 1 + countDescendants(child), 0)

const prune = (node: MapNode, collapsed: ReadonlySet<string>): MapNode =>
  collapsed.has(node.id)
    ? { ...node, children: [] }
    : { ...node, children: node.children.map((child) => prune(child, collapsed)) }

export const layoutSkillMap = (
  root: MapNode | null,
  collapsedIds: ReadonlySet<string> = new Set(),
): TreeLayout => {
  if (!root) return EMPTY

  const hidden = new Map<string, number>()
  const walk = (node: MapNode): void => {
    if (collapsedIds.has(node.id)) hidden.set(node.id, countDescendants(node))
    node.children.forEach(walk)
  }
  walk(root)

  const rooted = hierarchy<MapNode>(prune(root, collapsedIds), (node) => node.children)

  const UNIT = 2

  const layout = tree<MapNode>()
    .nodeSize([UNIT, 1])
    .separation((a, b) => {
      const half = heightOf(a.data, a.depth) / 2 + heightOf(b.data, b.depth) / 2
      const gap = a.parent === b.parent ? GAP_SIBLING : GAP_SUBTREE
      return (half + gap) / UNIT
    })

  const positioned = layout(rooted)

  const all = positioned.descendants()

  const top = Math.min(...all.map((n) => n.x - heightOf(n.data, n.depth) / 2))
  const shift = PADDING - top

  const nodes: LaidOutNode[] = all.map((n) => ({
    id: n.data.id,
    label: n.data.label,
    summary: n.data.summary,
    relation: n.data.relation,
    origin: n.data.origin,
    linked: n.data.linked,
    expanded: n.data.expanded,

    terminal: n.data.expanded && !collapsedIds.has(n.data.id) && n.data.children.length === 0,
    collapsed: collapsedIds.has(n.data.id),
    hiddenCount: hidden.get(n.data.id) ?? 0,
    depth: n.depth,
    x: columnLeft(n.depth),
    y: n.x + shift - heightOf(n.data, n.depth) / 2,
    width: widthAt(n.depth),
    height: heightOf(n.data, n.depth),
  }))

  const byId = new Map(nodes.map((node) => [node.id, node]))

  const links: LaidOutLink[] = []
  for (const link of positioned.links()) {
    const from = byId.get(link.source.data.id)
    const to = byId.get(link.target.data.id)
    if (!from || !to) continue

    const x1 = from.x + from.width
    const y1 = from.y + from.height / 2
    const x2 = to.x
    const y2 = to.y + to.height / 2

    const mid = x1 + (x2 - x1) / 2

    links.push({
      id: `${from.id}:${to.id}`,
      path: `M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`,
      relation: to.relation,
      length: Math.hypot(x2 - x1, y2 - y1),
    })
  }

  const width = Math.max(...nodes.map((n) => n.x + n.width)) + PADDING
  const height = Math.max(...nodes.map((n) => n.y + n.height)) + PADDING

  return { nodes, links, width, height }
}
