import { aiProvider } from "./ai.provider.ts";
import { expansionSchema } from "./expansion.schema.ts";
import {
  filterExpansion,
  type ExpansionContext,
  type FilteredExpansion,
} from "./expansion.guard.ts";
import { UpstreamError } from "../../lib/errors.ts";

const LANGUAGE_NAMES: Record<string, string> = {
  EN: "English",
  RU: "Russian",
  DE: "German",
};

const LENS_BRIEF = {
  FOUNDATION: [
    "You answer one question: what must somebody already know BEFORE they can",
    "start learning the TARGET skill?",
    "",
    "- Name only direct prerequisites of TARGET itself. Not prerequisites of",
    "  prerequisites — those are asked for separately, later.",
    '- Name concrete, learnable things: "CSS Selectors", "HTTP", "The DOM".',
    '  Not qualities or attitudes: "problem solving", "patience", "practice".',
    "- Mark a child PREREQUISITE when TARGET genuinely does not make sense",
    "  without it, and RELATED when it merely helps.",
  ],
  ANATOMY: [
    "You answer one question: what is the TARGET skill MADE OF?",
    "",
    "- Name its own parts, subsystems and concepts — the things a person must",
    "  learn inside TARGET in order to say they know it.",
    "- Do not name things needed before TARGET, and do not name separate tools",
    "  or libraries used alongside it.",
    "- Cover the subject properly. If TARGET has ten genuine parts, name ten;",
    "  naming four well-known ones and stopping is the failure mode here.",
    "- Mark a child RELATED when it is a corner of TARGET most people can",
    "  postpone, and CORE otherwise.",
  ],
  ECOSYSTEM: [
    "You answer one question: what is used ALONGSIDE the TARGET skill in real",
    "projects?",
    "",
    "- Name libraries, tools, services and adjacent technologies a working",
    "  practitioner meets when TARGET is in the stack.",
    "- Do not name parts of TARGET, and do not name its prerequisites.",
    "- Mark a child RELATED when it is one option among several, and",
    "  ECOSYSTEM when it is near-universal in practice.",
  ],
} as const;

export type LensName = keyof typeof LENS_BRIEF;

const buildSystemPrompt = (lens: LensName, language: string): string => {
  const languageName = LANGUAGE_NAMES[language] ?? "English";

  return [
    "You build one level of a skill map for a learning application.",
    "",
    ...LENS_BRIEF[lens],
    "",
    "ALWAYS",
    '- "label" is in English: it is the name of a technology, not prose.',
    `- "summary" is written in ${languageName}, one or two sentences, and says`,
    "  why this belongs here rather than restating the name.",
    "- Returning an empty list is a correct answer. Some skills rest on nothing",
    "  further, contain nothing worth splitting, or have no ecosystem. Never",
    "  add an entry to reach a number.",
    "- Never return the TARGET itself, and never return anything listed under",
    "  ALREADY ON THE PATH.",
  ].join("\n");
};

export interface ExpandInput {
  lens: LensName;
  targetName: string;
  goalName: string;
  pathNames: readonly string[];
  language: string;
  context: ExpansionContext;
}

export interface ExpansionResult extends FilteredExpansion {
  model: string;
}

const buildUserPrompt = (
  input: ExpandInput,
  previousIssues: readonly string[],
): string => {
  const lines = [
    `TARGET: ${input.targetName}`,
    `GOAL (root of this map): ${input.goalName}`,
  ];

  if (input.pathNames.length > 0) {
    lines.push(`ALREADY ON THE PATH: ${input.pathNames.join(" → ")}`);
  }

  if (input.context.siblingSlugs.length > 0) {
    lines.push(
      `ALREADY LISTED UNDER TARGET: ${input.context.siblingSlugs.join(", ")}`,
    );
  }

  if (previousIssues.length > 0) {
    lines.push(
      "",
      "Your previous answer was unusable:",
      ...previousIssues.map((i) => `- ${i}`),
    );
  }

  return lines.join("\n");
};

export const expandNode = async (
  input: ExpandInput,
  minChildren = 0,
): Promise<ExpansionResult> => {
  const system = buildSystemPrompt(input.lens, input.language);
  const model = aiProvider.modelId();

  let issues: string[] = [];

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const answer = await aiProvider.completeStructured(
      expansionSchema,
      "Expansion",
      {
        system,
        user: buildUserPrompt(input, issues),
      },
    );

    const filtered = filterExpansion(answer.children, input.context);

    if (filtered.accepted.length >= minChildren) {
      return { ...filtered, model };
    }

    issues =
      filtered.rejected.length > 0
        ? filtered.rejected.map(
            (r) => `"${r.label}" was discarded: ${r.reason}`,
          )
        : [
            `You returned ${filtered.accepted.length} items; at least ${minChildren} are needed.`,
          ];
  }

  throw new UpstreamError(
    `The model could not produce a usable ${input.lens.toLowerCase()} level for "${input.targetName}". Try again, or try a more specific name.`,
    issues,
  );
};
