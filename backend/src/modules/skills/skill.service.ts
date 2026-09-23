import { z } from "zod";
import {
  skillRepository,
  type UserSkillWithRoadmap,
} from "./skill.repository.ts";
import { mapRepository } from "../maps/map.repository.ts";
import { canonicaliseOrThrow } from "../../lib/canonical.ts";
import { identifySkill } from "../ai/identify.ts";
import { BadRequestError, NotFoundError } from "../../lib/errors.ts";
import { summariseProgress, type ProgressStage } from "../../lib/progress.ts";

export const learningLanguageSchema = z.enum(["EN", "RU", "DE"]);

export const createSkillSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const importSkillsSchema = z.object({
  skills: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
});

export const updateSkillSchema = z.object({
  learningLanguage: learningLanguageSchema,
});

export type CreateSkillInput = z.infer<typeof createSkillSchema>;
export type ImportSkillsInput = z.infer<typeof importSkillsSchema>;
export type UpdateSkillInput = z.infer<typeof updateSkillSchema>;

export interface SkillSummary {
  id: string;
  name: string;
  slug: string;
  source: string;
  learningLanguage: string;
  hasMap: boolean;
  mapLenses: string[];
  kind: string;
  hasRoadmap: boolean;
  progress: number;
  totalSteps: number;
  completedSteps: number;
  highestCompletedStage: string | null;
  lastWorkedStage: string | null;
  lastActivityAt: string | null;
  createdAt: string;
}

export type CreateSkillResult =
  | { status: "created"; skill: SkillSummary }
  | { status: "suggestion"; suggestion: { name: string; reason: string } };

export interface SkillDetail extends SkillSummary {
  stages: Array<{
    id: string;
    position: number;
    title: string;
    rationale: string | null;
    complete: boolean;
    steps: Array<{
      id: string;
      position: number;
      title: string;
      summary: string | null;
      completedAt: string | null;
    }>;
  }>;
}

const stagesOf = (skill: UserSkillWithRoadmap): ProgressStage[] =>
  skill.roadmap?.stages ?? [];

const toSummary = (skill: UserSkillWithRoadmap): SkillSummary => {
  const summary = summariseProgress(stagesOf(skill));

  return {
    id: skill.id,
    name: skill.name,
    slug: skill.slug,
    source: skill.source,
    kind: skill.kind,
    learningLanguage: skill.learningLanguage,
    hasMap: skill.skillMaps.length > 0,
    mapLenses: skill.skillMaps.map((map) => map.lens),
    hasRoadmap: skill.roadmap !== null,
    progress: summary.progress,
    totalSteps: summary.totalSteps,
    completedSteps: summary.completedSteps,
    highestCompletedStage: summary.highestCompletedStage,
    lastWorkedStage: summary.lastWorkedStage,
    lastActivityAt: summary.lastActivityAt?.toISOString() ?? null,
    createdAt: skill.createdAt.toISOString(),
  };
};

const toDetail = (skill: UserSkillWithRoadmap): SkillDetail => ({
  ...toSummary(skill),
  stages: (skill.roadmap?.stages ?? []).map((stage) => ({
    id: stage.id,
    position: stage.position,
    title: stage.title,
    rationale: stage.rationale,
    complete:
      stage.steps.length > 0 &&
      stage.steps.every((s) => s.completedAt !== null),
    steps: stage.steps.map((step) => ({
      id: step.id,
      position: step.position,
      title: step.title,
      summary: step.summary,
      completedAt: step.completedAt?.toISOString() ?? null,
    })),
  })),
});

export const skillService = {
  async listForUser(userId: string): Promise<SkillSummary[]> {
    const skills = await skillRepository.listByUserId(userId);
    return skills.map(toSummary);
  },

  async getBySlugOrThrow(userId: string, slug: string): Promise<SkillDetail> {
    const skill = await skillRepository.findBySlug(userId, slug);
    if (!skill) throw new NotFoundError("Skill not found");
    return toDetail(skill);
  },

  async create(
    userId: string,
    input: CreateSkillInput,
  ): Promise<CreateSkillResult> {
    canonicaliseOrThrow(input.name);

    const identified = await identifySkill(input.name, "EN");

    if (identified.verdict === "UNKNOWN") {
      throw new BadRequestError(
        identified.reason ||
          `"${input.name}" does not name a skill anyone can learn.`,
      );
    }

    if (identified.verdict === "CORRECTED") {
      return {
        status: "suggestion",
        suggestion: { name: identified.name, reason: identified.reason },
      };
    }

    const skill = await skillRepository.upsertBySlug({
      userId,
      name: identified.name,
      slug: identified.slug,
      source: "MANUAL",
      kind: identified.kind ?? "TECHNOLOGY",
    });

    await mapRepository.linkNodesBySlug(userId, skill.slug, skill.id);

    return { status: "created", skill: toSummary(skill) };
  },

  async importFromPeer(
    userId: string,
    input: ImportSkillsInput,
  ): Promise<SkillSummary[]> {
    const seen = new Set<string>();
    const created: SkillSummary[] = [];

    for (const raw of input.skills) {
      const { name, slug } = canonicaliseOrThrow(raw);

      if (seen.has(slug)) continue;
      seen.add(slug);

      const skill = await skillRepository.upsertBySlug({
        userId,
        name,
        slug,
        source: "CAREEROS",
      });

      await mapRepository.linkNodesBySlug(userId, skill.slug, skill.id);

      created.push(toSummary(skill));
    }

    return created;
  },

  async setLanguage(
    userId: string,
    slug: string,
    input: UpdateSkillInput,
  ): Promise<SkillSummary> {
    const existing = await skillRepository.findBySlug(userId, slug);
    if (!existing) throw new NotFoundError("Skill not found");

    const skill = await skillRepository.setLanguage(
      userId,
      slug,
      input.learningLanguage,
    );
    return toSummary(skill);
  },

  async deleteOwned(userId: string, slug: string): Promise<void> {
    const existing = await skillRepository.findBySlug(userId, slug);
    if (!existing) throw new NotFoundError("Skill not found");
    await skillRepository.deleteBySlug(userId, slug);
  },

  async listForPeer(
    sub: string,
  ): Promise<
    Array<{
      name: string;
      slug: string;
      progress: number;
      currentLevel: string | null;
    }>
  > {
    const skills = await skillRepository.listByAuthSub(sub);

    return skills.map((skill) => {
      const summary = summariseProgress(stagesOf(skill));

      return {
        name: skill.name,
        slug: skill.slug,
        progress: Math.round(summary.progress * 100) / 100,
        currentLevel: summary.highestCompletedStage,
      };
    });
  },
};
