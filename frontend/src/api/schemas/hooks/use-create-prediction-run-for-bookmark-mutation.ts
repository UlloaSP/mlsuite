/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useCurrentOrganizationId } from "@/api/workspace/hooks/use-current-organization-id";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as schemaApi from "@/api/schemas/services";
import type { CreatePredictionRunRequest } from "@/api/schemas/dtos";
import { BOOKMARK_PREDICTION_RUNS_QUERY_KEY, PREDICTION_RUN_QUERY_KEY } from "./query-keys";

export function useCreatePredictionRunForBookmarkMutation(bookmarkId: string) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const qc = useQueryClient();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: (req: CreatePredictionRunRequest) =>
      schemaApi.createPredictionRunForBookmark(bookmarkId, req),
    onSuccess: (run) => {
      qc.setQueryData(PREDICTION_RUN_QUERY_KEY(organizationId, run.id), run);
      void qc.invalidateQueries({
        queryKey: BOOKMARK_PREDICTION_RUNS_QUERY_KEY(organizationId, bookmarkId),
      });
    },
  });
}
