import { useMutation, useQueryClient } from "@tanstack/react-query";
import { submitSchemaReviewRuns } from "./review-api";
import { SCHEMA_REVIEW_CONTEXT_QUERY_KEY } from "./review-keys";

export const useSubmitSchemaReviewRunsMutation = (token: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (runTokens: string[]) => submitSchemaReviewRuns(token, runTokens),
    onSuccess: () => qc.invalidateQueries({ queryKey: SCHEMA_REVIEW_CONTEXT_QUERY_KEY(token) }),
  });
};
