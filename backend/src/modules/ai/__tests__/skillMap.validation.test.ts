import { test } from "node:test";
import assert from "node:assert/strict";
import { skillMapSchema, type GeneratedSkillMap } from "../skillMap.schema.ts";
import {
  isValidGeneratedMap,
  validateGeneratedMap,
} from "../skillMap.validation.ts";

const leaf = (label: string) => ({
  label,
  summary: `What ${label} is and why it is here.`,
  relation: "CORE" as const,
});

const sensibleMap: GeneratedSkillMap = {
  root: {
    label: "Angular",
    summary: "A framework for building web applications.",
  },
  children: [
    { ...leaf("TypeScript"), relation: "PREREQUISITE" },
    { ...leaf("HTML / CSS"), relation: "PREREQUISITE" },
    {
      ...leaf("RxJS"),
      children: [leaf("Observables"), leaf("Operators"), leaf("Subjects")],
    },
    { ...leaf("Testing"), relation: "ECOSYSTEM" },
  ],
};

// ---------------------------------------------------------------------------
// Shape: what Zod is responsible for.
// ---------------------------------------------------------------------------

test("the schema accepts a well-formed map", () => {
  assert.equal(skillMapSchema.safeParse(sensibleMap).success, true);
});

test("the schema rejects a map with too few branches", () => {
  const thin = { ...sensibleMap, children: sensibleMap.children.slice(0, 2) };
  assert.equal(skillMapSchema.safeParse(thin).success, false);
});

test("the schema rejects a missing summary", () => {
  const broken = {
    root: { label: "Angular" },
    children: sensibleMap.children,
  };
  assert.equal(skillMapSchema.safeParse(broken).success, false);
});

// ---------------------------------------------------------------------------
// Meaning: what Zod cannot be responsible for.
// ---------------------------------------------------------------------------

test("a sensible map produces no domain issues", () => {
  assert.deepEqual(validateGeneratedMap(sensibleMap), []);
  assert.equal(isValidGeneratedMap(sensibleMap), true);
});

test("the classic degenerate answer is structurally valid and still rejected", () => {
  const degenerate: GeneratedSkillMap = {
    root: { label: "Angular", summary: "A framework." },
    children: [
      { ...leaf("Angular"), children: [leaf("Angular")] },
      leaf("TypeScript"),
      leaf("RxJS"),
      leaf("Testing"),
    ],
  };

  assert.equal(skillMapSchema.safeParse(degenerate).success, true);
  assert.equal(isValidGeneratedMap(degenerate), false);
});

test("duplicate siblings are rejected, case and spacing ignored", () => {
  const duplicated: GeneratedSkillMap = {
    root: { label: "Angular", summary: "A framework." },
    children: [leaf("RxJS"), leaf("rxjs "), leaf("Testing"), leaf("Forms")],
  };

  const issues = validateGeneratedMap(duplicated);
  assert.equal(issues.length, 1);
  assert.match(issues[0]!.message, /appears twice/);
});

test("the same label under two different parents is allowed", () => {
  const shared: GeneratedSkillMap = {
    root: { label: "Angular", summary: "A framework." },
    children: [
      { ...leaf("RxJS"), children: [leaf("Testing")] },
      { ...leaf("Forms"), children: [leaf("Testing")] },
      leaf("Routing"),
      leaf("Signals"),
    ],
  };

  assert.deepEqual(validateGeneratedMap(shared), []);
});

test("an oversized map is rejected with its node count named", () => {
  const huge: GeneratedSkillMap = {
    root: { label: "Angular", summary: "A framework." },
    children: Array.from({ length: 10 }, (_, i) => ({
      ...leaf(`Branch ${i}`),
      children: Array.from({ length: 5 }, (_, j) => leaf(`Leaf ${i}-${j}`)),
    })),
  };

  const issues = validateGeneratedMap(huge);
  assert.equal(issues.length, 1);
  assert.match(issues[0]!.message, /61 nodes/);
});
