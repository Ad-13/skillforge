import crypto from "node:crypto";
import { prisma } from "../../lib/prisma.ts";
import type { GeneratedSkillMap } from "../ai/skillMap.schema.ts";

interface NodeRow {
  id: string;
  skillMapId: string;
  parentId: string | null;
  label: string;
  summary: string | null;
  relation: "PREREQUISITE" | "CORE" | "ECOSYSTEM" | "RELATED" | null;
  origin: "AI";
  position: number;
}

const flatten = (
  map: GeneratedSkillMap,
  skillMapId: string,
): { rows: NodeRow[]; rootId: string } => {
  const rootId = crypto.randomUUID();

  const rows: NodeRow[] = [
    {
      id: rootId,
      skillMapId,
      parentId: null,
      label: map.root.label,
      summary: map.root.summary,
      relation: null,
      origin: "AI",
      position: 0,
    },
  ];

  map.children.forEach((child, childIndex) => {
    const childId = crypto.randomUUID();

    rows.push({
      id: childId,
      skillMapId,
      parentId: rootId,
      label: child.label,
      summary: child.summary,
      relation: child.relation,
      origin: "AI",
      position: childIndex,
    });

    child.children?.forEach((leaf, leafIndex) => {
      rows.push({
        id: crypto.randomUUID(),
        skillMapId,
        parentId: childId,
        label: leaf.label,
        summary: leaf.summary,
        relation: leaf.relation,
        origin: "AI",
        position: leafIndex,
      });
    });
  });

  return { rows, rootId };
};

export const mapRepository = {
  findByUserSkillId(userSkillId: string) {
    return prisma.skillMap.findUnique({
      where: { userSkillId },
      include: {
        nodes: { orderBy: [{ parentId: "asc" }, { position: "asc" }] },
      },
    });
  },

  async replaceGeneratedNodes(input: {
    userSkillId: string;
    map: GeneratedSkillMap;
    model: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const skillMap = await tx.skillMap.upsert({
        where: { userSkillId: input.userSkillId },
        update: { generatedAt: new Date(), generatedBy: input.model },
        create: { userSkillId: input.userSkillId, generatedBy: input.model },
      });

      await tx.skillMapNode.deleteMany({
        where: { skillMapId: skillMap.id, origin: "AI" },
      });

      const { rows, rootId } = flatten(input.map, skillMap.id);
      await tx.skillMapNode.createMany({ data: rows });

      const orphans = await tx.skillMapNode.updateMany({
        where: { skillMapId: skillMap.id, origin: "USER", parentId: null },
        data: { parentId: rootId },
      });

      const nodes = await tx.skillMapNode.findMany({
        where: { skillMapId: skillMap.id },
        orderBy: [{ parentId: "asc" }, { position: "asc" }],
      });

      return { skillMap, nodes, reparentedCount: orphans.count };
    });
  },
};
