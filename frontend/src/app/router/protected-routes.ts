/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
  appRoute,
  canCreateModelsRoute,
  canEditModelsRoute,
  canManagePluginsRoute,
  canManageReviewsRoute,
  canViewApiAccessRoute,
  canViewModelsRoute,
  canViewPluginsRoute,
  canViewWorkspaceRoute,
  protectedRoute,
  reviewAccessRoute,
  superadminRoute,
  teamOrganizationRoute,
} from "./layout-routes";
import { page } from "./lazy-route";
import { workspaceRoutes } from "./workspace-routes";

const reviewsPage = () =>
  import("@/features/reviews/pages/reviews-page").then((m) => m.ReviewsPage);

const ORGANIZATION = "workspace/organizations/$organizationId";

const accountRoutes = [
  page(appRoute, "home", () =>
    import("@/app/pages/authenticated-home-page").then((m) => m.AuthenticatedHomePage),
  ),
  page(appRoute, "profile", () =>
    import("@/features/user/pages/own-profile-page").then((m) => m.OwnProfilePage),
  ),
  page(appRoute, "settings", () =>
    import("@/features/user/pages/SettingsPage").then((m) => m.SettingsPage),
  ),
  page(appRoute, "notifications", () =>
    import("@/app/pages/NotificationsRoutePage").then((m) => m.NotificationsRoutePage),
  ),
  page(appRoute, "workspace/organizations", () =>
    import("@/features/workspace/pages/organizations-route-page").then(
      (m) => m.OrganizationsRoutePage,
    ),
  ),
  page(appRoute, "workspace/organizations/create", () =>
    import("@/app/router/create-organization-route").then((m) => m.CreateOrganizationRoute),
  ),
  page(appRoute, ORGANIZATION, () =>
    import("@/features/workspace/pages/organization-admin-page").then(
      (m) => m.OrganizationAdminPage,
    ),
  ),
  page(appRoute, `${ORGANIZATION}/audit-log`, () =>
    import("@/features/workspace/pages/audit-log-page").then((m) => m.AuditLogPage),
  ),
];

const teamOrganizationRoutes = teamOrganizationRoute.addChildren([
  page(teamOrganizationRoute, `${ORGANIZATION}/members`, () =>
    import("@/features/workspace/pages/members-page").then((m) => m.MembersPage),
  ),
  page(teamOrganizationRoute, `${ORGANIZATION}/invitations`, () =>
    import("@/features/workspace/pages/invitations-page").then((m) => m.InvitationsPage),
  ),
  page(teamOrganizationRoute, `${ORGANIZATION}/roles`, () =>
    import("@/features/workspace/pages/roles-page").then((m) => m.RolesPage),
  ),
  page(teamOrganizationRoute, `${ORGANIZATION}/settings`, () =>
    import("@/features/workspace/pages/organization-settings-page").then(
      (m) => m.OrganizationSettingsPage,
    ),
  ),
]);

const reviewAccessRoutes = reviewAccessRoute.addChildren([
  page(reviewAccessRoute, "review", reviewsPage),
  page(reviewAccessRoute, "review/$reviewId", reviewsPage),
  page(reviewAccessRoute, "review/$reviewId/runs/$reviewRunId", reviewsPage),
]);

const superadminRoutes = superadminRoute.addChildren([
  page(superadminRoute, "admin/users", () =>
    import("@/features/admin/pages/admin-users-page").then((m) => m.AdminUsersPage),
  ),
  page(superadminRoute, "admin/users/create", () =>
    import("@/features/admin/pages/create-admin-user-page").then((m) => m.CreateAdminUserPage),
  ),
  page(superadminRoute, "admin/purges", () =>
    import("@/features/admin/pages/admin-purges-page").then((m) => m.AdminPurgesPage),
  ),
  page(superadminRoute, "admin/public-bookmarks", () =>
    import("@/features/admin/pages/admin-public-bookmarks-page").then(
      (m) => m.AdminPublicBookmarksPage,
    ),
  ),
  page(superadminRoute, "admin/api-traffic", () =>
    import("@/features/api-access/pages/admin-api-traffic-page").then((m) => m.AdminApiTrafficPage),
  ),
  page(superadminRoute, "admin/audit", () =>
    import("@/features/workspace/pages/admin-audit-log-page").then((m) => m.AdminAuditLogPage),
  ),
  page(superadminRoute, "admin/infrastructure", () =>
    import("@/features/infrastructure/pages/admin-infrastructure-page").then(
      (m) => m.AdminInfrastructurePage,
    ),
  ),
]);

const permissionRoutes = [
  canViewWorkspaceRoute.addChildren(workspaceRoutes.canViewWorkspace),
  canViewModelsRoute.addChildren(workspaceRoutes.canViewModels),
  canViewApiAccessRoute.addChildren(workspaceRoutes.canViewApiAccess),
  canCreateModelsRoute.addChildren(workspaceRoutes.canCreateModels),
  canEditModelsRoute.addChildren(workspaceRoutes.canEditModels),
  canManageReviewsRoute.addChildren(workspaceRoutes.canManageReviews),
  canViewPluginsRoute.addChildren(workspaceRoutes.canViewPlugins),
  canManagePluginsRoute.addChildren(workspaceRoutes.canManagePlugins),
];

export const protectedRoutes = protectedRoute.addChildren([
  appRoute.addChildren([
    ...accountRoutes,
    teamOrganizationRoutes,
    reviewAccessRoutes,
    superadminRoutes,
    ...permissionRoutes,
  ]),
]);
