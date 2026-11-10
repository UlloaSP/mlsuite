/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useEffect, useMemo } from "react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { toast } from "@/shared/ui/toast";
import { schemaNeedsPluginCatalog } from "@/capabilities/prediction-runtime/mlform/schema-plugin-requirement";
import { inspectPluginCatalog } from "@/capabilities/prediction-runtime/sandbox/plugin-sandbox-services";
import type { PluginCatalog } from "@/capabilities/prediction-runtime/sandbox/sandbox-protocol";
import {
  getSnapshotPluginSources,
  PLUGIN_RUNTIME_SOURCES_QUERY_KEY,
  pluginRuntimeSourcesQueryOptions,
} from "@/capabilities/prediction-runtime/plugins/plugin-runtime-sources";
import { organizationQueryKey } from "@/shared/api/organization-query-key";

const EMPTY_CATALOG: PluginCatalog = { fields: [], reports: [] };

const CATALOG_ERROR_TOAST_ID = "plugin-catalog-unavailable";

/**
 * The organization's plugins split into field and report kinds, checked in the plugin sandbox.
 * The key nests under the runtime sources key, so invalidating the sources checks them again.
 */
export const predictionCatalogQueryOptions = (organizationId: number | string) =>
  queryOptions({
    queryKey: [...PLUGIN_RUNTIME_SOURCES_QUERY_KEY(organizationId), "catalog"],
    queryFn: async ({ client }) =>
      inspectPluginCatalog(
        await client.fetchQuery(pluginRuntimeSourcesQueryOptions(organizationId)),
      ),
    retry: false,
    meta: { errorHandledLocally: true },
  });

/**
 * The plugins a published snapshot was fixed with, checked in the plugin sandbox. They never change,
 * so one read serves every view of the snapshot.
 */
export const snapshotCatalogQueryOptions = (organizationId: number | string, versionId: number) =>
  queryOptions({
    queryKey: [...organizationQueryKey(organizationId), "snapshotPlugins", versionId],
    queryFn: async ({ signal }) =>
      inspectPluginCatalog(await getSnapshotPluginSources(versionId, signal)),
    staleTime: Infinity,
    retry: false,
    meta: { errorHandledLocally: true },
  });

/** A snapshot's catalog when there is a snapshot; the organization's library for a draft. */
export const formCatalogQueryOptions = (
  organizationId: number | string,
  versionId?: number | null,
) =>
  versionId == null
    ? predictionCatalogQueryOptions(organizationId)
    : snapshotCatalogQueryOptions(organizationId, versionId);

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * The plugins that draw a form: a published snapshot's own ({@code versionId}), or the organization's
 * library for a draft still being written.
 */
export const useSchemaPluginCatalog = (
  schema: unknown,
  organizationId: number | string,
  versionId?: number | null,
) => {
  const needsPlugins = useMemo(() => schemaNeedsPluginCatalog(schema), [schema]);
  const query = useQuery({
    ...formCatalogQueryOptions(organizationId, versionId),
    enabled: needsPlugins,
  });
  const error = needsPlugins && query.isError ? errorMessage(query.error) : null;

  useEffect(() => {
    // One toast per failure even when several views read the same catalog.
    if (error)
      toast.error("Plugin catalog unavailable", { id: CATALOG_ERROR_TOAST_ID, description: error });
  }, [error, query.errorUpdatedAt]);

  const status = !needsPlugins || query.isSuccess ? "ready" : error ? "error" : "loading";
  return {
    status,
    data: needsPlugins && query.data ? query.data : EMPTY_CATALOG,
    error,
    needsPlugins,
    retry: () => query.refetch(),
  } as const;
};
