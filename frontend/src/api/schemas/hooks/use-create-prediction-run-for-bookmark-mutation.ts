/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as schemaApi from "../services";
import type { CreatePredictionRunRequest } from "../dtos";
import { BOOKMARK_PREDICTION_RUNS_QUERY_KEY, PREDICTION_RUN_QUERY_KEY } from "./query-keys";

export function useCreatePredictionRunForBookmarkMutation(bookmarkId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreatePredictionRunRequest) =>
      schemaApi.createPredictionRunForBookmark(bookmarkId, req),
    onSuccess: (run) => {
      qc.setQueryData(PREDICTION_RUN_QUERY_KEY(run.id), run);
      void qc.invalidateQueries({ queryKey: BOOKMARK_PREDICTION_RUNS_QUERY_KEY(bookmarkId) });
    },
  });
}
