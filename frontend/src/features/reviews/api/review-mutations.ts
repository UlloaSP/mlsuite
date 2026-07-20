import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createSchemaReviewLink,
  revokeSchemaReviewLink,
  submitSchemaReviewRuns,
} from "./review-api";
import { SCHEMA_REVIEW_CONTEXT_QUERY_KEY, SCHEMA_REVIEW_LINKS_QUERY_KEY } from "./review-keys";

export function useCreateSchemaReviewLinkMutation(schemaId: string, versionId: string) {
  const qc = useQueryClient();
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: createSchemaReviewLink,
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: SCHEMA_REVIEW_LINKS_QUERY_KEY(organizationId, schemaId, versionId),
      }),
  });
}

export function useRevokeSchemaReviewLinkMutation(schemaId: string, versionId: string) {
  const qc = useQueryClient();
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useMutation({
    mutationFn: revokeSchemaReviewLink,
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: SCHEMA_REVIEW_LINKS_QUERY_KEY(organizationId, schemaId, versionId),
      }),
  });
}

export const useSubmitSchemaReviewRunsMutation = (token: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (runTokens: string[]) => submitSchemaReviewRuns(token, runTokens),
    onSuccess: () => qc.invalidateQueries({ queryKey: SCHEMA_REVIEW_CONTEXT_QUERY_KEY(token) }),
  });
};
