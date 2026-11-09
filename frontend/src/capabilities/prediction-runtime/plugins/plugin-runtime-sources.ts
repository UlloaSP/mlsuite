import { queryOptions } from "@tanstack/react-query";
import { appFetch } from "@/shared/api/http";
import type { PluginRuntimeSourceDto } from "@/shared/api/openapi.gen";
import { organizationQueryKey } from "@/shared/api/organization-query-key";

export const PLUGIN_RUNTIME_SOURCES_QUERY_KEY = (organizationId: number | string) =>
  [...organizationQueryKey(organizationId), "pluginRuntimeSources"] as const;

export const getAllPluginRuntimeSources = (
  signal?: AbortSignal,
): Promise<PluginRuntimeSourceDto[]> =>
  appFetch<PluginRuntimeSourceDto[]>("/api/plugins/runtime", { signal });

/** The plugins a published snapshot was fixed with: it renders with these, whatever the library holds now. */
export const getSnapshotPluginSources = (
  versionId: number,
  signal?: AbortSignal,
): Promise<PluginRuntimeSourceDto[]> =>
  appFetch<PluginRuntimeSourceDto[]>(`/api/schema-versions/${versionId}/plugins`, { signal });

export const pluginRuntimeSourcesQueryOptions = (organizationId: number | string) =>
  queryOptions({
    queryKey: PLUGIN_RUNTIME_SOURCES_QUERY_KEY(organizationId),
    queryFn: ({ signal }) => getAllPluginRuntimeSources(signal),
  });
