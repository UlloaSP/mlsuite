import { queryOptions, useQuery } from "@tanstack/react-query";
import { appFetch } from "@/shared/api/http";
import { organizationQueryKey } from "@/shared/api/organization-query-key";

export interface PluginRuntimeSource {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
  source: string;
}

type PluginRuntimePage = {
  items: PluginRuntimeSource[];
  hasNext: boolean;
};

export const PLUGIN_RUNTIME_SOURCES_QUERY_KEY = (organizationId: number | string) =>
  [...organizationQueryKey(organizationId), "pluginRuntimeSources"] as const;

export const getAllPluginRuntimeSources = async (
  signal?: AbortSignal,
  size = 100,
): Promise<PluginRuntimeSource[]> => {
  const items: PluginRuntimeSource[] = [];
  let page = 0;
  while (true) {
    const params = new URLSearchParams({
      page: String(page),
      search: "",
      size: String(size),
      sort: "updated",
      type: "all",
    });
    const response = await appFetch<PluginRuntimePage>(`/api/plugins?${params.toString()}`, {
      signal,
    });
    items.push(...response.items);
    if (!response.hasNext) return items;
    page += 1;
  }
};

export const pluginRuntimeSourcesQueryOptions = (organizationId: number | string) =>
  queryOptions({
    queryKey: PLUGIN_RUNTIME_SOURCES_QUERY_KEY(organizationId),
    queryFn: ({ signal }) => getAllPluginRuntimeSources(signal),
  });

export const usePluginRuntimeSourcesQuery = (organizationId: number | string, enabled = true) =>
  useQuery({ ...pluginRuntimeSourcesQueryOptions(organizationId), enabled });
