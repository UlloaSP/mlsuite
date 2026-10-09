import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { appFetch, json } from "@/shared/api/http";
import { useInfiniteCatalog } from "@/shared/api/infinite-catalog";
import type { CatalogSelectionPageDto, CreateSchemaReviewRequest } from "@/shared/api/openapi.gen";
import { organizationQueryKey } from "@/shared/api/organization-query-key";

export type ReviewCandidate = {
  runId: string;
  name: string;
  createdAt: string;
  schemaId: string;
  versionId: string;
  groupLabel: string;
  bookmarkId?: string | null;
  bookmarkName?: string | null;
};

export type ReviewCandidateGroup = {
  key: string;
  label: string;
  schemaId: string;
  versionId: string;
  candidates: ReviewCandidate[];
};

export const REVIEWS_ROOT_QUERY_KEY = (organizationId: number | string) =>
  [...organizationQueryKey(organizationId), "schemaReviews"] as const;
export const INFERENCE_REVIEW_ASSIGNMENTS_ROOT_QUERY_KEY = (organizationId: number | string) =>
  [...organizationQueryKey(organizationId), "inferenceReviewAssignments"] as const;
export const INFERENCE_REVIEW_ASSIGNMENTS_QUERY_KEY = (
  organizationId: number | string,
  inferenceId: number,
) => [...INFERENCE_REVIEW_ASSIGNMENTS_ROOT_QUERY_KEY(organizationId), inferenceId] as const;

export const groupReviewCandidates = (candidates: ReviewCandidate[]): ReviewCandidateGroup[] => {
  const groups = new Map<string, ReviewCandidateGroup>();
  candidates.forEach((candidate) => {
    const key = `${candidate.schemaId}:${candidate.versionId}`;
    const group = groups.get(key);
    if (group) group.candidates.push(candidate);
    else {
      groups.set(key, {
        key,
        label: candidate.groupLabel,
        schemaId: candidate.schemaId,
        versionId: candidate.versionId,
        candidates: [candidate],
      });
    }
  });
  return [...groups.values()];
};

export function useCreateReviewMutation(organizationId: number | string) {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: (request: CreateSchemaReviewRequest) =>
      appFetch<void>("/api/schema-reviews", json("POST", request)),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: REVIEWS_ROOT_QUERY_KEY(organizationId) }),
        queryClient.invalidateQueries({
          queryKey: INFERENCE_REVIEW_ASSIGNMENTS_ROOT_QUERY_KEY(organizationId),
        }),
      ]),
  });
}

/** What a selection dialog browses: an explicit set of inferences, their facets, or reviewers. */
export type SelectionRequest = {
  kind: "runs" | "reviewers" | "snapshots" | "bookmarks";
  ids: number[];
  search: string;
  size: number;
  locale?: string;
  timeZone?: string;
};

const selectionKey = (organizationId: number | string, scope: "infinite" | "ids") =>
  [...organizationQueryKey(organizationId), "catalog-selection", scope] as const;

export function useSelectionCatalog(
  organizationId: number | string,
  request: SelectionRequest,
  handlesErrors = false,
) {
  return useInfiniteCatalog({
    queryKey: [...selectionKey(organizationId, "infinite"), request],
    queryFn: (page, signal) =>
      appFetch<CatalogSelectionPageDto>("/api/catalog-selection", {
        ...json("POST", { ...request, page }),
        signal,
      }),
    meta: handlesErrors ? { errorHandledLocally: true } : undefined,
    enabled: organizationId !== "none",
  });
}

/** Every id the search matches on the server, for "Select all" and "Select results". */
export const selectionIdsQueryOptions = (
  organizationId: number | string,
  request: SelectionRequest,
) =>
  queryOptions({
    queryKey: [...selectionKey(organizationId, "ids"), request],
    staleTime: 0,
    queryFn: ({ signal }) =>
      appFetch<string[]>("/api/catalog-selection/ids", {
        ...json("POST", { ...request, page: 0 }),
        signal,
      }),
  });
