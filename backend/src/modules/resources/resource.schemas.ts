import { z } from "zod";

const sourceTypeSchema = z.enum(["DOCS", "ARTICLE", "VIDEO", "REPO", "COURSE"]);

export const createResourceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("LINK"),
    stepId: z.string().uuid().nullable().default(null),
    title: z.string().trim().min(1).max(200),
    url: z.string().trim().url().max(2000),
    sourceType: sourceTypeSchema.default("ARTICLE"),
  }),
  z.object({
    kind: z.literal("NOTE"),
    stepId: z.string().uuid().nullable().default(null),
    title: z.string().trim().min(1).max(200),
    content: z.string().min(1).max(200_000),
  }),
]);

export type CreateResourceInput = z.infer<typeof createResourceSchema>;

export const updateResourceSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  url: z.string().trim().url().max(2000).nullable().optional(),
  sourceType: sourceTypeSchema.optional(),
  content: z.string().min(1).max(200_000).optional(),
});

export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;

export const importNoteSchema = z.object({
  stepId: z.string().uuid().nullable().default(null),
  filename: z.string().trim().min(1).max(260),
  content: z.string().min(1).max(200_000),
  title: z.string().trim().min(1).max(200).optional(),
});

export type ImportNoteInput = z.infer<typeof importNoteSchema>;
