import { z } from "zod";
import { aiProvider } from "./ai.provider.ts";
import { UpstreamError } from "../../lib/errors.ts";

const roadmapSchema = z.object({
  stages: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(70),
        rationale: z.string().trim().min(1).max(300),
        steps: z
          .array(
            z.object({
              title: z.string().trim().min(1).max(90),
              summary: z.string().trim().min(1).max(280),
            }),
          )
          .min(1)
          .max(12),
      }),
    )
    .min(2)
    .max(10),
});

export type GeneratedRoadmap = z.infer<typeof roadmapSchema>;

const LANGUAGE_NAMES: Record<string, string> = {
  EN: "English",
  RU: "Russian",
  DE: "German",
};

export interface RoadmapInput {
  skillName: string;
  skillKind: "TECHNOLOGY" | "FIELD" | "CONCEPT";
  topics: ReadonlyArray<{ label: string; summary: string | null }>;
  language: string;
}

export interface RoadmapResult {
  roadmap: GeneratedRoadmap;
  model: string;
}

const buildSystemPrompt = (language: string, kind: string): string => {
  const languageName = LANGUAGE_NAMES[language] ?? "English";

  return [
    "You turn a list of topics into an ordered plan for learning a skill.",
    "",
    "WHAT A STAGE IS",
    "A phase of learning, not a category. Stages are ordered, and the order is",
    "the point: each one should be doable with what the previous ones taught,",
    "and finishing it should leave the person able to do something they could",
    "not do before.",
    "",
    "HOW MANY",
    "As many as the subject has, and no more. Three to five stages of three to",
    "six steps suits a single library or language feature; a broad field may",
    "need eight or nine stages. Do not pad a short subject to look thorough,",
    "and do not compress a wide one to look tidy: a step that covers three",
    "unrelated things cannot be finished in one sitting, which is the only",
    "test a step has to pass.",
    "",
    "WHAT A STEP IS",
    "One sitting of work. Something a person can finish in an evening and then",
    'tick off — "Build a form with controlled inputs", not "Learn forms".',
    "A step that cannot be finished cannot be ticked, and a plan nobody ticks",
    "is a document, not a plan.",
    "",
    "RULES",
    "- Use the topics you are given. You may group several into one step, and",
    "  split a large one across several, but do not silently drop a topic and",
    "  do not introduce a subject that is nowhere on the list.",
    "- Order by dependency, not by importance. What has to come first, comes",
    "  first.",
    `- ${
      kind === "FIELD"
        ? "This is a field of work, so its stages are technologies and areas: finish one before starting the next."
        : "This is a single subject, so its stages are depths: fundamentals, then everyday use, then the parts people reach for later."
    }`,
    '- "title" is in English for both stages and steps: they name things.',
    `- "rationale" and "summary" are written in ${languageName}. The rationale`,
    "  says why this stage sits where it does — a person reading it should",
    "  understand the order, not just see it.",
  ].join("\n");
};

export const generateRoadmap = async (
  input: RoadmapInput,
): Promise<RoadmapResult> => {
  if (input.topics.length === 0) {
    throw new UpstreamError(
      "There is nothing to build a plan from yet. Generate the anatomy map for this skill first.",
    );
  }

  const user = [
    `SKILL: ${input.skillName}`,
    "",
    "TOPICS TO COVER:",
    ...input.topics.map((topic) =>
      topic.summary
        ? `- ${topic.label} — ${topic.summary}`
        : `- ${topic.label}`,
    ),
  ].join("\n");

  const roadmap = await aiProvider.completeStructured(
    roadmapSchema,
    "Roadmap",
    {
      system: buildSystemPrompt(input.language, input.skillKind),
      user,
    },
  );

  return { roadmap, model: aiProvider.modelId() };
};
