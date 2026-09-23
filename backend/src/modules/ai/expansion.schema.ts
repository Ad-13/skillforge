import { z } from "zod";
export const relationSchema = z.enum([
  "PREREQUISITE",
  "CORE",
  "ECOSYSTEM",
  "RELATED",
]);
export type GeneratedRelation = z.infer<typeof relationSchema>;

const labelSchema = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .describe("Name of the technology or concept, in English");

const summarySchema = z
  .string()
  .trim()
  .min(1)
  .max(260)
  .describe("One or two sentences: what it is, and why it belongs here");

export const expansionChildSchema = z.object({
  label: labelSchema,
  summary: summarySchema,
  relation: relationSchema,
});

export const expansionSchema = z.object({
  children: z.array(expansionChildSchema).max(10),
});

export type GeneratedExpansion = z.infer<typeof expansionSchema>;
export type GeneratedChild = z.infer<typeof expansionChildSchema>;
