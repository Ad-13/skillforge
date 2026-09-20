export interface ProgressStep {
  completedAt: Date | null;
}

export interface ProgressStage {
  title: string;
  steps: ProgressStep[];
}

export const isStageComplete = (stage: ProgressStage): boolean =>
  stage.steps.length > 0 &&
  stage.steps.every((step) => step.completedAt !== null);

export interface StepCounts {
  total: number;
  completed: number;
}

export const countSteps = (stages: readonly ProgressStage[]): StepCounts => {
  let total = 0;
  let completed = 0;

  for (const stage of stages) {
    for (const step of stage.steps) {
      total += 1;
      if (step.completedAt !== null) completed += 1;
    }
  }

  return { total, completed };
};

export const progressOf = (stages: readonly ProgressStage[]): number => {
  const { total, completed } = countSteps(stages);
  return total === 0 ? 0 : completed / total;
};

export const highestCompletedStage = (
  stages: readonly ProgressStage[],
): ProgressStage | null => {
  let found: ProgressStage | null = null;

  for (const stage of stages) {
    if (isStageComplete(stage)) found = stage;
  }

  return found;
};

export const lastWorkedStage = (
  stages: readonly ProgressStage[],
): ProgressStage | null => {
  let found: ProgressStage | null = null;
  let latest = -Infinity;

  for (const stage of stages) {
    for (const step of stage.steps) {
      if (step.completedAt === null) continue;

      const at = step.completedAt.getTime();
      if (at > latest) {
        latest = at;
        found = stage;
      }
    }
  }

  return found;
};

export const lastActivityAt = (
  stages: readonly ProgressStage[],
): Date | null => {
  let found: Date | null = null;

  for (const stage of stages) {
    for (const step of stage.steps) {
      if (step.completedAt === null) continue;
      if (found === null || step.completedAt > found) found = step.completedAt;
    }
  }

  return found;
};

export interface ProgressSummary {
  progress: number;
  totalSteps: number;
  completedSteps: number;
  highestCompletedStage: string | null;
  lastWorkedStage: string | null;
  lastActivityAt: Date | null;
}

export const summariseProgress = (
  stages: readonly ProgressStage[],
): ProgressSummary => {
  const { total, completed } = countSteps(stages);

  return {
    progress: total === 0 ? 0 : completed / total,
    totalSteps: total,
    completedSteps: completed,
    highestCompletedStage: highestCompletedStage(stages)?.title ?? null,
    lastWorkedStage: lastWorkedStage(stages)?.title ?? null,
    lastActivityAt: lastActivityAt(stages),
  };
};
