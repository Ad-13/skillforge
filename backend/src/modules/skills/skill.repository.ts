import { prisma } from "../../lib/prisma.ts";
import type {
  LearningLanguage,
  SkillSource,
} from "../../generated/prisma/client.ts";

const withRoadmap = {
  skillMap: { select: { id: true, generatedAt: true } },
  roadmap: {
    include: {
      stages: {
        orderBy: { position: "asc" },
        include: { steps: { orderBy: { position: "asc" } } },
      },
    },
  },
} as const;

export type UserSkillWithRoadmap = NonNullable<
  Awaited<ReturnType<typeof skillRepository.findBySlug>>
>;

export const skillRepository = {
  listByUserId(userId: string) {
    return prisma.userSkill.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: withRoadmap,
    });
  },

  listByAuthSub(sub: string) {
    return prisma.userSkill.findMany({
      where: { user: { authSub: sub } },
      orderBy: { updatedAt: "desc" },
      include: withRoadmap,
    });
  },

  findBySlug(userId: string, slug: string) {
    return prisma.userSkill.findUnique({
      where: { userId_slug: { userId, slug } },
      include: withRoadmap,
    });
  },

  upsertBySlug(input: {
    userId: string;
    name: string;
    slug: string;
    source: SkillSource;
  }) {
    return prisma.userSkill.upsert({
      where: { userId_slug: { userId: input.userId, slug: input.slug } },
      update: {},
      create: {
        userId: input.userId,
        name: input.name,
        slug: input.slug,
        source: input.source,
      },
      include: withRoadmap,
    });
  },

  setLanguage(
    userId: string,
    slug: string,
    learningLanguage: LearningLanguage,
  ) {
    return prisma.userSkill.update({
      where: { userId_slug: { userId, slug } },
      data: { learningLanguage },
      include: withRoadmap,
    });
  },

  deleteBySlug(userId: string, slug: string) {
    return prisma.userSkill.delete({
      where: { userId_slug: { userId, slug } },
    });
  },
};
