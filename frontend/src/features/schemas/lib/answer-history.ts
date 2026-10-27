/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { SchemaFeedbackStep } from "@/capabilities/prediction-runtime/feedback/feedback-steps";
import type { PredictionResultFeedbackRevisionDto } from "@/shared/api/openapi.gen";

export type AnswerHistoryGroup = {
  step: SchemaFeedbackStep;
  /** Newest first. */
  revisions: PredictionResultFeedbackRevisionDto[];
};

/**
 * The changes of the answers to each question of a run, newest first, kept to one author's when
 * one is given. A question is answered once per model that produced its report, so a step's
 * changes are those of every result it asks about.
 */
export const answerHistoryGroups = (
  steps: readonly SchemaFeedbackStep[],
  revisions: readonly PredictionResultFeedbackRevisionDto[],
  authorId?: number,
): AnswerHistoryGroup[] =>
  steps.flatMap((step) => {
    const resultIds = new Set(step.targets.map((target) => target.resultId));
    // Revisions are numbered as they are written, so the highest id is the latest change.
    const matching = revisions
      .filter(
        (revision) =>
          resultIds.has(revision.resultId) &&
          revision.type === step.type &&
          revision.order === step.order &&
          (authorId === undefined || revision.userId === authorId),
      )
      .sort((left, right) => right.id - left.id);
    return matching.length > 0 ? [{ step, revisions: matching }] : [];
  });
