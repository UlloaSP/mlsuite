/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useCurrentOrganizationId } from "@/api/workspace/hooks/use-current-organization-id";
import { useQueries } from "@tanstack/react-query";
import * as schemaApi from "@/api/schemas/services";
import type { PredictionRunDto } from "@/api/schemas/dtos";
import { PREDICTION_RESULT_FEEDBACK_QUERY_KEY } from "./query-keys";

export const usePredictionRunsFeedback = (runs: readonly PredictionRunDto[]) => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const resultIds = runs.flatMap((run) => run.results.map((result) => result.id));
  const queries = useQueries({
    queries: resultIds.map((resultId) => ({
      queryKey: PREDICTION_RESULT_FEEDBACK_QUERY_KEY(organizationId, resultId),
      queryFn: () => schemaApi.getPredictionResultFeedback(resultId),
      placeholderData: [],
    })),
  });
  return {
    data: queries.flatMap((query) => query.data ?? []),
    isLoading: queries.some((query) => query.isLoading),
  };
};
