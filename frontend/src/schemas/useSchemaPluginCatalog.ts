/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { schemaNeedsPluginCatalog } from "../algorithms/plugin/schema-needs-plugin-catalog";
import { loadPredictionCatalogDefinitions } from "../algorithms/models/prediction-catalog-definitions";
import type { PredictionCatalogDefinitions } from "../algorithms/models/prediction-catalog-definitions";
import { schemaRunDebug, schemaRunDebugError } from "../algorithms/schema/run-debug";

const emptyCatalog: PredictionCatalogDefinitions = {
  fieldDefinitions: [],
  reportDefinitions: [],
};

type CatalogState =
  | { status: "loading"; data: PredictionCatalogDefinitions; error: null }
  | { status: "ready"; data: PredictionCatalogDefinitions; error: null }
  | { status: "error"; data: PredictionCatalogDefinitions; error: string };

export const useSchemaPluginCatalog = (schema: unknown) => {
  const needsPlugins = useMemo(() => schemaNeedsPluginCatalog(schema), [schema]);
  const [state, setState] = useState<CatalogState>({
    status: needsPlugins ? "loading" : "ready",
    data: emptyCatalog,
    error: null,
  });

  const retry = useCallback(async () => {
    if (!needsPlugins) {
      schemaRunDebug("catalog.skip", { needsPlugins });
      setState({ status: "ready", data: emptyCatalog, error: null });
      return;
    }
    schemaRunDebug("catalog.load.start");
    setState({ status: "loading", data: emptyCatalog, error: null });
    try {
      const definitions = await loadPredictionCatalogDefinitions();
      schemaRunDebug("catalog.load.ready", {
        fields: definitions.fieldDefinitions.map((definition) => definition.kind),
        reports: definitions.reportDefinitions.map((definition) => definition.kind),
      });
      setState({ status: "ready", data: definitions, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      schemaRunDebugError("catalog.load.error", error);
      toast.error("Plugin catalog unavailable", { description: message });
      setState({ status: "error", data: emptyCatalog, error: message });
    }
  }, [needsPlugins]);

  useEffect(() => {
    void retry();
  }, [retry]);

  return { ...state, needsPlugins, retry };
};
