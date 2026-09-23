import { z } from "zod";
import { aiProvider } from "./ai.provider.ts";
import { UpstreamError } from "../../lib/errors.ts";

const sourceTypeSchema = z.enum(["DOCS", "ARTICLE", "VIDEO", "REPO", "COURSE"]);

const resourceSchema = z.object({
  title: z.string().trim().min(1).max(120),
  sourceType: sourceTypeSchema,
  url: z.string().trim().url().max(500).nullable(),
  searchQuery: z.string().trim().min(1).max(160),
});

export type GeneratedResource = z.infer<typeof resourceSchema>;

const stageResourcesSchema = z.object({
  steps: z
    .array(
      z.object({
        stepIndex: z.number().int().min(0).max(50),
        resources: z.array(resourceSchema).max(3),
      }),
    )
    .max(20),
});

export type GeneratedStageResources = z.infer<typeof stageResourcesSchema>;

const LANGUAGE_NAMES: Record<string, string> = {
  EN: "English",
  RU: "Russian",
  DE: "German",
};

export interface StageResourcesInput {
  skillName: string;
  stageTitle: string;
  stageRationale: string | null;
  steps: ReadonlyArray<{ title: string; summary: string | null }>;
  language: string;
}

export interface StageResourcesResult {
  resources: GeneratedStageResources;
  model: string;
}

const stepResourcesSchema = z.object({
  resources: z.array(resourceSchema).max(5),
});

export interface StepResourcesInput {
  skillName: string;
  stageTitle: string;
  stepTitle: string;
  stepSummary: string | null;
  siblingTitles: readonly string[];
  language: string;
}

export interface StepResourcesResult {
  resources: GeneratedResource[];
  model: string;
}

const buildSystemPrompt = (
  language: string,
  scope: "stage" | "step",
): string => {
  const languageName = LANGUAGE_NAMES[language] ?? "English";

  return [
    scope === "step"
      ? "You choose learning material for one step of a learning plan."
      : "You choose learning material for the steps of one stage of a learning plan.",
    "",
    "WHAT TO RETURN",
    scope === "step"
      ? "At most four resources, and fewer when fewer are genuinely good. Two that\nmatch the step beat four where two were added to fill the list."
      : "For each step, at most three resources. Two good ones beat three where the\nthird was added to fill the list. A step whose subject is covered by a\nresource you already gave to an earlier step may have none.",
    "",
    "ADDRESSES",
    '- "searchQuery" is required. Write what a person would type to find this',
    "  exact material: include the technology name and the specific subject.",
    '- "url" is optional and must be left null unless you are certain of the',
    "  address. Official documentation landing pages are usually safe; a deep",
    "  link into a blog or a video id is usually not. A wrong address is worse",
    "  than none, because it looks like the product is broken.",
    "- Never invent a shortened, tracking or redirect link.",
    "",
    "COVERAGE",
    "- Prefer primary sources: the official documentation and specification",
    "  before anybody's explanation of them.",
    '- Vary "sourceType" across a stage. A stage of five DOCS entries tells the',
    "  person nothing they could not have guessed.",
    "- Do not recommend material that teaches a different technology, and do",
    "  not recommend a paid course unless nothing free covers the subject.",
    "",
    "FORM",
    `- "title" is written in ${languageName} unless it is the proper name of a`,
    "  document, in which case keep the name as it is.",
    ...(scope === "stage"
      ? [
          '- "stepIndex" is the number given with the step. Return each step at',
          "  most once, and never an index you were not given.",
        ]
      : []),
  ].join("\n");
};

export const generateStepResources = async (
  input: StepResourcesInput,
): Promise<StepResourcesResult> => {
  const user = [
    `SKILL: ${input.skillName}`,
    `STAGE: ${input.stageTitle}`,
    "",
    `STEP: ${input.stepTitle}`,
    ...(input.stepSummary ? [`WHAT IT COVERS: ${input.stepSummary}`] : []),
    ...(input.siblingTitles.length > 0
      ? [
          "",
          "OTHER STEPS OF THIS STAGE — material belonging to these is theirs, not",
          "this one's:",
          ...input.siblingTitles.map((title) => `- ${title}`),
        ]
      : []),
  ].join("\n");

  const answer = await aiProvider.completeStructured(
    stepResourcesSchema,
    "StepResources",
    {
      system: buildSystemPrompt(input.language, "step"),
      user,
    },
  );

  return { resources: answer.resources, model: aiProvider.modelId() };
};

export const generateStageResources = async (
  input: StageResourcesInput,
): Promise<StageResourcesResult> => {
  if (input.steps.length === 0) {
    throw new UpstreamError("This stage has no steps to find resources for.");
  }

  const user = [
    `SKILL: ${input.skillName}`,
    `STAGE: ${input.stageTitle}`,
    ...(input.stageRationale
      ? [`WHY THIS STAGE: ${input.stageRationale}`]
      : []),
    "",
    "STEPS:",
    ...input.steps.map((step, index) =>
      step.summary
        ? `${index}. ${step.title} — ${step.summary}`
        : `${index}. ${step.title}`,
    ),
  ].join("\n");

  const resources = await aiProvider.completeStructured(
    stageResourcesSchema,
    "StageResources",
    { system: buildSystemPrompt(input.language, "stage"), user },
  );

  return { resources, model: aiProvider.modelId() };
};
