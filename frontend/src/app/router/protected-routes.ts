/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { RouteObject } from "react-router";
import { lazyPage, superadmin, workspacePage } from "./lazy-route";
import { inferenceRoutes } from "./inference-routes";
import { reviewRoutes } from "./review-routes";

export const protectedPages: RouteObject[] = [
  {
    path: "home",
    lazy: () =>
      lazyPage(() => import("@/app/pages/authenticated-home-page"), "AuthenticatedHomePage"),
  },
  ...reviewRoutes,
  {
    path: "workspace",
    lazy: () =>
      lazyPage(
        () => import("@/features/workspace/pages/workspace-home-page"),
        "WorkspaceHomePage",
        workspacePage("canViewWorkspace"),
      ),
  },
  {
    path: "workspace/organizations",
    lazy: () =>
      lazyPage(
        () => import("@/features/workspace/pages/organizations-page"),
        "OrganizationsPage",
        superadmin,
      ),
  },
  {
    path: "workspace/organizations/create",
    lazy: () =>
      lazyPage(
        () => import("@/app/router/create-organization-route"),
        "CreateOrganizationRoute",
        superadmin,
      ),
  },
  {
    path: "workspace/organizations/:organizationId",
    lazy: () =>
      lazyPage(
        () => import("@/features/workspace/pages/organization-admin-page"),
        "OrganizationAdminPage",
      ),
  },
  {
    path: "workspace/organizations/:organizationId/members",
    lazy: () => lazyPage(() => import("@/features/workspace/pages/members-page"), "MembersPage"),
  },
  {
    path: "workspace/organizations/:organizationId/invitations",
    lazy: () =>
      lazyPage(() => import("@/features/workspace/pages/invitations-page"), "InvitationsPage"),
  },
  {
    path: "workspace/organizations/:organizationId/roles",
    lazy: () => lazyPage(() => import("@/features/workspace/pages/roles-page"), "RolesPage"),
  },
  {
    path: "workspace/organizations/:organizationId/settings",
    lazy: () =>
      lazyPage(
        () => import("@/features/workspace/pages/organization-settings-page"),
        "OrganizationSettingsPage",
      ),
  },
  {
    path: "invite/:token",
    lazy: () =>
      lazyPage(
        () => import("@/features/workspace/pages/invitation-accept-page"),
        "InvitationAcceptPage",
      ),
  },
  {
    path: "profile",
    lazy: () => lazyPage(() => import("@/features/user/pages/profilePage"), "ProfilePage"),
  },
  {
    path: "settings",
    lazy: () => lazyPage(() => import("@/features/user/pages/SettingsPage"), "SettingsPage"),
  },
  {
    path: "notifications",
    lazy: () =>
      lazyPage(() => import("@/features/workspace/pages/notifications-page"), "NotificationsPage"),
  },
  {
    path: "admin/users",
    lazy: () =>
      lazyPage(
        () => import("@/features/admin/pages/admin-users-page"),
        "AdminUsersPage",
        superadmin,
      ),
  },
  {
    path: "admin/users/create",
    lazy: () =>
      lazyPage(
        () => import("@/features/admin/pages/create-admin-user-page"),
        "CreateAdminUserPage",
        superadmin,
      ),
  },
  {
    path: "admin/infrastructure",
    lazy: () =>
      lazyPage(
        () => import("@/features/infrastructure/pages/admin-infrastructure-page"),
        "AdminInfrastructurePage",
        superadmin,
      ),
  },
  {
    path: "models",
    lazy: () =>
      lazyPage(
        () => import("@/features/models/pages/models-page"),
        "ModelsPage",
        workspacePage("canViewModels"),
      ),
  },
  {
    path: "models/create",
    lazy: () =>
      lazyPage(
        () => import("@/features/models/pages/create-model-page"),
        "CreateModelPage",
        workspacePage("canCreateModels"),
      ),
  },
  {
    path: "models/:modelId",
    lazy: () =>
      lazyPage(
        () => import("@/features/models/pages/model-detail-page"),
        "ModelDetailPage",
        workspacePage("canViewModels"),
      ),
  },
  ...inferenceRoutes,
  {
    path: "plugins",
    lazy: () =>
      lazyPage(
        () => import("@/features/plugins/pages/PluginCatalogPage"),
        "PluginCatalogPage",
        workspacePage("canViewPlugins"),
      ),
  },
  {
    path: "schemas",
    lazy: () =>
      lazyPage(
        () => import("@/features/schemas/pages/schemas-page"),
        "SchemasPage",
        workspacePage("canViewModels"),
      ),
  },
  {
    path: "schemas/create",
    lazy: () =>
      lazyPage(
        () => import("@/app/router/create-schema-route"),
        "CreateSchemaRoute",
        workspacePage("canEditModels"),
      ),
  },
  {
    path: "schemas/:schemaId",
    lazy: () =>
      lazyPage(
        () => import("@/features/schemas/pages/schema-detail-page"),
        "SchemaDetailPage",
        workspacePage("canViewModels"),
      ),
  },
  {
    path: "schemas/:schemaId/changes",
    lazy: () =>
      lazyPage(
        () => import("@/features/schemas/pages/schema-changes-page"),
        "SchemaChangesPage",
        workspacePage("canViewModels"),
      ),
  },
  {
    path: "schemas/:schemaId/bookmarks",
    lazy: () =>
      lazyPage(
        () => import("@/features/schemas/pages/schema-bookmarks-page"),
        "SchemaBookmarksPage",
        workspacePage("canViewModels"),
      ),
  },
  {
    path: "schemas/:schemaId/snapshots",
    lazy: () =>
      lazyPage(
        () => import("@/features/schemas/pages/schema-snapshots-page"),
        "SchemaSnapshotsPage",
        workspacePage("canViewModels"),
      ),
  },
  {
    path: "schemas/:schemaId/drafts/:draftId",
    lazy: () =>
      lazyPage(
        () => import("@/features/schemas/pages/schema-draft-editor-route"),
        "SchemaDraftEditorRoute",
        workspacePage("canEditModels"),
      ),
  },
  {
    path: "schemas/:schemaId/drafts/:draftId/conflicts",
    lazy: () =>
      lazyPage(
        () => import("@/features/schemas/pages/schema-draft-conflict-page"),
        "SchemaDraftConflictPage",
        workspacePage("canEditModels"),
      ),
  },
  {
    path: "schemas/:schemaId/versions/:versionId",
    lazy: () =>
      lazyPage(
        () => import("@/features/schemas/pages/schema-snapshot-detail-page"),
        "SchemaSnapshotDetailPage",
        workspacePage("canViewModels"),
      ),
  },
  {
    path: "schemas/:schemaId/bookmarks/:bookmarkId",
    lazy: () =>
      lazyPage(
        () => import("@/features/schemas/pages/schema-bookmark-detail-page"),
        "SchemaBookmarkDetailPage",
        workspacePage("canViewModels"),
      ),
  },
  {
    path: "schemas/:schemaId/bookmarks/:bookmarkId/runs/create",
    lazy: () =>
      lazyPage(
        () => import("@/features/schemas/pages/create-schema-run-page"),
        "CreateSchemaRunPage",
        workspacePage("canRunPredictions"),
      ),
  },
  {
    path: "schemas/:schemaId/bookmarks/:bookmarkId/runs",
    lazy: () =>
      lazyPage(
        () => import("@/features/schemas/pages/schema-run-history-page"),
        "SchemaRunHistoryPage",
        workspacePage("canViewModels"),
      ),
  },
  {
    path: "schemas/:schemaId/bookmarks/:bookmarkId/runs/:runId",
    lazy: () =>
      lazyPage(
        () => import("@/features/schemas/pages/prediction-run-detail-page"),
        "PredictionRunDetailPage",
        workspacePage("canViewModels"),
      ),
  },
];
