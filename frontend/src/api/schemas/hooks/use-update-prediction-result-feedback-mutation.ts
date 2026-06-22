/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as schemaApi from "../services";
import type { UpdatePredictionResultFeedbackRequest } from "../dtos";
import { PREDICTION_RESULT_FEEDBACK_QUERY_KEY } from "./query-keys";

export function useUpdatePredictionResultFeedbackMutation(resultId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: UpdatePredictionResultFeedbackRequest) =>
      schemaApi.updatePredictionResultFeedback(req),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: PREDICTION_RESULT_FEEDBACK_QUERY_KEY(resultId) }),
  });
}
