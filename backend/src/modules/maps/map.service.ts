import { mapRepository } from "./map.repository.ts";
import { skillRepository } from "../skills/skill.repository.ts";
import { expandNode, type LensName } from "../ai/expansion.generator.ts";
import { NotFoundError, BadRequestError } from "../../lib/errors.ts";

export type { LensName };

export const LENSES: readonly LensName[] = [
  "FOUNDATION",
  "ANATOMY",
  "ECOSYSTEM",
];

export const parseLens = (raw: unknown): LensName => {
  const upper = typeof raw === "string" ? raw.toUpperCase() : "";
  const found = LENSES.find((lens) => lens === upper);
  if (!found) {
    throw new BadRequestError(
      `Unknown lens. Use one of: ${LENSES.join(", ").toLowerCase()}`,
    );
  }
  return found;
};

export interface MapNodeView {
  id: string;
  label: string;
  slug: string;
  summary: string | null;
  relation: string | null;
  origin: string;
  expandedAt: string | null;
  expanded: boolean;
  linkedSlug: string | null;
  children: MapNodeView[];
}

export interface SkillMapView {
  lens: LensName;
  generatedAt: string;
  generatedBy: string | null;
  root: MapNodeView | null;
  nodeCount: number;
}

interface NodeRow {
  id: string;
  parentId: string | null;
  label: string;
  slug: string;
  summary: string | null;
  relation: string | null;
  origin: string;
  position: number;
  expandedAt: Date | null;
  linkedUserSkillId: string | null;
}

const buildTree = (
  rows: readonly NodeRow[],
  slugById: ReadonlyMap<string, string>,
): MapNodeView | null => {
  const views = new Map<string, MapNodeView>();

  for (const row of rows) {
    views.set(row.id, {
      id: row.id,
      label: row.label,
      slug: row.slug,
      summary: row.summary,
      relation: row.relation,
      origin: row.origin,
      expandedAt: row.expandedAt?.toISOString() ?? null,
      expanded: row.expandedAt !== null,
      linkedSlug: row.linkedUserSkillId
        ? (slugById.get(row.linkedUserSkillId) ?? null)
        : null,
      children: [],
    });
  }

  let root: MapNodeView | null = null;

  for (const row of rows) {
    const view = views.get(row.id);
    if (!view) continue;

    if (row.parentId === null) {
      root = view;
      continue;
    }

    views.get(row.parentId)?.children.push(view);
  }

  return root;
};

export const mapService = {
  async getForSkill(
    userId: string,
    slug: string,
    lens: LensName,
  ): Promise<SkillMapView | null> {
    const skill = await skillRepository.findBySlug(userId, slug);
    if (!skill) throw new NotFoundError("Skill not found");

    const map = await mapRepository.findByLens(skill.id, lens);
    if (!map) return null;

    return {
      lens,
      generatedAt: map.generatedAt.toISOString(),
      generatedBy: map.generatedBy,
      root: buildTree(
        map.nodes,
        await this.slugsForLinkedNodes(userId, map.nodes),
      ),
      nodeCount: map.nodes.length,
    };
  },

  async slugsForLinkedNodes(
    userId: string,
    nodes: readonly { linkedUserSkillId: string | null }[],
  ): Promise<Map<string, string>> {
    const ids = [
      ...new Set(
        nodes
          .map((n) => n.linkedUserSkillId)
          .filter((id): id is string => id !== null),
      ),
    ];
    if (ids.length === 0) return new Map();

    const skills = await skillRepository.listByIdsForUser(userId, ids);
    return new Map(skills.map((skill) => [skill.id, skill.slug]));
  },

  async generate(
    userId: string,
    slug: string,
    lens: LensName,
  ): Promise<SkillMapView> {
    const skill = await skillRepository.findBySlug(userId, slug);
    if (!skill) throw new NotFoundError("Skill not found");

    const { accepted, model } = await expandNode(
      {
        lens,
        targetName: skill.name,
        goalName: skill.name,
        pathNames: [],
        language: skill.learningLanguage,
        context: {
          lens,
          targetSlug: skill.slug,
          pathSlugs: [skill.slug],
          siblingSlugs: [],
          mapSlugs: [skill.slug],
        },
      },
      3,
    );

    const { skillMap, root } = await mapRepository.resetToRoot({
      userSkillId: skill.id,
      lens,
      rootLabel: skill.name,
      rootSlug: skill.slug,
      rootSummary: null,
      model,
    });

    const { nodes } = await mapRepository.saveExpansion({
      skillMapId: skillMap.id,
      parentId: root.id,
      parentAncestors: [],
      parentSlug: skill.slug,
      children: accepted,
      startPosition: 0,
    });

    return {
      lens,
      generatedAt: skillMap.generatedAt.toISOString(),
      generatedBy: model,
      root: buildTree(nodes, await this.slugsForLinkedNodes(userId, nodes)),
      nodeCount: nodes.length,
    };
  },

  async expand(
    userId: string,
    nodeId: string,
  ): Promise<{ map: SkillMapView; added: number; rejected: number }> {
    const node = await mapRepository.findNode(nodeId);
    if (!node) throw new NotFoundError("Node not found");

    if (node.skillMap.userSkill.userId !== userId)
      throw new NotFoundError("Node not found");

    if (node.expandedAt !== null) {
      throw new BadRequestError("This node has already been expanded");
    }

    const lens = node.skillMap.lens as LensName;
    const skill = node.skillMap.userSkill;

    const [mapSlugs, siblings] = await Promise.all([
      mapRepository.slugsInMap(node.skillMapId),
      mapRepository.childrenOf(node.id),
    ]);

    const pathSlugs = [...node.ancestorSlugs, node.slug];

    const { accepted, rejected, model } = await expandNode({
      lens,
      targetName: node.label,
      goalName: skill.name,
      pathNames: [...node.ancestorSlugs, node.slug],
      language: skill.learningLanguage,
      context: {
        lens,
        targetSlug: node.slug,
        pathSlugs,
        siblingSlugs: siblings.slugs,
        mapSlugs,
      },
    });

    const { nodes, added } = await mapRepository.saveExpansion({
      skillMapId: node.skillMapId,
      parentId: node.id,
      parentAncestors: node.ancestorSlugs,
      parentSlug: node.slug,
      children: accepted,
      startPosition: siblings.nextPosition,
    });

    return {
      map: {
        lens,
        generatedAt: node.skillMap.generatedAt.toISOString(),
        generatedBy: model,
        root: buildTree(nodes, await this.slugsForLinkedNodes(userId, nodes)),
        nodeCount: nodes.length,
      },
      added,
      rejected: rejected.length,
    };
  },
};
