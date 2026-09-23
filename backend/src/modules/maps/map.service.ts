import { mapRepository } from "./map.repository.ts";
import { skillRepository } from "../skills/skill.repository.ts";
import { expandNode, type LensName } from "../ai/expansion.generator.ts";
import { NotFoundError, BadRequestError } from "../../lib/errors.ts";
import { canonicalise } from "../../lib/canonical.ts";
import { summariseProgress } from "../../lib/progress.ts";

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

export interface LinkedSkillView {
  slug: string;
  name: string;
  hasRoadmap: boolean;
  progress: number;
  totalSteps: number;
  completedSteps: number;
}

export interface MapNodeView {
  id: string;
  label: string;
  slug: string;
  summary: string | null;
  relation: string | null;
  origin: string;
  expandedAt: string | null;
  expanded: boolean;
  linked: LinkedSkillView | null;
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
  linkedById: ReadonlyMap<string, LinkedSkillView>,
  ownSkill: LinkedSkillView,
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
      linked:
        row.parentId === null
          ? ownSkill
          : row.linkedUserSkillId
            ? (linkedById.get(row.linkedUserSkillId) ?? null)
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

interface SkillWithProgress {
  slug: string;
  name: string;
  roadmap: {
    stages: { title: string; steps: { completedAt: Date | null }[] }[];
  } | null;
}

const toLinkedView = (skill: SkillWithProgress): LinkedSkillView => {
  const summary = summariseProgress(skill.roadmap?.stages ?? []);

  return {
    slug: skill.slug,
    name: skill.name,
    hasRoadmap: skill.roadmap !== null,
    progress: summary.progress,
    totalSteps: summary.totalSteps,
    completedSteps: summary.completedSteps,
  };
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
        await this.linkedSkills(userId, map.nodes),
        toLinkedView(skill),
      ),
      nodeCount: map.nodes.length,
    };
  },

  async linkedSkills(
    userId: string,
    nodes: readonly { linkedUserSkillId: string | null }[],
  ): Promise<Map<string, LinkedSkillView>> {
    const ids = [
      ...new Set(
        nodes
          .map((n) => n.linkedUserSkillId)
          .filter((id): id is string => id !== null),
      ),
    ];
    if (ids.length === 0) return new Map();

    const skills = await skillRepository.listWithRoadmapByIdsForUser(
      userId,
      ids,
    );
    return new Map(skills.map((skill) => [skill.id, toLinkedView(skill)]));
  },

  async promote(
    userId: string,
    nodeId: string,
  ): Promise<{ map: SkillMapView; skillSlug: string; alsoLinked: number }> {
    const node = await mapRepository.findNode(nodeId);
    if (!node) throw new NotFoundError("Node not found");
    if (node.skillMap.userSkill.userId !== userId)
      throw new NotFoundError("Node not found");

    if (node.parentId === null) {
      throw new BadRequestError("The root of a map is already this skill");
    }

    if (node.linkedUserSkillId !== null) {
      throw new BadRequestError("This node already has a skill");
    }

    const canonical = canonicalise(node.label);
    const name = canonical.name;
    const slug = canonical.slug.length > 0 ? canonical.slug : node.slug;

    const created = await skillRepository.upsertBySlug({
      userId,
      name,
      slug,
      source: "MANUAL",
    });

    const linked = await mapRepository.linkNodesBySlug(
      userId,
      slug,
      created.id,
    );

    const map = await this.getForSkill(
      userId,
      node.skillMap.userSkill.slug,
      node.skillMap.lens as LensName,
    );
    if (!map) throw new NotFoundError("Map not found");

    return {
      map,
      skillSlug: created.slug,
      alsoLinked: Math.max(0, linked - 1),
    };
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
        goalKind: skill.kind,
        pathNames: [],
        language: skill.learningLanguage,
        context: {
          lens,
          targetSlug: skill.slug,
          pathSlugs: [skill.slug],
          siblingSlugs: [],
          mapSlugs: [skill.slug],
          targetIsRoot: true,
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
      linkBySlug: await skillRepository.slugIndexForUser(userId),
    });

    return {
      lens,
      generatedAt: skillMap.generatedAt.toISOString(),
      generatedBy: model,
      root: buildTree(
        nodes,
        await this.linkedSkills(userId, nodes),
        toLinkedView(skill),
      ),
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

    const [mapSlugs, siblings, linkBySlug, owner] = await Promise.all([
      mapRepository.slugsInMap(node.skillMapId),
      mapRepository.childrenOf(node.id),
      skillRepository.slugIndexForUser(userId),
      skillRepository.findBySlug(userId, skill.slug),
    ]);

    if (!owner) throw new NotFoundError("Skill not found");

    const pathSlugs = [...node.ancestorSlugs, node.slug];

    const { accepted, rejected, model } = await expandNode({
      lens,
      targetName: node.label,
      goalName: skill.name,
      goalKind: skill.kind,
      pathNames: [...node.ancestorSlugs, node.slug],
      language: skill.learningLanguage,
      context: {
        lens,
        targetSlug: node.slug,
        pathSlugs,
        siblingSlugs: siblings.slugs,
        mapSlugs,
        targetIsRoot: node.parentId === null,
      },
    });

    const { nodes, added } = await mapRepository.saveExpansion({
      skillMapId: node.skillMapId,
      parentId: node.id,
      parentAncestors: node.ancestorSlugs,
      parentSlug: node.slug,
      children: accepted,
      startPosition: siblings.nextPosition,
      linkBySlug,
    });

    return {
      map: {
        lens,
        generatedAt: node.skillMap.generatedAt.toISOString(),
        generatedBy: model,
        root: buildTree(
          nodes,
          await this.linkedSkills(userId, nodes),
          toLinkedView(owner),
        ),
        nodeCount: nodes.length,
      },
      added,
      rejected: rejected.length,
    };
  },
};
