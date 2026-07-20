/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useCurrentOrganizationId } from "@/api/workspace/hooks/use-current-organization-id";
import { useQuery } from "@tanstack/react-query";
import * as schemaApi from "@/api/schemas/services";
import { PREDICTION_RESULT_FEEDBACK_QUERY_KEY } from "./query-keys";

export const usePredictionResultFeedback = (resultId?: string) => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery({
    queryKey: PREDICTION_RESULT_FEEDBACK_QUERY_KEY(organizationId, resultId ?? ""),
    queryFn: () => schemaApi.getPredictionResultFeedback(resultId ?? ""),
    enabled: Boolean(resultId),
    placeholderData: [],
  });
};
