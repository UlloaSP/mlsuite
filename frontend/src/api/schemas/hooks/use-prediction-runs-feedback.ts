/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useCurrentOrganizationId } from "@/api/workspace/hooks/use-current-organization-id";
import { useQueries } from "@tanstack/react-query";
import type { PredictionRunDto } from "@/api/schemas/dtos";
import { predictionResultFeedbackQueryOptions } from "@/api/schemas/schema-queries";

export const usePredictionRunsFeedback = (runs: readonly PredictionRunDto[]) => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const resultIds = runs.flatMap((run) => run.results.map((result) => result.id));
  const queries = useQueries({
    queries: resultIds.map((resultId) => ({
      ...predictionResultFeedbackQueryOptions(organizationId, resultId),
      placeholderData: [],
    })),
  });
  return {
    data: queries.flatMap((query) => query.data ?? []),
    isLoading: queries.some((query) => query.isLoading),
  };
};
