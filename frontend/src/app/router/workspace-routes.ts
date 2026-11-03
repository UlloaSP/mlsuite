/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
  canCreateModelsRoute,
  canEditModelsRoute,
  canManagePluginsRoute,
  canManageReviewsRoute,
  canViewApiAccessRoute,
  canViewModelsRoute,
  canViewPluginsRoute,
  canViewWorkspaceRoute,
} from "./layout-routes";
import { page } from "./lazy-route";

/** The organization's own pages, each under the permission that opens it. */
export const workspaceRoutes = {
  canViewWorkspace: [
    page(canViewWorkspaceRoute, "workspace", () =>
      import("@/features/workspace/pages/workspace-home-page").then((m) => m.WorkspaceHomePage),
    ),
  ],
  canViewModels: [
    page(canViewModelsRoute, "models", () =>
      import("@/features/models/pages/models-page").then((m) => m.ModelsPage),
    ),
    page(canViewModelsRoute, "models/$modelId", () =>
      import("@/features/models/pages/model-detail-page").then((m) => m.ModelDetailPage),
    ),
    page(canViewModelsRoute, "inferences", () =>
      import("@/app/pages/InferencesRoutePage").then((m) => m.InferencesRoutePage),
    ),
    page(canViewModelsRoute, "inferences/$inferenceId", () =>
      import("@/app/pages/InferenceDetailRoutePage").then((m) => m.InferenceDetailRoutePage),
    ),
    page(canViewModelsRoute, "schemas", () =>
      import("@/features/schemas/pages/schemas-page").then((m) => m.SchemasPage),
    ),
    page(canViewModelsRoute, "schemas/$schemaId", () =>
      import("@/features/schemas/pages/schema-detail-page").then((m) => m.SchemaDetailPage),
    ),
    page(canViewModelsRoute, "schemas/$schemaId/changes", () =>
      import("@/features/schemas/pages/schema-changes-page").then((m) => m.SchemaChangesPage),
    ),
    page(canViewModelsRoute, "schemas/$schemaId/bookmarks", () =>
      import("@/features/schemas/pages/schema-bookmarks-page").then((m) => m.SchemaBookmarksPage),
    ),
    page(canViewModelsRoute, "schemas/$schemaId/snapshots", () =>
      import("@/features/schemas/pages/schema-snapshots-page").then((m) => m.SchemaSnapshotsPage),
    ),
    page(canViewModelsRoute, "schemas/$schemaId/versions/$versionId", () =>
      import("@/features/schemas/pages/schema-snapshot-detail-page").then(
        (m) => m.SchemaSnapshotDetailPage,
      ),
    ),
    page(canViewModelsRoute, "predict", () =>
      import("@/features/schemas/pages/predict-page").then((m) => m.PredictPage),
    ),
    page(canViewModelsRoute, "predict/$bookmarkId", () =>
      import("@/features/schemas/pages/bookmark-workspace-page").then(
        (m) => m.BookmarkWorkspacePage,
      ),
    ),
  ],
  canViewApiAccess: [
    page(canViewApiAccessRoute, "api-access", () =>
      import("@/features/api-access/pages/api-overview-page").then((m) => m.ApiOverviewPage),
    ),
    page(canViewApiAccessRoute, "api-access/clients", () =>
      import("@/features/api-access/pages/api-clients-page").then((m) => m.ApiClientsPage),
    ),
    page(canViewApiAccessRoute, "api-access/clients/$clientId", () =>
      import("@/features/api-access/pages/api-client-page").then((m) => m.ApiClientPage),
    ),
    page(canViewApiAccessRoute, "api-access/requests", () =>
      import("@/features/api-access/pages/api-requests-page").then((m) => m.ApiRequestsPage),
    ),
    page(canViewApiAccessRoute, "api-access/docs", () =>
      import("@/features/api-access/pages/api-docs-page").then((m) => m.ApiDocsPage),
    ),
  ],
  canCreateModels: [
    page(canCreateModelsRoute, "models/create", () =>
      import("@/features/models/pages/create-model-page").then((m) => m.CreateModelPage),
    ),
  ],
  canEditModels: [
    page(canEditModelsRoute, "schemas/create", () =>
      import("@/app/router/create-schema-route").then((m) => m.CreateSchemaRoute),
    ),
    page(canEditModelsRoute, "schemas/$schemaId/drafts/$draftId", () =>
      import("@/features/schemas/pages/schema-draft-editor-route").then(
        (m) => m.SchemaDraftEditorRoute,
      ),
    ),
    page(canEditModelsRoute, "schemas/$schemaId/drafts/$draftId/conflicts", () =>
      import("@/features/schemas/pages/schema-draft-conflict-page").then(
        (m) => m.SchemaDraftConflictPage,
      ),
    ),
  ],
  canManageReviews: [
    page(canManageReviewsRoute, "review/manage", () =>
      import("@/features/reviews/pages/review-manage-page").then((m) => m.ReviewManagePage),
    ),
    page(
      canManageReviewsRoute,
      "inferences/$inferenceId/reviews/$reviewRunId/reviewers/$reviewerId",
      () => import("@/app/pages/InferenceReviewRoutePage").then((m) => m.InferenceReviewRoutePage),
    ),
  ],
  canViewPlugins: [
    page(canViewPluginsRoute, "plugins", () =>
      import("@/features/plugins/pages/PluginCatalogPage").then((m) => m.PluginCatalogPage),
    ),
  ],
  canManagePlugins: [
    page(canManagePluginsRoute, "plugins/upload", () =>
      import("@/features/plugins/pages/UploadPluginPage").then((m) => m.UploadPluginPage),
    ),
  ],
};
