import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { appFetch, json } from "@/shared/api/http";
import type { PurgeJobDto, PurgePreviewDto, RequestPurgeRequest } from "@/shared/api/openapi.gen";

export type PurgeScope = PurgeJobDto["scope"];

export const PURGES_QUERY_KEY = ["admin", "purges"] as const;

/** What the purge would destroy now; read each time the dialog opens, never from a cache. */
export const usePurgePreview = (scope: PurgeScope, targetId: number) =>
  useQuery({
    queryKey: [...PURGES_QUERY_KEY, "preview", scope, targetId],
    queryFn: ({ signal }) =>
      appFetch<PurgePreviewDto>(
        `/api/admin/purges/preview?${new URLSearchParams({ scope, targetId: String(targetId) })}`,
        { signal },
      ),
    gcTime: 0,
    meta: { errorHandledLocally: true },
  });

export const useRequestPurge = () => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: (request: RequestPurgeRequest) =>
      appFetch<PurgeJobDto>("/api/admin/purges", json("POST", request)),
    // The target leaves catalogs of every kind, which belong to other features.
    onSuccess: () => queryClient.invalidateQueries(),
  });
};
