/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../services";
import { SCHEMA_REVIEW_CONTEXT_QUERY_KEY } from "./query-keys";

export const useSubmitSchemaReviewRunsMutation = (token: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (runTokens: string[]) => api.submitSchemaReviewRuns(token, runTokens),
    onSuccess: () => qc.invalidateQueries({ queryKey: SCHEMA_REVIEW_CONTEXT_QUERY_KEY(token) }),
  });
};
