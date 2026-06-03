import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "./api/schemaReviewLinkService";

export const SCHEMA_REVIEW_CONTEXT_QUERY_KEY = (token: string) =>
  ["schemaReviewContext", { token }] as const;
export const SCHEMA_REVIEW_RUN_QUERY_KEY = (token: string, runToken: string) =>
  ["schemaReviewRun", { token, runToken }] as const;
export const SCHEMA_REVIEW_LINKS_QUERY_KEY = (schemaId: string, versionId: string) =>
  ["schemaReviewLinks", { schemaId, versionId }] as const;

export const useSchemaReviewContext = (token: string) =>
  useQuery({
    queryKey: SCHEMA_REVIEW_CONTEXT_QUERY_KEY(token),
    queryFn: () => api.getSchemaReviewContext(token),
  });

export const useSchemaReviewRun = (token: string, runToken: string) =>
  useQuery({
    queryKey: SCHEMA_REVIEW_RUN_QUERY_KEY(token, runToken),
    queryFn: () => api.getSchemaReviewRunDetail(token, runToken),
    enabled: Boolean(token && runToken),
  });

export const useSchemaReviewLinks = (schemaId: string, versionId: string) =>
  useQuery({
    queryKey: SCHEMA_REVIEW_LINKS_QUERY_KEY(schemaId, versionId),
    queryFn: () => api.listSchemaReviewLinks(schemaId, versionId),
    enabled: Boolean(schemaId && versionId),
    placeholderData: [],
  });

export function useCreateSchemaReviewLinkMutation(schemaId: string, versionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createSchemaReviewLink,
    onSuccess: () => qc.invalidateQueries({ queryKey: SCHEMA_REVIEW_LINKS_QUERY_KEY(schemaId, versionId) }),
  });
}

export function useRevokeSchemaReviewLinkMutation(schemaId: string, versionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.revokeSchemaReviewLink,
    onSuccess: () => qc.invalidateQueries({ queryKey: SCHEMA_REVIEW_LINKS_QUERY_KEY(schemaId, versionId) }),
  });
}

export const useSubmitSchemaReviewRunsMutation = (token: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (runTokens: string[]) => api.submitSchemaReviewRuns(token, runTokens),
    onSuccess: () => qc.invalidateQueries({ queryKey: SCHEMA_REVIEW_CONTEXT_QUERY_KEY(token) }),
  });
};
