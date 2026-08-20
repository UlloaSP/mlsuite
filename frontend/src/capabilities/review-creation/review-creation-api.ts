import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { appFetch, json } from "@/shared/api/http";
import { organizationQueryKey } from "@/shared/api/organization-query-key";

export type ReviewCandidate = {
  runId: string;
  name: string;
  createdAt: string;
  schemaId: string;
  versionId: string;
  groupLabel: string;
};

export type ReviewCandidateGroup = {
  key: string;
  label: string;
  schemaId: string;
  versionId: string;
  candidates: ReviewCandidate[];
};

export type ReviewReviewerDto = {
  id: number;
  fullName: string;
  email: string;
};

type CreateReviewRequest = {
  schemaId: number;
  versionId: number;
  runIds: number[];
  reviewerIds: number[];
  expiresAt?: string;
};

export const REVIEWS_ROOT_QUERY_KEY = (organizationId: number | string) =>
  [...organizationQueryKey(organizationId), "schemaReviews"] as const;
export const INFERENCE_REVIEW_ASSIGNMENTS_ROOT_QUERY_KEY = (organizationId: number | string) =>
  [...organizationQueryKey(organizationId), "inferenceReviewAssignments"] as const;
export const INFERENCE_REVIEW_ASSIGNMENTS_QUERY_KEY = (
  organizationId: number | string,
  inferenceId: number,
) => [...INFERENCE_REVIEW_ASSIGNMENTS_ROOT_QUERY_KEY(organizationId), inferenceId] as const;

export const eligibleReviewersQueryOptions = (organizationId: number | string) =>
  queryOptions({
    queryKey: [...REVIEWS_ROOT_QUERY_KEY(organizationId), "eligibleReviewers"],
    queryFn: ({ signal }) =>
      appFetch<ReviewReviewerDto[]>("/api/schema-reviews/eligible-reviewers", { signal }),
    enabled: organizationId !== "none",
  });

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

export const useEligibleReviewers = (organizationId: number | string) =>
  useQuery(eligibleReviewersQueryOptions(organizationId));

export function useCreateReviewMutation(organizationId: number | string) {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: (request: CreateReviewRequest) =>
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
