/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReactNode } from "react";
import { createBrowserRouter, Outlet, type RouteObject } from "react-router";
import { AdminUsersPage } from "../admin/pages/admin-users-page";
import { AdminInfrastructurePage } from "../admin/infrastructure/pages/admin-infrastructure-page";
import { AuthLandingPage } from "../app/pages/AuthLandingPage";
import { NotFoundError } from "../app/pages/error-page";
import { PluginCatalogPage } from "../plugin/catalog/pages/PluginCatalogPage";
import { AppShellFrame } from "../layout/AppShellLayout";
import { PublicLayout } from "../layout/PublicLayout";
import { CreateModelPage } from "../models/pages/create-model-page";
import { ModelDetailPage } from "../models/pages/model-detail-page";
import { ModelsPage } from "../models/pages/models-page";
import { SchemaReviewLoginRoute } from "../review/components/SchemaReviewLoginRoute";
import { SchemaReviewProtectedRoute } from "../review/components/SchemaReviewProtectedRoute";
import { SchemaReviewWorkspacePage } from "../review/pages/review-workspace-page";
import { CreateSchemaPage } from "../schemas/pages/create-schema-page";
import { CreateSchemaRunPage } from "../schemas/pages/create-schema-run-page";
import { CreateSchemaVersionPage } from "../schemas/pages/create-schema-version-page";
import { PredictionRunDetailPage } from "../schemas/pages/prediction-run-detail-page";
import { SchemaRunHistoryPage } from "../schemas/pages/schema-run-history-page";
import { SchemaDetailPage } from "../schemas/pages/schema-detail-page";
import { SchemasPage } from "../schemas/pages/schemas-page";
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
import { RequireTeamPermission } from "../workspace/components/RequireTeamPermission";
import {
  RequireSuperadmin,
  RequireWorkspacePermission,
} from "../workspace/components/RequireWorkspacePermission";
import type { WorkspacePermissionKey } from "../api/workspace/dtos";
import { ProtectedRoute } from "./route-components";
import { enableViewTransitions } from "./view-transitions";

function app(element: ReactNode) {
  return <AppShellFrame>{element}</AppShellFrame>;
}

function workspace(permission: WorkspacePermissionKey, element: ReactNode) {
  return <RequireWorkspacePermission permission={permission}>{element}</RequireWorkspacePermission>;
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
            element: app(<Outlet />),
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
                    <TeamDetailPage />
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
                    <TeamDetailPage />
                  </RequireTeamPermission>
                ),
              },
              {
                path: "invite/:token",
                element: <InvitationAcceptPage />,
              },
              {
                path: "profile",
                element: <ProfilePage />,
              },
              {
                path: "admin/users",
                element: (
                  <RequireSuperadmin>
                    <AdminUsersPage />
                  </RequireSuperadmin>
                ),
              },
              {
                path: "admin/infrastructure",
                element: (
                  <RequireSuperadmin>
                    <AdminInfrastructurePage />
                  </RequireSuperadmin>
                ),
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
                path: "schemas",
                element: workspace("canViewModels", <SchemasPage />),
              },
              {
                path: "schemas/create",
                element: workspace("canEditModels", <CreateSchemaPage />),
              },
              {
                path: "schemas/:schemaId",
                element: workspace("canViewModels", <SchemaDetailPage />),
              },
              {
                path: "schemas/:schemaId/versions/create",
                element: workspace("canEditModels", <CreateSchemaVersionPage />),
              },
              {
                path: "schemas/:schemaId/versions/:versionId/runs/create",
                element: workspace("canRunPredictions", <CreateSchemaRunPage />),
              },
              {
                path: "schemas/:schemaId/versions/:versionId/runs",
                element: workspace("canViewModels", <SchemaRunHistoryPage />),
              },
              {
                path: "schemas/:schemaId/versions/:versionId/runs/:runId",
                element: workspace("canViewModels", <PredictionRunDetailPage />),
              },
            ],
          },
        ],
      },
      {
        path: "review/:token/login",
        element: <SchemaReviewLoginRoute />,
      },
      {
        element: <SchemaReviewProtectedRoute />,
        children: [
          {
            path: "review/:token",
            element: <SchemaReviewWorkspacePage />,
          },
          {
            path: "review/:token/runs/:runToken",
            element: <SchemaReviewWorkspacePage />,
          },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
enableViewTransitions(router);
