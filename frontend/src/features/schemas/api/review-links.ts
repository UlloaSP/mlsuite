import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { organizationQueryKey } from "@/shared/api/organization-query-key";
import { appFetch, json } from "@/shared/api/http";

type CreateSchemaReviewLinkRequest = {
  schemaId: string;
  versionId: string;
  runIds: string[];
  expiresAt?: string;
};

type SchemaReviewLinkCreateResponse = {
  id: number;
  url: string;
  expiresAt: string;
  runCount: number;
};

type SchemaReviewLinkSummaryDto = {
  id: number;
  schemaId: string;
  versionId: string;
  createdByEmail: string;
  expiresAt: string;
  revokedAt?: string | null;
  createdAt: string;
  token?: string | null;
  runCount: number;
};

const reviewLinksKey = (organizationId: number | string, schemaId: string, versionId: string) =>
  [...organizationQueryKey(organizationId), "schemaReviewLinks", { schemaId, versionId }] as const;

const createReviewLink = (request: CreateSchemaReviewLinkRequest) =>
  appFetch<SchemaReviewLinkCreateResponse>("/api/schema-review-links", json("POST", request));

const listReviewLinks = (schemaId: string, versionId: string, signal?: AbortSignal) =>
  appFetch<SchemaReviewLinkSummaryDto[]>(
    `/api/schema-review-links?schemaId=${encodeURIComponent(schemaId)}&versionId=${encodeURIComponent(versionId)}`,
    { signal },
  );

const revokeReviewLink = (id: number) =>
  appFetch<void>(`/api/schema-review-links/${id}/revoke`, json("POST"));

export const schemaReviewLinksQueryOptions = (
  organizationId: number | string,
  schemaId: string,
  versionId: string,
) =>
  queryOptions({
    queryKey: reviewLinksKey(organizationId, schemaId, versionId),
    queryFn: ({ signal }) => listReviewLinks(schemaId, versionId, signal),
    enabled: Boolean(organizationId && schemaId && versionId),
  });

export const useSchemaReviewLinks = (schemaId: string, versionId: string) => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery({
    ...schemaReviewLinksQueryOptions(organizationId, schemaId, versionId),
    placeholderData: [],
  });
};

export function useCreateSchemaReviewLinkMutation(schemaId: string, versionId: string) {
  const queryClient = useQueryClient();
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: createReviewLink,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: reviewLinksKey(organizationId, schemaId, versionId),
      }),
  });
}

export function useRevokeSchemaReviewLinkMutation(schemaId: string, versionId: string) {
  const queryClient = useQueryClient();
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useMutation({
    mutationFn: revokeReviewLink,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: reviewLinksKey(organizationId, schemaId, versionId),
      }),
  });
}
