/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { notificationsSearch } from "@/features/notifications/pages/notification-search";
import { ownProfileSearch, settingsSearch } from "@/features/user/pages/user-search";
import { organizationAdminDashboardQueryOptions } from "@/features/workspace/api/workspace.queries";
import {
  auditSearch,
  invitationsSearch,
  membersSearch,
  organizationsSearch,
  rolesSearch,
} from "@/features/workspace/pages/workspace-search";
import { superadminRoutes } from "./admin-routes";
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
  teamOrganizationRoute,
} from "./layout-routes";
import { page, searchPage } from "./lazy-route";
import { prefetchForMember } from "./route-loaders";
import { workspaceRoutes } from "./workspace-routes";

const reviewsPage = () =>
  import("@/features/reviews/pages/reviews-page").then((m) => m.ReviewsPage);

const ORGANIZATION = "workspace/organizations/$organizationId";

const accountRoutes = [
  page(appRoute, "home", () =>
    import("@/app/pages/authenticated-home-page").then((m) => m.AuthenticatedHomePage),
  ),
  searchPage(appRoute, "profile", ownProfileSearch, () =>
    import("@/features/user/pages/own-profile-page").then((m) => m.OwnProfilePage),
  ),
  searchPage(appRoute, "settings", settingsSearch, () =>
    import("@/features/user/pages/SettingsPage").then((m) => m.SettingsPage),
  ),
  searchPage(appRoute, "notifications", notificationsSearch, () =>
    import("@/app/pages/NotificationsRoutePage").then((m) => m.NotificationsRoutePage),
  ),
  searchPage(appRoute, "workspace/organizations", organizationsSearch, () =>
    import("@/features/workspace/pages/organizations-route-page").then(
      (m) => m.OrganizationsRoutePage,
    ),
  ),
  page(appRoute, "workspace/organizations/create", () =>
    import("@/app/router/create-organization-route").then((m) => m.CreateOrganizationRoute),
  ),
  page(
    appRoute,
    ORGANIZATION,
    () =>
      import("@/features/workspace/pages/organization-admin-page").then(
        (m) => m.OrganizationAdminPage,
      ),
    ({ queryClient, params: { organizationId } }) =>
      prefetchForMember(queryClient, () =>
        queryClient.prefetchQuery(organizationAdminDashboardQueryOptions(Number(organizationId))),
      ),
  ),
  searchPage(appRoute, `${ORGANIZATION}/audit-log`, auditSearch, () =>
    import("@/features/workspace/pages/audit-log-page").then((m) => m.AuditLogPage),
  ),
];

const teamOrganizationRoutes = teamOrganizationRoute.addChildren([
  searchPage(teamOrganizationRoute, `${ORGANIZATION}/members`, membersSearch, () =>
    import("@/features/workspace/pages/members-page").then((m) => m.MembersPage),
  ),
  searchPage(teamOrganizationRoute, `${ORGANIZATION}/invitations`, invitationsSearch, () =>
    import("@/features/workspace/pages/invitations-page").then((m) => m.InvitationsPage),
  ),
  searchPage(teamOrganizationRoute, `${ORGANIZATION}/roles`, rolesSearch, () =>
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
