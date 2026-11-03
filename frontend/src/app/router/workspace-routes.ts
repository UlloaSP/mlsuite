/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { apiClientQueryOptions } from "@/features/api-access/api/api-access.queries";
import {
  apiClientSearch,
  apiClientsSearch,
  apiDocsSearch,
  apiOverviewSearch,
  apiRequestsSearch,
} from "@/features/api-access/pages/api-access-search";
import { pluginsSearch } from "@/features/plugins/pages/plugin-search";
import { reviewManageSearch } from "@/features/reviews/pages/review-search";
import { schemaDraftQueryOptions, schemaQueryOptions } from "@/features/schemas/api/schema-queries";
import { createSchemaSearch, draftEditorSearch } from "@/features/schemas/pages/schema-search";
import {
  canCreateModelsRoute,
  canEditModelsRoute,
  canManagePluginsRoute,
  canManageReviewsRoute,
  canViewApiAccessRoute,
  canViewPluginsRoute,
  canViewWorkspaceRoute,
} from "./layout-routes";
import { page, searchPage } from "./lazy-route";
import { modelRoutes } from "./model-routes";
import { prefetchForMember } from "./route-loaders";

/** The organization's own pages, each under the permission that opens it. */
export const workspaceRoutes = {
  canViewWorkspace: [
    page(canViewWorkspaceRoute, "workspace", () =>
      import("@/features/workspace/pages/workspace-home-page").then((m) => m.WorkspaceHomePage),
    ),
  ],
  canViewModels: modelRoutes,
  canViewApiAccess: [
    searchPage(canViewApiAccessRoute, "api-access", apiOverviewSearch, () =>
      import("@/features/api-access/pages/api-overview-page").then((m) => m.ApiOverviewPage),
    ),
    searchPage(canViewApiAccessRoute, "api-access/clients", apiClientsSearch, () =>
      import("@/features/api-access/pages/api-clients-page").then((m) => m.ApiClientsPage),
    ),
    searchPage(
      canViewApiAccessRoute,
      "api-access/clients/$clientId",
      apiClientSearch,
      () => import("@/features/api-access/pages/api-client-page").then((m) => m.ApiClientPage),
      ({ queryClient, params: { clientId } }) =>
        prefetchForMember(queryClient, async (organizationId) => {
          // Any other address is the page's own "not found".
          if (Number.isInteger(Number(clientId))) {
            await queryClient.prefetchQuery(apiClientQueryOptions(organizationId, Number(clientId)));
          }
        }),
    ),
    searchPage(canViewApiAccessRoute, "api-access/requests", apiRequestsSearch, () =>
      import("@/features/api-access/pages/api-requests-page").then((m) => m.ApiRequestsPage),
    ),
    searchPage(canViewApiAccessRoute, "api-access/docs", apiDocsSearch, () =>
      import("@/features/api-access/pages/api-docs-page").then((m) => m.ApiDocsPage),
    ),
  ],
  canCreateModels: [
    page(canCreateModelsRoute, "models/create", () =>
      import("@/features/models/pages/create-model-page").then((m) => m.CreateModelPage),
    ),
  ],
  canEditModels: [
    searchPage(canEditModelsRoute, "schemas/create", createSchemaSearch, () =>
      import("@/app/router/create-schema-route").then((m) => m.CreateSchemaRoute),
    ),
    searchPage(
      canEditModelsRoute,
      "schemas/$schemaId/drafts/$draftId",
      draftEditorSearch,
      () =>
        import("@/features/schemas/pages/schema-draft-editor-route").then(
          (m) => m.SchemaDraftEditorRoute,
        ),
      ({ queryClient, params: { schemaId, draftId } }) =>
        prefetchForMember(queryClient, (organizationId) =>
          Promise.all([
            queryClient.prefetchQuery(schemaQueryOptions(organizationId, schemaId)),
            queryClient.prefetchQuery(schemaDraftQueryOptions(organizationId, draftId)),
          ]),
        ),
    ),
    page(canEditModelsRoute, "schemas/$schemaId/drafts/$draftId/conflicts", () =>
      import("@/features/schemas/pages/schema-draft-conflict-page").then(
        (m) => m.SchemaDraftConflictPage,
      ),
    ),
  ],
  canManageReviews: [
    searchPage(canManageReviewsRoute, "review/manage", reviewManageSearch, () =>
      import("@/features/reviews/pages/review-manage-page").then((m) => m.ReviewManagePage),
    ),
    page(
      canManageReviewsRoute,
      "inferences/$inferenceId/reviews/$reviewRunId/reviewers/$reviewerId",
      () => import("@/app/pages/InferenceReviewRoutePage").then((m) => m.InferenceReviewRoutePage),
    ),
  ],
  canViewPlugins: [
    searchPage(canViewPluginsRoute, "plugins", pluginsSearch, () =>
      import("@/features/plugins/pages/PluginCatalogPage").then((m) => m.PluginCatalogPage),
    ),
  ],
  canManagePlugins: [
    page(canManagePluginsRoute, "plugins/upload", () =>
      import("@/features/plugins/pages/UploadPluginPage").then((m) => m.UploadPluginPage),
    ),
  ],
};
