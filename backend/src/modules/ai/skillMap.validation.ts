import type { GeneratedSkillMap } from "./skillMap.schema.ts";

export interface MapValidationIssue {
  path: string;
  message: string;
}

const MAX_NODES = 40;

const normalise = (label: string): string => label.trim().toLowerCase();

export const validateGeneratedMap = (
  map: GeneratedSkillMap,
): MapValidationIssue[] => {
  const issues: MapValidationIssue[] = [];
  const rootLabel = normalise(map.root.label);

  let nodeCount = 1;

  const seenAtTop = new Set<string>();

  map.children.forEach((child, index) => {
    const childLabel = normalise(child.label);
    const path = `children[${index}]`;

    nodeCount += 1;

    if (childLabel === rootLabel) {
      issues.push({
        path,
        message: `"${child.label}" repeats the root skill and cannot be a child of itself`,
      });
    }

    if (seenAtTop.has(childLabel)) {
      issues.push({
        path,
        message: `"${child.label}" appears twice at the same level`,
      });
    }
    seenAtTop.add(childLabel);

    const seenAmongLeaves = new Set<string>();

    child.children?.forEach((leaf, leafIndex) => {
      const leafLabel = normalise(leaf.label);
      const leafPath = `${path}.children[${leafIndex}]`;

      nodeCount += 1;

      if (leafLabel === childLabel) {
        issues.push({
          path: leafPath,
          message: `"${leaf.label}" repeats its parent and cannot be a child of itself`,
        });
      }

      if (leafLabel === rootLabel) {
        issues.push({
          path: leafPath,
          message: `"${leaf.label}" repeats the root skill`,
        });
      }

      if (seenAmongLeaves.has(leafLabel)) {
        issues.push({
          path: leafPath,
          message: `"${leaf.label}" appears twice under the same parent`,
        });
      }
      seenAmongLeaves.add(leafLabel);
    });
  });

  if (nodeCount > MAX_NODES) {
    issues.push({
      path: "children",
      message: `The map has ${nodeCount} nodes; ${MAX_NODES} is the most a person can read at once`,
    });
  }

  return issues;
};

export const isValidGeneratedMap = (map: GeneratedSkillMap): boolean =>
  validateGeneratedMap(map).length === 0;
