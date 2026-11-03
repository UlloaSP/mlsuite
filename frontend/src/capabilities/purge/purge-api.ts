import { mutationOptions, queryOptions, useMutation, useQuery } from "@tanstack/react-query";
import { appFetch, json } from "@/shared/api/http";
import type { PurgeJobDto, PurgePreviewDto, RequestPurgeRequest } from "@/shared/api/openapi.gen";

export type PurgeScope = PurgeJobDto["scope"];

export const PURGES_QUERY_KEY = ["admin", "purges"] as const;

/** What the purge would destroy now; read each time the dialog opens, never from a cache. */
export const purgePreviewQueryOptions = (scope: PurgeScope, targetId: number) =>
  queryOptions({
    queryKey: [...PURGES_QUERY_KEY, "preview", scope, targetId],
    queryFn: ({ signal }) =>
      appFetch<PurgePreviewDto>(
        `/api/admin/purges/preview?${new URLSearchParams({ scope, targetId: String(targetId) })}`,
        { signal },
      ),
    gcTime: 0,
    meta: { errorHandledLocally: true },
  });

export const usePurgePreview = (scope: PurgeScope, targetId: number) =>
  useQuery(purgePreviewQueryOptions(scope, targetId));

/**
 * The cache roots a purged target can appear under: tenant data, the public site and the
 * platform's own catalogs for any target; a person also in profiles and the platform's audit
 * log; an organization also in the member's own list of organizations and invitations.
 */
const PURGED_ROOTS: Record<PurgeScope, readonly string[]> = {
  MODEL: ["org", "public", "admin"],
  SCHEMA: ["org", "public", "admin"],
  USER: ["org", "public", "admin", "platformAuditEvents"],
  ORGANIZATION: [
    "org",
    "public",
    "admin",
    "platformAuditEvents",
    "workspaceContext",
    "organizationCatalogPages",
    "pendingInvitations",
  ],
};

const requestPurgeMutation = mutationOptions({
  meta: { errorHandledLocally: true },
  mutationFn: (request: RequestPurgeRequest) =>
    appFetch<PurgeJobDto>("/api/admin/purges", json("POST", request)),
  onSuccess: (_job, request, _result, { client }) =>
    Promise.all(
      PURGED_ROOTS[request.scope].map((root) => client.invalidateQueries({ queryKey: [root] })),
    ),
});

export const useRequestPurge = () => useMutation(requestPurgeMutation);
