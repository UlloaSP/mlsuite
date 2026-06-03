/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { schemaNeedsActivePluginCatalog } from "../app/utils/mlform/schema-needs-plugin-catalog";
import { loadPredictionCatalogDefinitions } from "../models/loadPredictionCatalogDefinitions";
import type { PredictionCatalogDefinitions } from "../models/loadPredictionCatalogDefinitions";

const emptyCatalog: PredictionCatalogDefinitions = {
  fieldDefinitions: [],
  reportDefinitions: [],
};

type CatalogState =
  | { status: "loading"; data: PredictionCatalogDefinitions; error: null }
  | { status: "ready"; data: PredictionCatalogDefinitions; error: null }
  | { status: "error"; data: PredictionCatalogDefinitions; error: string };

export const useSchemaPluginCatalog = (schema: unknown) => {
  const needsPlugins = useMemo(() => schemaNeedsActivePluginCatalog(schema), [schema]);
  const [state, setState] = useState<CatalogState>({
    status: needsPlugins ? "loading" : "ready",
    data: emptyCatalog,
    error: null,
  });

  const retry = useCallback(async () => {
    if (!needsPlugins) {
      setState({ status: "ready", data: emptyCatalog, error: null });
      return;
    }
    setState({ status: "loading", data: emptyCatalog, error: null });
    try {
      setState({ status: "ready", data: await loadPredictionCatalogDefinitions(), error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error("Plugin catalog unavailable", { description: message });
      setState({ status: "error", data: emptyCatalog, error: message });
    }
  }, [needsPlugins]);

  useEffect(() => {
    void retry();
  }, [retry]);

  return { ...state, needsPlugins, retry };
};
