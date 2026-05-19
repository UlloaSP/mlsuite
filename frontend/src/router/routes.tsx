/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate, Outlet, type RouteObject } from "react-router";
import { AdminUsersPage } from "../admin/pages/admin-users-page";
import { AdminInfrastructurePage } from "../admin/infrastructure/pages/admin-infrastructure-page";
import { AuthLandingPage } from "../app/pages/AuthLandingPage";
import { NotFoundError } from "../app/pages/error-page";
import { PluginCatalogPage } from "../app/pages/plugin-catalog-page";
import { AppShellFrame } from "../layout/AppShellLayout";
import { PublicLayout } from "../layout/PublicLayout";
import { CreateModelPage } from "../models/pages/create-model-page";
import { ModelDetailPage } from "../models/pages/model-detail-page";
import { ModelsPage } from "../models/pages/models-page";
import { PredictionDetailPage } from "../models/pages/prediction-detail-page";
import { ReviewProtectedRoute } from "../review/components/ReviewProtectedRoute";
import { ReviewLoginRoute } from "../review/components/ReviewLoginRoute";
import { ReviewWorkspacePage } from "../review/pages/review-workspace-page";
import { SignatureDetailPage } from "../models/pages/signature-detail-page";
import { useUser } from "../user/hooks";
import { ProfilePage } from "../user/pages/profilePage";
import { CreateOrganizationPage } from "../workspace/pages/create-organization-page";
import { InvitationAcceptPage } from "../workspace/pages/invitation-accept-page";
import { InvitationsPage } from "../workspace/pages/invitations-page";
import { MembersPage } from "../workspace/pages/members-page";
import { OrganizationSettingsPage } from "../workspace/pages/organization-settings-page";
import { OrganizationAdminPage } from "../workspace/pages/organization-admin-page";
import { OrganizationsPage } from "../workspace/pages/organizations-page";
import { RolesPage } from "../workspace/pages/roles-page";
import { TeamDetailPage } from "../workspace/pages/team-detail-page";
import { TeamsPage } from "../workspace/pages/teams-page";
import { WorkspaceHomePage } from "../workspace/pages/workspace-home-page";
import { useWorkspaceContextSync } from "../workspace/hooks";
import { RequireTeamPermission } from "../workspace/components/RequireTeamPermission";
import {
  RequireSuperadmin,
  RequireWorkspacePermission,
} from "../workspace/components/RequireWorkspacePermission";
import type { WorkspacePermissionKey } from "../workspace/types";
import { enableViewTransitions } from "./view-transitions";

const CreatePredictionPage = lazy(async () => {
  const module = await import("../models/pages/create-prediction-page");
  return { default: module.CreatePredictionPage };
});

const CreateSignaturePage = lazy(async () => {
  const module = await import("../models/pages/create-signature-page");
  return { default: module.CreateSignaturePage };
});

function EditorRouteFallback() {
  return (
    <div className="flex size-full items-center justify-center bg-neutral-100 dark:bg-neutral-900">
      <div className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-600 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
        Loading editor…
      </div>
    </div>
  );
}

function ProtectedRoute() {
  const { data: user, error, isLoading } = useUser();
  const workspace = useWorkspaceContextSync(Boolean(user) && !error);

  if (isLoading || workspace.isLoading) {
    return <EditorRouteFallback />;
  }

  if (!user || error || workspace.error) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

function app(element: ReactNode) {
  return <AppShellFrame>{element}</AppShellFrame>;
}

function workspace(permission: WorkspacePermissionKey, element: ReactNode) {
  return (
    <RequireWorkspacePermission permission={permission}>{app(element)}</RequireWorkspacePermission>
  );
}

const routes: RouteObject[] = [
  {
    errorElement: <NotFoundError />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          {
            index: true,
            element: <AuthLandingPage />,
          },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: "workspace",
            element: workspace("canViewWorkspace", <WorkspaceHomePage />),
          },
          {
            path: "workspace/organizations",
            element: workspace("canViewOrganization", <OrganizationsPage />),
          },
          {
            path: "workspace/organizations/create",
            element: workspace("canEditOrganization", <CreateOrganizationPage />),
          },
          {
            path: "workspace/organizations/:organizationId",
            element: workspace("canViewOrganization", <OrganizationAdminPage />),
          },
          {
            path: "workspace/organizations/:organizationId/teams",
            element: workspace("canViewTeams", <TeamsPage />),
          },
          {
            path: "workspace/organizations/:organizationId/teams/:teamId",
            element: (
              <RequireTeamPermission permission="canViewTeam">
                {app(<TeamDetailPage />)}
              </RequireTeamPermission>
            ),
          },
          {
            path: "workspace/organizations/:organizationId/members",
            element: workspace("canViewMembers", <MembersPage />),
          },
          {
            path: "workspace/organizations/:organizationId/invitations",
            element: workspace("canViewInvitations", <InvitationsPage />),
          },
          {
            path: "workspace/organizations/:organizationId/roles",
            element: workspace("canViewMembers", <RolesPage />),
          },
          {
            path: "workspace/organizations/:organizationId/settings",
            element: workspace("canViewOrganization", <OrganizationSettingsPage />),
          },
          {
            path: "workspace/teams/:teamId",
            element: (
              <RequireTeamPermission permission="canViewTeam">
                {app(<TeamDetailPage />)}
              </RequireTeamPermission>
            ),
          },
          {
            path: "invite/:token",
            element: app(<InvitationAcceptPage />),
          },
          {
            path: "profile",
            element: app(<ProfilePage />),
          },
          {
            path: "admin/users",
            element: <RequireSuperadmin>{app(<AdminUsersPage />)}</RequireSuperadmin>,
          },
          {
            path: "admin/infrastructure",
            element: <RequireSuperadmin>{app(<AdminInfrastructurePage />)}</RequireSuperadmin>,
          },
          {
            path: "models",
            element: workspace("canViewModels", <ModelsPage />),
          },
          {
            path: "models/create",
            element: workspace("canCreateModels", <CreateModelPage />),
          },
          {
            path: "models/:modelId",
            element: workspace("canViewModels", <ModelDetailPage />),
          },
          {
            path: "plugins",
            element: workspace("canViewPlugins", <PluginCatalogPage />),
          },
          {
            path: "models/:modelId/signatures/:signatureId",
            element: workspace("canViewModels", <SignatureDetailPage />),
          },
          {
            path: "models/:modelId/signatures/create",
            element: workspace(
              "canEditModels",
              <Suspense fallback={<EditorRouteFallback />}>
                <CreateSignaturePage />
              </Suspense>,
            ),
          },
          {
            path: "models/:modelId/signatures/:signatureId/predictions/:predictionId",
            element: workspace("canViewModels", <PredictionDetailPage />),
          },
          {
            path: "models/:modelId/signatures/:signatureId/predictions/create",
            element: workspace(
              "canRunPredictions",
              <Suspense fallback={<EditorRouteFallback />}>
                <CreatePredictionPage />
              </Suspense>,
            ),
          },
          {
            path: "models/:modelId/signatures/:signatureId/predictions/create/:inputs",
            element: workspace(
              "canRunPredictions",
              <Suspense fallback={<EditorRouteFallback />}>
                <CreatePredictionPage />
              </Suspense>,
            ),
          },
        ],
      },
      {
        path: "review/:token/login",
        element: <ReviewLoginRoute />,
      },
      {
        element: <ReviewProtectedRoute />,
        children: [
          {
            path: "review/:token",
            element: <ReviewWorkspacePage />,
          },
          {
            path: "review/:token/predictions/:predictionToken",
            element: <ReviewWorkspacePage />,
          },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
enableViewTransitions(router);
