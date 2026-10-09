import { queryOptions, useQuery } from "@tanstack/react-query";
import { appFetch } from "@/shared/api/http";
import { useInfiniteCatalog, type CatalogPage } from "@/shared/api/infinite-catalog";
import type { PublicBookmarkExampleDto, PublicRunDto } from "@/shared/api/openapi.gen";
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
export const usePublicRunDetail = (id: string, runId: number | null) =>
  useQuery(publicRunDetailOptions(id, runId));
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
