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

export const PLUGIN_RUNTIME_SOURCES_QUERY_KEY = (organizationId: number | string) =>
  [...organizationQueryKey(organizationId), "pluginRuntimeSources"] as const;

export const getAllPluginRuntimeSources = (signal?: AbortSignal): Promise<PluginRuntimeSource[]> =>
  appFetch<PluginRuntimeSource[]>("/api/plugins/runtime", { signal });

export const pluginRuntimeSourcesQueryOptions = (organizationId: number | string) =>
  queryOptions({
    queryKey: PLUGIN_RUNTIME_SOURCES_QUERY_KEY(organizationId),
    queryFn: ({ signal }) => getAllPluginRuntimeSources(signal),
  });

export const usePluginRuntimeSourcesQuery = (organizationId: number | string, enabled = true) =>
  useQuery({ ...pluginRuntimeSourcesQueryOptions(organizationId), enabled });
