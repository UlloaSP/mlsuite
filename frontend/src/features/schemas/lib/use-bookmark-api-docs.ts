/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMemo } from "react";
import { apiUrl } from "@/shared/api/http";
import { useBoundModel, useSchemaVersion } from "@/features/schemas/api/schema-queries";
import { buildApiDocs } from "@/features/schemas/lib/bookmark-api-docs";
import type { SchemaBookmarkDto } from "@/shared/api/openapi.gen";

/**
 * The consumer-endpoint documentation of a bookmark, built from its snapshot's bindings and the
 * signature of the one model they name. Nothing is fetched until `enabled`.
 */
export function useBookmarkApiDocs(bookmark: SchemaBookmarkDto, enabled: boolean) {
  const version = useSchemaVersion(enabled ? bookmark.versionId : undefined);
  const bindings = version.data?.bindings;
  const modelId = bindings?.length === 1 ? bindings[0]?.modelId : undefined;
  const model = useBoundModel(modelId);
  const docs = useMemo(
    () =>
      bindings && (bindings.length !== 1 || model.data)
        ? buildApiDocs({
            url: apiUrl("/api/public/model-predictions"),
            bookmarkName: bookmark.name,
            bindingCount: bindings.length,
            model: model.data,
          })
        : undefined,
    [bindings, bookmark.name, model.data],
  );
  // The model is asked for only once the snapshot names it, so a retry starts from the snapshot.
  const refetch = () =>
    version.isError || modelId === undefined ? version.refetch() : model.refetch();
  return {
    docs,
    isLoading: version.isLoading || model.isLoading,
    error: version.error ?? (modelId === undefined ? null : model.error),
    refetch,
  };
}
