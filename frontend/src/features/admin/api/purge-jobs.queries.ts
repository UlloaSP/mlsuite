import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PURGES_QUERY_KEY } from "@/capabilities/purge/purge-api";
import { appFetch } from "@/shared/api/http";
import { useInfiniteCatalog, type CatalogPage } from "@/shared/api/infinite-catalog";
import type { PurgeJobDto } from "@/shared/api/openapi.gen";

/** How often a purge still under way is read while the page is open. */
const PURGE_POLL_MS = 2000;

const running = (job: PurgeJobDto) => job.status === "QUEUED" || job.status === "RUNNING";

export const usePurgeJobs = (search: string, filter: string, enabled: boolean) =>
  useInfiniteCatalog({
    queryKey: [...PURGES_QUERY_KEY, "infinite", search, filter],
    queryFn: (page, signal) =>
      appFetch<CatalogPage<PurgeJobDto>>(
        `/api/admin/purges?${new URLSearchParams({ page: String(page), size: "24", search, filter })}`,
        { signal },
      ),
    enabled,
    refetchInterval: (pages) =>
      pages.some((page) => page.items.some(running)) ? PURGE_POLL_MS : false,
  });

export const useRetryPurge = () => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: (jobId: number) =>
      appFetch<PurgeJobDto>(`/api/admin/purges/${jobId}/retry`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PURGES_QUERY_KEY }),
  });
};
