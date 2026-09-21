import { aiProvider } from "./ai.provider.ts";
import { skillMapSchema, type GeneratedSkillMap } from "./skillMap.schema.ts";
import { validateGeneratedMap } from "./skillMap.validation.ts";
import { UpstreamError } from "../../lib/errors.ts";

const LANGUAGE_NAMES: Record<string, string> = {
  EN: "English",
  RU: "Russian",
  DE: "German",
};

const buildSystemPrompt = (language: string): string => {
  const languageName = LANGUAGE_NAMES[language] ?? "English";

  return [
    "You map the landscape around a professional skill for a learning application.",
    "",
    "Produce the skill as a root node with the technologies, concepts and tools that",
    "surround it. Group them so that a learner can see what the skill depends on, what",
    "forms its core, and what lives in its ecosystem.",
    "",
    "RULES",
    `- "label" is always in English — it is the name of a technology, not prose.`,
    `- "summary" is written in ${languageName}.`,
    '- "relation" describes the link to the node\'s DIRECT parent, never to the root:',
    "    PREREQUISITE — you need it before the parent makes sense",
    "    CORE         — part of the parent itself",
    "    ECOSYSTEM    — commonly used alongside the parent",
    "    RELATED      — adjacent, worth knowing about",
    "- Give a second level only where it genuinely helps. A node like RxJS earns",
    "  children (Observables, Operators, Subjects); a node like HTML usually does not.",
    "- Never repeat the root skill as one of its own children.",
    "- Never repeat a label among children of the same parent.",
    "- Prefer eight to ten top-level nodes for a broad framework, four to six for a",
    "  narrow tool.",
  ].join("\n");
};

export interface GenerateSkillMapInput {
  skillName: string;
  language: string;
}

export interface GeneratedSkillMapResult {
  map: GeneratedSkillMap;
  model: string;
}

export const generateSkillMap = async (
  input: GenerateSkillMapInput,
): Promise<GeneratedSkillMapResult> => {
  const system = buildSystemPrompt(input.language);
  const model = aiProvider.modelId();

  let lastIssues: string[] = [];

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const user =
      attempt === 1
        ? `Skill: ${input.skillName}`
        : [
            `Skill: ${input.skillName}`,
            "",
            "Your previous answer was rejected for these reasons:",
            ...lastIssues.map((issue) => `- ${issue}`),
            "Produce a corrected map.",
          ].join("\n");

    const map = await aiProvider.completeStructured(
      skillMapSchema,
      "SkillMap",
      {
        system,
        user,
      },
    );

    const issues = validateGeneratedMap(map);
    if (issues.length === 0) return { map, model };

    lastIssues = issues.map((issue) => `${issue.path}: ${issue.message}`);
  }

  throw new UpstreamError(
    "The model could not produce a sensible map for this skill. Try again, or try a more specific name.",
    lastIssues,
  );
};
