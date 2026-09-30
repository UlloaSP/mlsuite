/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { RouteObject } from "react-router";
import { page, reviewAccess, superadmin, workspace } from "./lazy-route";

const reviewsPage = () =>
  import("@/features/reviews/pages/reviews-page").then((m) => m.ReviewsPage);

export const protectedPages: RouteObject[] = [
  page("home", () =>
    import("@/app/pages/authenticated-home-page").then((m) => m.AuthenticatedHomePage),
  ),
  page("welcome", () => import("@/app/pages/welcome-page").then((m) => m.WelcomePage)),
  page("profile", () => import("@/features/user/pages/profilePage").then((m) => m.ProfilePage)),
  page("settings", () => import("@/features/user/pages/SettingsPage").then((m) => m.SettingsPage)),
  page("notifications", () =>
    import("@/features/workspace/pages/notifications-page").then((m) => m.NotificationsPage),
  ),
  page("invite/:token", () =>
    import("@/features/workspace/pages/invitation-accept-page").then((m) => m.InvitationAcceptPage),
  ),
  page("workspace/organizations/:organizationId", () =>
    import("@/features/workspace/pages/organization-admin-page").then(
      (m) => m.OrganizationAdminPage,
    ),
  ),
  page("workspace/organizations/:organizationId/members", () =>
    import("@/features/workspace/pages/members-page").then((m) => m.MembersPage),
  ),
  page("workspace/organizations/:organizationId/invitations", () =>
    import("@/features/workspace/pages/invitations-page").then((m) => m.InvitationsPage),
  ),
  page("workspace/organizations/:organizationId/roles", () =>
    import("@/features/workspace/pages/roles-page").then((m) => m.RolesPage),
  ),
  page("workspace/organizations/:organizationId/settings", () =>
    import("@/features/workspace/pages/organization-settings-page").then(
      (m) => m.OrganizationSettingsPage,
    ),
  ),
  reviewAccess([
    page("review", reviewsPage),
    page("review/:reviewId", reviewsPage),
    page("review/:reviewId/runs/:reviewRunId", reviewsPage),
  ]),
  superadmin([
    page("workspace/organizations", () =>
      import("@/features/workspace/pages/organizations-page").then((m) => m.OrganizationsPage),
    ),
    page("workspace/organizations/create", () =>
      import("@/app/router/create-organization-route").then((m) => m.CreateOrganizationRoute),
    ),
    page("admin/users", () =>
      import("@/features/admin/pages/admin-users-page").then((m) => m.AdminUsersPage),
    ),
    page("admin/users/create", () =>
      import("@/features/admin/pages/create-admin-user-page").then((m) => m.CreateAdminUserPage),
    ),
    page("admin/infrastructure", () =>
      import("@/features/infrastructure/pages/admin-infrastructure-page").then(
        (m) => m.AdminInfrastructurePage,
      ),
    ),
  ]),
  workspace("canViewWorkspace", [
    page("workspace", () =>
      import("@/features/workspace/pages/workspace-home-page").then((m) => m.WorkspaceHomePage),
    ),
  ]),
  workspace("canViewModels", [
    page("models", () => import("@/features/models/pages/models-page").then((m) => m.ModelsPage)),
    page("models/:modelId", () =>
      import("@/features/models/pages/model-detail-page").then((m) => m.ModelDetailPage),
    ),
    page("inferences", () =>
      import("@/app/pages/InferencesRoutePage").then((m) => m.InferencesRoutePage),
    ),
    page("inferences/:inferenceId", () =>
      import("@/app/pages/InferenceDetailRoutePage").then((m) => m.InferenceDetailRoutePage),
    ),
    page("schemas", () =>
      import("@/features/schemas/pages/schemas-page").then((m) => m.SchemasPage),
    ),
    page("schemas/:schemaId", () =>
      import("@/features/schemas/pages/schema-detail-page").then((m) => m.SchemaDetailPage),
    ),
    page("schemas/:schemaId/changes", () =>
      import("@/features/schemas/pages/schema-changes-page").then((m) => m.SchemaChangesPage),
    ),
    page("schemas/:schemaId/bookmarks", () =>
      import("@/features/schemas/pages/schema-bookmarks-page").then((m) => m.SchemaBookmarksPage),
    ),
    page("schemas/:schemaId/snapshots", () =>
      import("@/features/schemas/pages/schema-snapshots-page").then((m) => m.SchemaSnapshotsPage),
    ),
    page("schemas/:schemaId/versions/:versionId", () =>
      import("@/features/schemas/pages/schema-snapshot-detail-page").then(
        (m) => m.SchemaSnapshotDetailPage,
      ),
    ),
    page("predict", () =>
      import("@/features/schemas/pages/predict-page").then((m) => m.PredictPage),
    ),
    page("predict/:bookmarkId", () =>
      import("@/features/schemas/pages/bookmark-workspace-page").then(
        (m) => m.BookmarkWorkspacePage,
      ),
    ),
  ]),
  workspace("canCreateModels", [
    page("models/create", () =>
      import("@/features/models/pages/create-model-page").then((m) => m.CreateModelPage),
    ),
  ]),
  workspace("canEditModels", [
    page("schemas/create", () =>
      import("@/app/router/create-schema-route").then((m) => m.CreateSchemaRoute),
    ),
    page("schemas/:schemaId/drafts/:draftId", () =>
      import("@/features/schemas/pages/schema-draft-editor-route").then(
        (m) => m.SchemaDraftEditorRoute,
      ),
    ),
    page("schemas/:schemaId/drafts/:draftId/conflicts", () =>
      import("@/features/schemas/pages/schema-draft-conflict-page").then(
        (m) => m.SchemaDraftConflictPage,
      ),
    ),
  ]),
  workspace("canManageReviews", [
    page("inferences/:inferenceId/reviews/:reviewRunId/reviewers/:reviewerId", () =>
      import("@/app/pages/InferenceReviewRoutePage").then((m) => m.InferenceReviewRoutePage),
    ),
  ]),
  workspace("canViewPlugins", [
    page("plugins", () =>
      import("@/features/plugins/pages/PluginCatalogPage").then((m) => m.PluginCatalogPage),
    ),
  ]),
  workspace("canManagePlugins", [
    page("plugins/upload", () =>
      import("@/features/plugins/pages/UploadPluginPage").then((m) => m.UploadPluginPage),
    ),
  ]),
];
