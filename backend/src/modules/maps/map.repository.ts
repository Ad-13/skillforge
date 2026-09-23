import crypto from "node:crypto";
import { prisma } from "../../lib/prisma.ts";
import type { AcceptedChild, MapLensName } from "../ai/expansion.guard.ts";

const nodeOrder = [{ position: "asc" as const }];

export const mapRepository = {
  findByLens(userSkillId: string, lens: MapLensName) {
    return prisma.skillMap.findUnique({
      where: { userSkillId_lens: { userSkillId, lens } },
      include: { nodes: { orderBy: nodeOrder } },
    });
  },

  findNode(nodeId: string) {
    return prisma.skillMapNode.findUnique({
      where: { id: nodeId },
      include: { skillMap: { include: { userSkill: true } } },
    });
  },

  async resetToRoot(input: {
    userSkillId: string;
    lens: MapLensName;
    rootLabel: string;
    rootSlug: string;
    rootSummary: string | null;
    model: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const skillMap = await tx.skillMap.upsert({
        where: {
          userSkillId_lens: {
            userSkillId: input.userSkillId,
            lens: input.lens,
          },
        },
        update: { generatedAt: new Date(), generatedBy: input.model },
        create: {
          userSkillId: input.userSkillId,
          lens: input.lens,
          generatedBy: input.model,
        },
      });

      await tx.skillMapNode.deleteMany({ where: { skillMapId: skillMap.id } });

      const root = await tx.skillMapNode.create({
        data: {
          skillMapId: skillMap.id,
          parentId: null,
          label: input.rootLabel,
          slug: input.rootSlug,
          ancestorSlugs: [],
          summary: input.rootSummary,
          relation: null,
          origin: "AI",
          position: 0,
          linkedUserSkillId: input.userSkillId,
        },
      });

      return { skillMap, root };
    });
  },

  async saveExpansion(input: {
    skillMapId: string;
    parentId: string;
    parentAncestors: readonly string[];
    parentSlug: string;
    children: readonly AcceptedChild[];
    startPosition: number;
    linkBySlug?: ReadonlyMap<string, string>;
  }) {
    const rows = input.children.map((child, index) => ({
      id: crypto.randomUUID(),
      skillMapId: input.skillMapId,
      parentId: input.parentId,
      label: child.label,
      slug: child.slug,
      linkedUserSkillId: input.linkBySlug?.get(child.slug) ?? null,
      ancestorSlugs: [...input.parentAncestors, input.parentSlug],
      summary: child.summary,
      relation: child.relation,
      origin: "AI" as const,
      position: input.startPosition + index,
    }));

    return prisma.$transaction(async (tx) => {
      if (rows.length > 0) await tx.skillMapNode.createMany({ data: rows });

      await tx.skillMapNode.update({
        where: { id: input.parentId },
        data: { expandedAt: new Date() },
      });

      const nodes = await tx.skillMapNode.findMany({
        where: { skillMapId: input.skillMapId },
        orderBy: nodeOrder,
      });

      return { nodes, added: rows.length };
    });
  },

  async slugsInMap(skillMapId: string): Promise<string[]> {
    const rows = await prisma.skillMapNode.findMany({
      where: { skillMapId },
      select: { slug: true },
    });
    return rows.map((row) => row.slug);
  },

  async linkNodesBySlug(
    userId: string,
    slug: string,
    userSkillId: string,
  ): Promise<number> {
    const rows = await prisma.skillMapNode.findMany({
      where: {
        slug,
        linkedUserSkillId: null,
        skillMap: { userSkill: { userId } },
      },
      select: { id: true },
    });

    if (rows.length === 0) return 0;

    const { count } = await prisma.skillMapNode.updateMany({
      where: { id: { in: rows.map((row) => row.id) } },
      data: { linkedUserSkillId: userSkillId },
    });

    return count;
  },

  async childrenOf(
    parentId: string,
  ): Promise<{ slugs: string[]; nextPosition: number }> {
    const rows = await prisma.skillMapNode.findMany({
      where: { parentId },
      select: { slug: true, position: true },
    });

    return {
      slugs: rows.map((row) => row.slug),
      nextPosition: rows.reduce(
        (max, row) => Math.max(max, row.position + 1),
        0,
      ),
    };
  },
};
