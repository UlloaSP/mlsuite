/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useCurrentOrganizationId } from "@/api/workspace/hooks/use-current-organization-id";
import { useQueries } from "@tanstack/react-query";
import type { PredictionRunDto } from "@/api/schemas/dtos";
import { predictionResultFeedbackQueryOptions } from "@/api/schemas/schema-queries";

export const usePredictionRunFeedback = (run?: PredictionRunDto) => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const queries = useQueries({
    queries: (run?.results ?? []).map((result) => ({
      ...predictionResultFeedbackQueryOptions(organizationId, result.id),
      placeholderData: [],
    })),
  });
  return {
    data: queries.flatMap((query) => query.data ?? []),
    isLoading: queries.some((query) => query.isLoading),
    refetch: () => Promise.all(queries.map((query) => query.refetch())),
  };
};
