/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useCurrentOrganizationId } from "@/api/workspace/hooks/use-current-organization-id";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as schemaApi from "@/api/schemas/services";
import type { CreatePredictionResultFeedbackRequest } from "@/api/schemas/dtos";
import { PREDICTION_RESULT_FEEDBACK_QUERY_KEY } from "./query-keys";

export function useCreatePredictionResultFeedbackMutation(resultId: string) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreatePredictionResultFeedbackRequest) =>
      schemaApi.createPredictionResultFeedback(req),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: PREDICTION_RESULT_FEEDBACK_QUERY_KEY(organizationId, resultId),
      }),
  });
}
