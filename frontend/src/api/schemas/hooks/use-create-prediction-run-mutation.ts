/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as schemaApi from "../services";
import type { CreatePredictionRunRequest } from "../dtos";
import { PREDICTION_RUN_QUERY_KEY, PREDICTION_RUNS_QUERY_KEY } from "./query-keys";

export function useCreatePredictionRunMutation(versionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreatePredictionRunRequest) => schemaApi.createPredictionRun(versionId, req),
    onSuccess: (run) => {
      qc.setQueryData(PREDICTION_RUN_QUERY_KEY(run.id), run);
      qc.invalidateQueries({ queryKey: PREDICTION_RUNS_QUERY_KEY(versionId) });
    },
  });
}
