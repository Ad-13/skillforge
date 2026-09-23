import { test } from "node:test";
import assert from "node:assert/strict";
import { filterExpansion, type ExpansionContext } from "../expansion.guard.ts";
import type { GeneratedChild } from "../expansion.schema.ts";

const child = (
  label: string,
  relation: GeneratedChild["relation"] = "PREREQUISITE",
): GeneratedChild => ({
  label,
  summary: `Why ${label} belongs here.`,
  relation,
});

const context = (over: Partial<ExpansionContext> = {}): ExpansionContext => ({
  lens: "FOUNDATION",
  targetSlug: "react",
  pathSlugs: ["react"],
  siblingSlugs: [],
  mapSlugs: ["react"],
  ...over,
});

const labels = (children: readonly { label: string }[]): string[] =>
  children.map((c) => c.label);

test("a child that repeats the node being expanded is dropped", () => {
  const { accepted, rejected } = filterExpansion(
    [child("React"), child("JavaScript")],
    context(),
  );

  assert.deepEqual(labels(accepted), ["JavaScript"]);
  assert.match(rejected[0]!.reason, /repeats the node/);
});

test("a child anywhere on the path from the root is dropped", () => {
  const ctx = context({
    targetSlug: "dom",
    pathSlugs: ["react", "javascript", "dom"],
    mapSlugs: ["react", "javascript", "dom"],
  });

  const { accepted, rejected } = filterExpansion(
    [child("React"), child("JavaScript"), child("HTML")],
    ctx,
  );

  assert.deepEqual(labels(accepted), ["HTML"]);
  assert.equal(rejected.length, 2);
  for (const r of rejected) assert.match(r.reason, /already on the path/);
});

test("an unlimited chain stays finite because every level forbids the ones above", () => {
  const chain = ["react", "javascript", "dom", "html"];
  const names = ["React", "JavaScript", "The DOM", "HTML"];

  for (let depth = 1; depth < chain.length; depth += 1) {
    const ctx = context({
      targetSlug: chain[depth] as string,
      pathSlugs: chain.slice(0, depth + 1),
      mapSlugs: chain.slice(0, depth + 1),
    });

    const { accepted } = filterExpansion(
      names.slice(0, depth + 1).map((n) => child(n)),
      ctx,
    );

    assert.equal(accepted.length, 0, `depth ${depth} let an ancestor through`);
  }
});

test("two spellings of one skill in one answer collapse to one child", () => {
  const { accepted, rejected } = filterExpansion(
    [child("JS"), child("JavaScript")],
    context(),
  );

  assert.equal(accepted.length, 1);
  assert.equal(accepted[0]!.slug, "javascript");
  assert.match(rejected[0]!.reason, /duplicate/);
});

test("a child that is already listed under this node is dropped", () => {
  const ctx = context({ siblingSlugs: ["javascript"] });
  const { accepted, rejected } = filterExpansion(
    [child("JavaScript"), child("HTML")],
    ctx,
  );

  assert.deepEqual(labels(accepted), ["HTML"]);
  assert.match(rejected[0]!.reason, /already a child/);
});

test("a slug seen elsewhere in the map is kept, and flagged", () => {
  const ctx = context({
    targetSlug: "rest",
    pathSlugs: ["react", "rest"],
    mapSlugs: ["react", "rest", "http"],
  });

  const { accepted } = filterExpansion([child("HTTP")], ctx);

  assert.equal(accepted.length, 1);
  assert.equal(accepted[0]!.alreadyInMap, true);
});

test("labels are stored canonically, not as the model wrote them", () => {
  const { accepted } = filterExpansion(
    [child("js"), child("postgres")],
    context(),
  );
  assert.deepEqual(labels(accepted), ["JavaScript", "PostgreSQL"]);
});

test("the lens decides the relation; only RELATED is taken from the model", () => {
  const anatomy = context({
    lens: "ANATOMY",
    targetSlug: "react",
    pathSlugs: ["react"],
  });

  const { accepted } = filterExpansion(
    [
      child("Hooks", "PREREQUISITE"),
      child("Suspense", "RELATED"),
      child("JSX", "ECOSYSTEM"),
    ],
    anatomy,
  );

  assert.deepEqual(
    accepted.map((c) => c.relation),
    ["CORE", "RELATED", "CORE"],
  );
});

test("each lens has its own default relation", () => {
  const of = (lens: ExpansionContext["lens"]) =>
    filterExpansion([child("Redux", "CORE")], context({ lens }))!.accepted[0]!
      .relation;

  assert.equal(of("FOUNDATION"), "PREREQUISITE");
  assert.equal(of("ANATOMY"), "CORE");
  assert.equal(of("ECOSYSTEM"), "ECOSYSTEM");
});

test("an empty answer passes through as an empty answer", () => {
  const { accepted, rejected } = filterExpansion([], context());
  assert.deepEqual(accepted, []);
  assert.deepEqual(rejected, []);
});

test("an unnameable label is rejected rather than stored with an empty slug", () => {
  const { accepted, rejected } = filterExpansion(
    [child("———"), child("HTML")],
    context(),
  );

  assert.deepEqual(labels(accepted), ["HTML"]);
  assert.match(rejected[0]!.reason, /not a nameable skill/);
});
