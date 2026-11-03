import { mutationOptions, queryOptions, useMutation, useQuery } from "@tanstack/react-query";
import { appFetch } from "@/shared/api/http";
import { useInfiniteCatalog, type CatalogPage } from "@/shared/api/infinite-catalog";
import type {
  PublicBookmarkExampleDto,
  PublicPredictionRequest,
  PublicRunDto,
  PublicRunFeedbackRequest,
} from "@/shared/api/openapi.gen";
import { publicRunLimitQuota } from "@/features/explore/lib/public-run-limit";
import {
  publicRunQuotaQueryOptions,
  runPublicBookmark,
  savePublicRunFeedback,
} from "./public-bookmark-api";
const root = (id: string) => ["public", "bookmark", id] as const;
const path = (id: string) => `/api/public/bookmarks/${encodeURIComponent(id)}`;
export const publicRunCatalogKey = (id: string) => [...root(id), "runs", "infinite"] as const;
export function usePublicRunCatalog(id: string) {
  return useInfiniteCatalog({
    queryKey: publicRunCatalogKey(id),
    queryFn: (page, signal) =>
      appFetch<CatalogPage<PublicRunDto>>(`${path(id)}/runs/catalog?page=${page}&size=24`, {
        signal,
      }),
    staleTime: 0,
    retry: false,
    meta: { errorHandledLocally: true },
  });
}
export const publicRunDetailOptions = (id: string, runId: number | null) =>
  queryOptions({
    queryKey: [...root(id), "run", runId],
    enabled: runId !== null,
    queryFn: ({ signal }) => appFetch<PublicRunDto>(`${path(id)}/runs/${runId}`, { signal }),
    staleTime: 0,
    retry: false,
    meta: { errorHandledLocally: true },
  });
/** One run, shown as `listed` (its row in the runs list) until the server's answer arrives. */
export const usePublicRunDetail = (id: string, runId: number | null, listed?: PublicRunDto) =>
  useQuery({ ...publicRunDetailOptions(id, runId), placeholderData: listed });

/**
 * Runs the bookmark once; the server keeps the run as this browser's and answers with it and the
 * quota left. A run refused for having none left carries that quota; some other refusals count
 * and some do not, so then the server is asked again.
 */
const runPublicBookmarkMutation = (id: string, caller: "visitor" | "member") =>
  mutationOptions({
    meta: { errorHandledLocally: true },
    mutationFn: (request: PublicPredictionRequest) => runPublicBookmark(id, request),
    onSuccess: (result, _request, _result, { client }) => {
      client.setQueryData(publicRunQuotaQueryOptions(id, caller).queryKey, result.quota);
      client.setQueryData(publicRunDetailOptions(id, result.run.id).queryKey, result.run);
      void client.invalidateQueries({ queryKey: publicRunCatalogKey(id) });
    },
    onError: (error, _request, _result, { client }) => {
      const { queryKey } = publicRunQuotaQueryOptions(id, caller);
      const used = publicRunLimitQuota(error);
      if (used) client.setQueryData(queryKey, used);
      else void client.invalidateQueries({ queryKey });
    },
  });
export const useRunPublicBookmark = (id: string, caller: "visitor" | "member") =>
  useMutation(runPublicBookmarkMutation(id, caller));
/** The run that comes back with the caller's answers replaces the cached one. */
const savePublicRunFeedbackMutation = (id: string, runId: number) =>
  mutationOptions({
    meta: { errorHandledLocally: true },
    mutationFn: (request: PublicRunFeedbackRequest) => savePublicRunFeedback(id, runId, request),
    onSuccess: (saved, _request, _result, { client }) => {
      client.setQueryData(publicRunDetailOptions(id, saved.id).queryKey, saved);
      void client.invalidateQueries({ queryKey: publicRunCatalogKey(id) });
    },
  });
export const useSavePublicRunFeedback = (id: string, runId: number) =>
  useMutation(savePublicRunFeedbackMutation(id, runId));
export function usePublicExampleCatalog(id: string, search: string) {
  return useInfiniteCatalog({
    queryKey: [...root(id), "examples", "infinite", search],
    queryFn: (page, signal) =>
      appFetch<CatalogPage<PublicBookmarkExampleDto>>(
        `${path(id)}/examples/catalog?${new URLSearchParams({ page: String(page), size: "24", search })}`,
        { signal },
      ),
    meta: { errorHandledLocally: true },
  });
}
