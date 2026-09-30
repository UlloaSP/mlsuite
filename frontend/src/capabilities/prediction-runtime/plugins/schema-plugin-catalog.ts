/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useEffect, useMemo } from "react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { schemaNeedsPluginCatalog } from "@/capabilities/prediction-runtime/mlform/schema-plugin-requirement";
import {
  getCatalogDefinitions,
  type PredictionCatalogDefinitions,
} from "@/capabilities/prediction-runtime/plugins/plugin-catalog";
import {
  PLUGIN_RUNTIME_SOURCES_QUERY_KEY,
  pluginRuntimeSourcesQueryOptions,
} from "@/capabilities/prediction-runtime/plugins/plugin-runtime-sources";

const EMPTY_CATALOG: PredictionCatalogDefinitions = {
  fieldDefinitions: [],
  reportDefinitions: [],
};

const CATALOG_ERROR_TOAST_ID = "plugin-catalog-unavailable";

/**
 * Compiled plugin definitions. The key nests under the runtime sources key, so
 * invalidating the sources also recompiles the catalog.
 */
export const predictionCatalogQueryOptions = (organizationId: number | string) =>
  queryOptions({
    queryKey: [...PLUGIN_RUNTIME_SOURCES_QUERY_KEY(organizationId), "definitions"],
    queryFn: async ({ client }) =>
      getCatalogDefinitions(
        organizationId,
        await client.fetchQuery(pluginRuntimeSourcesQueryOptions(organizationId)),
      ),
    retry: false,
    meta: { errorHandledLocally: true },
  });

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const useSchemaPluginCatalog = (schema: unknown, organizationId: number | string) => {
  const needsPlugins = useMemo(() => schemaNeedsPluginCatalog(schema), [schema]);
  const query = useQuery({
    ...predictionCatalogQueryOptions(organizationId),
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
