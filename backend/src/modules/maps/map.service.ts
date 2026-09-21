import { mapRepository } from "./map.repository.ts";
import { skillRepository } from "../skills/skill.repository.ts";
import { generateSkillMap } from "../ai/skillMap.generator.ts";
import { NotFoundError } from "../../lib/errors.ts";

export interface MapNodeView {
  id: string;
  label: string;
  summary: string | null;
  relation: string | null;
  origin: string;
  linkedSlug: string | null;
  children: MapNodeView[];
}

export interface SkillMapView {
  generatedAt: string;
  generatedBy: string | null;
  root: MapNodeView | null;
  reparentedCount?: number;
}

interface NodeRow {
  id: string;
  parentId: string | null;
  label: string;
  summary: string | null;
  relation: string | null;
  origin: string;
  position: number;
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
      summary: row.summary,
      relation: row.relation,
      origin: row.origin,
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
  ): Promise<SkillMapView | null> {
    const skill = await skillRepository.findBySlug(userId, slug);
    if (!skill) throw new NotFoundError("Skill not found");

    const map = await mapRepository.findByUserSkillId(skill.id);
    if (!map) return null;

    return {
      generatedAt: map.generatedAt.toISOString(),
      generatedBy: map.generatedBy,
      root: buildTree(
        map.nodes,
        await this.slugsForLinkedNodes(userId, map.nodes),
      ),
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

  async generateForSkill(userId: string, slug: string): Promise<SkillMapView> {
    const skill = await skillRepository.findBySlug(userId, slug);
    if (!skill) throw new NotFoundError("Skill not found");

    const { map, model } = await generateSkillMap({
      skillName: skill.name,
      language: skill.learningLanguage,
    });

    const saved = await mapRepository.replaceGeneratedNodes({
      userSkillId: skill.id,
      map,
      model,
    });

    return {
      generatedAt: saved.skillMap.generatedAt.toISOString(),
      generatedBy: saved.skillMap.generatedBy,
      root: buildTree(
        saved.nodes,
        await this.slugsForLinkedNodes(userId, saved.nodes),
      ),
      reparentedCount: saved.reparentedCount,
    };
  },
};
