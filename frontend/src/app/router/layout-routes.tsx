/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, createRoute, notFound, Outlet } from "@tanstack/react-router";
import { AppShellFrame } from "@/app/layouts/AppShellLayout";
import { SessionFrameLayout } from "@/app/layouts/SessionFrameLayout";
import { RequireReviewAccess } from "@/features/reviews/components/RequireReviewAccess";
import { RequireSuperadmin } from "@/features/workspace/components/RequireSuperadmin";
import { RequireTeamOrganization } from "@/features/workspace/components/RequireTeamOrganization";
import { RequireWorkspacePermission } from "@/features/workspace/components/RequireWorkspacePermission";
import { AppRoot } from "./AppRoot";
import { ProtectedRoute } from "./ProtectedRoute";
import { RouteErrorBoundary } from "./RouteErrorBoundary";

export type AppRouterContext = { queryClient: QueryClient };

/**
 * Any failure below, and any address no route matches, replaces the whole page. Each page route
 * validates the search params it owns.
 */
export const rootRoute = createRootRouteWithContext<AppRouterContext>()({
  component: AppRoot,
  errorComponent: RouteErrorBoundary,
  notFoundComponent: () => <RouteErrorBoundary error={notFound()} />,
});

/** `/` and the sign-in screen: no frame, no session needed. */
export const publicRoute = createRoute({ getParentRoute: () => rootRoute, id: "public" });

/** Pages anyone can open; SessionFrameLayout frames them for a member or a visitor. */
export const sessionFrameRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "session-frame",
  component: SessionFrameLayout,
});

/** Only a member reaches these; the persistent app shell frames them. */
export const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "protected",
  component: ProtectedRoute,
});

export const appRoute = createRoute({
  getParentRoute: () => protectedRoute,
  id: "app",
  component: () => (
    <AppShellFrame>
      <Outlet />
    </AppShellFrame>
  ),
});

export const teamOrganizationRoute = createRoute({
  getParentRoute: () => appRoute,
  id: "team-organization",
  component: () => (
    <RequireTeamOrganization>
      <Outlet />
    </RequireTeamOrganization>
  ),
});

export const reviewAccessRoute = createRoute({
  getParentRoute: () => appRoute,
  id: "review-access",
  component: () => (
    <RequireReviewAccess>
      <Outlet />
    </RequireReviewAccess>
  ),
});

export const superadminRoute = createRoute({
  getParentRoute: () => appRoute,
  id: "superadmin",
  component: () => (
    <RequireSuperadmin>
      <Outlet />
    </RequireSuperadmin>
  ),
});

type WorkspacePermission = Parameters<typeof RequireWorkspacePermission>[0]["permission"];

const permissionRoute = <TId extends string>(id: TId, permission: WorkspacePermission) =>
  createRoute({
    getParentRoute: () => appRoute,
    id,
    component: () => (
      <RequireWorkspacePermission permission={permission}>
        <Outlet />
      </RequireWorkspacePermission>
    ),
  });

export const canViewWorkspaceRoute = permissionRoute("can-view-workspace", "canViewWorkspace");
export const canViewModelsRoute = permissionRoute("can-view-models", "canViewModels");
export const canViewApiAccessRoute = permissionRoute("can-view-api-access", "canViewApiAccess");
export const canCreateModelsRoute = permissionRoute("can-create-models", "canCreateModels");
export const canEditModelsRoute = permissionRoute("can-edit-models", "canEditModels");
export const canManageReviewsRoute = permissionRoute("can-manage-reviews", "canManageReviews");
export const canViewPluginsRoute = permissionRoute("can-view-plugins", "canViewPlugins");
export const canManagePluginsRoute = permissionRoute("can-manage-plugins", "canManagePlugins");
