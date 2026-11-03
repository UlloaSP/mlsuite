/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { z } from "zod";
import { inferenceQueryOptions } from "@/features/inferences/api/inference-api";
import {
  inferenceDetailSearchShape,
  inferencesSearch,
} from "@/features/inferences/pages/inference-search";
import {
  modelCatalogQueryOptions,
  modelDetailsQueryOptions,
  modelQueryOptions,
} from "@/features/models/api/model.queries";
import { modelDetailSearch, modelsSearch } from "@/features/models/pages/model-search";
import { predictCatalogQueryOptions } from "@/features/schemas/api/schema-catalog-queries";
import {
  schemaBookmarkQueryOptions,
  schemaCatalogQueryOptions,
  schemaQueryOptions,
  schemaVersionQueryOptions,
} from "@/features/schemas/api/schema-queries";
import {
  bookmarkWorkspaceSearch,
  predictSearch,
  runDetailsSearchShape,
  schemaBookmarksSearch,
  schemaChangesSearch,
  schemaPreviewSearch,
  schemaSnapshotsSearch,
  schemasSearch,
} from "@/features/schemas/pages/schema-search";
import { canViewModelsRoute } from "./layout-routes";
import { searchPage } from "./lazy-route";
import { prefetchForMember } from "./route-loaders";

const parent = canViewModelsRoute;

/** Models, the inferences they made, schemas, and the bookmarks members run. */
export const modelRoutes = [
  searchPage(
    parent,
    "models",
    modelsSearch,
    () => import("@/features/models/pages/models-page").then((m) => m.ModelsPage),
    ({ queryClient, search: { q, filter, sort } }) =>
      prefetchForMember(queryClient, (organizationId) =>
        queryClient.prefetchInfiniteQuery(
          modelCatalogQueryOptions(organizationId, q.trim(), sort, filter),
        ),
      ),
  ),
  searchPage(
    parent,
    "models/$modelId",
    modelDetailSearch,
    () => import("@/features/models/pages/model-detail-page").then((m) => m.ModelDetailPage),
    ({ queryClient, params: { modelId } }) =>
      prefetchForMember(queryClient, (organizationId) =>
        Promise.all([
          queryClient.prefetchQuery(modelQueryOptions(organizationId, modelId)),
          queryClient.prefetchQuery(modelDetailsQueryOptions(organizationId, modelId)),
        ]),
      ),
  ),
  searchPage(parent, "inferences", inferencesSearch, () =>
    import("@/app/pages/InferencesRoutePage").then((m) => m.InferencesRoutePage),
  ),
  searchPage(
    parent,
    "inferences/$inferenceId",
    // The inference's own params and those of the run details shown with it.
    z.object({ ...inferenceDetailSearchShape, ...runDetailsSearchShape }),
    () => import("@/app/pages/InferenceDetailRoutePage").then((m) => m.InferenceDetailRoutePage),
    ({ queryClient, params: { inferenceId } }) =>
      prefetchForMember(queryClient, (organizationId) =>
        queryClient.prefetchQuery(inferenceQueryOptions(organizationId, inferenceId)),
      ),
  ),
  searchPage(
    parent,
    "schemas",
    schemasSearch,
    () => import("@/features/schemas/pages/schemas-page").then((m) => m.SchemasPage),
    ({ queryClient, search: { q, filter, sort } }) =>
      prefetchForMember(queryClient, (organizationId) =>
        queryClient.prefetchInfiniteQuery(
          schemaCatalogQueryOptions(organizationId, q.trim(), sort, filter),
        ),
      ),
  ),
  searchPage(
    parent,
    "schemas/$schemaId",
    schemaPreviewSearch,
    () => import("@/features/schemas/pages/schema-detail-page").then((m) => m.SchemaDetailPage),
    ({ queryClient, params: { schemaId } }) =>
      prefetchForMember(queryClient, (organizationId) =>
        queryClient.prefetchQuery(schemaQueryOptions(organizationId, schemaId)),
      ),
  ),
  searchPage(parent, "schemas/$schemaId/changes", schemaChangesSearch, () =>
    import("@/features/schemas/pages/schema-changes-page").then((m) => m.SchemaChangesPage),
  ),
  searchPage(parent, "schemas/$schemaId/bookmarks", schemaBookmarksSearch, () =>
    import("@/features/schemas/pages/schema-bookmarks-page").then((m) => m.SchemaBookmarksPage),
  ),
  searchPage(parent, "schemas/$schemaId/snapshots", schemaSnapshotsSearch, () =>
    import("@/features/schemas/pages/schema-snapshots-page").then((m) => m.SchemaSnapshotsPage),
  ),
  searchPage(
    parent,
    "schemas/$schemaId/versions/$versionId",
    schemaPreviewSearch,
    () =>
      import("@/features/schemas/pages/schema-snapshot-detail-page").then(
        (m) => m.SchemaSnapshotDetailPage,
      ),
    ({ queryClient, params: { schemaId, versionId } }) =>
      prefetchForMember(queryClient, (organizationId) =>
        Promise.all([
          queryClient.prefetchQuery(schemaQueryOptions(organizationId, schemaId)),
          queryClient.prefetchQuery(schemaVersionQueryOptions(organizationId, versionId)),
        ]),
      ),
  ),
  searchPage(
    parent,
    "predict",
    predictSearch,
    () => import("@/features/schemas/pages/predict-page").then((m) => m.PredictPage),
    ({ queryClient, search: { q, filter, sort } }) =>
      prefetchForMember(queryClient, (organizationId) =>
        queryClient.prefetchInfiniteQuery(
          predictCatalogQueryOptions(organizationId, { search: q.trim(), filter, sort }),
        ),
      ),
  ),
  searchPage(
    parent,
    "predict/$bookmarkId",
    bookmarkWorkspaceSearch,
    () =>
      import("@/features/schemas/pages/bookmark-workspace-page").then(
        (m) => m.BookmarkWorkspacePage,
      ),
    ({ queryClient, params: { bookmarkId } }) =>
      prefetchForMember(queryClient, (organizationId) =>
        queryClient.prefetchQuery(schemaBookmarkQueryOptions(organizationId, bookmarkId)),
      ),
  ),
];
