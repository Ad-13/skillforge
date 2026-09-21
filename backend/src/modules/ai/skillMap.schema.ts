import { z } from "zod";

const relationSchema = z
  .enum(["PREREQUISITE", "CORE", "ECOSYSTEM", "RELATED"])
  .describe(
    "How this node relates to its DIRECT parent, not to the root skill",
  );

const labelSchema = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .describe("Name of the technology or concept, in English");

const summarySchema = z
  .string()
  .trim()
  .max(240)
  .describe(
    "One or two sentences: what it is and why it sits next to its parent",
  );

const leafSchema = z.object({
  label: labelSchema,
  summary: summarySchema,
  relation: relationSchema,
});

const branchSchema = leafSchema.extend({
  children: z.array(leafSchema).max(6).optional(),
});

export const skillMapSchema = z.object({
  root: z.object({
    label: labelSchema,
    summary: summarySchema,
  }),
  children: z.array(branchSchema).min(4).max(12),
});

export type GeneratedSkillMap = z.infer<typeof skillMapSchema>;
export type GeneratedBranch = z.infer<typeof branchSchema>;
export type GeneratedLeaf = z.infer<typeof leafSchema>;
