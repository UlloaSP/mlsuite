/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, Outlet, type RouteObject } from "react-router";
import { useUser } from "../user/hooks";
import { Unauthorized } from "../app/pages/Unauthorized";
import { NotFoundError } from "../app/pages/error-page";
import { PluginCatalogPage } from "../app/pages/plugin-catalog-page";
import Layout from "../Layout";
import { CreateModelPage } from "../models/pages/create-model-page";
import { ModelDetailPage } from "../models/pages/model-detail-page";
import { ModelsPage } from "../models/pages/models-page";
import { PredictionDetailPage } from "../models/pages/prediction-detail-page";
import { SignatureDetailPage } from "../models/pages/signature-detail-page";
import { ProfilePage } from "../user/pages/profilePage";
import { CreateOrganizationPage } from "../workspace/pages/create-organization-page";
import { InvitationAcceptPage } from "../workspace/pages/invitation-accept-page";
import { InvitationsPage } from "../workspace/pages/invitations-page";
import { MembersPage } from "../workspace/pages/members-page";
import { OrganizationSettingsPage } from "../workspace/pages/organization-settings-page";
import { OrganizationsPage } from "../workspace/pages/organizations-page";
import { TeamDetailPage } from "../workspace/pages/team-detail-page";
import { TeamsPage } from "../workspace/pages/teams-page";
import { WorkspaceHomePage } from "../workspace/pages/workspace-home-page";
import { useWorkspaceContextSync } from "../workspace/hooks";

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
		<div className="flex size-full items-center justify-center bg-gray-100 dark:bg-gray-900">
			<div className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
				Loading editor...
			</div>
		</div>
	);
}

function IndexRoute() {
	const { data: user, error } = useUser();

	if (user && !error) {
		return <Navigate to="/workspace" replace />;
	}

	return <Unauthorized />;
}

function ProtectedRoute() {
	const { data: user, error, isLoading } = useUser();
	const workspace = useWorkspaceContextSync(Boolean(user) && !error);

	if (isLoading || workspace.isLoading) {
		return <EditorRouteFallback />;
	}

	if (!user || error || workspace.error) {
		return <NotFoundError />;
	}

	return <Outlet />;
}

export const routes: RouteObject[] = [
	{
		path: "/",
		element: <Layout />,
		errorElement: <NotFoundError />,

		children: [
			{
				index: true,
				element: <IndexRoute />,
			},
			{
				element: <ProtectedRoute />,
				children: [
					{
						path: "workspace",
						element: <WorkspaceHomePage />,
					},
					{
						path: "workspace/organizations",
						element: <OrganizationsPage />,
					},
					{
						path: "workspace/organizations/create",
						element: <CreateOrganizationPage />,
					},
					{
						path: "workspace/organizations/:organizationId",
						element: <OrganizationSettingsPage />,
					},
					{
						path: "workspace/organizations/:organizationId/teams",
						element: <TeamsPage />,
					},
					{
						path: "workspace/organizations/:organizationId/members",
						element: <MembersPage />,
					},
					{
						path: "workspace/organizations/:organizationId/invitations",
						element: <InvitationsPage />,
					},
					{
						path: "workspace/teams/:teamId",
						element: <TeamDetailPage />,
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
						path: "models",
						element: <ModelsPage />,
					},
					{
						path: "models/create",
						element: <CreateModelPage />,
					},
					{
						path: "models/:modelId",
						element: <ModelDetailPage />,
					},
					{
						path: "plugins",
						element: <PluginCatalogPage />,
					},
					{
						path: "models/:modelId/signatures/:signatureId",
						element: <SignatureDetailPage />,
					},
					{
						path: "models/:modelId/signatures/create",
						element: (
							<Suspense fallback={<EditorRouteFallback />}>
								<CreateSignaturePage />
							</Suspense>
						),
					},
					{
						path: "models/:modelId/signatures/:signatureId/predictions/:predictionId",
						element: <PredictionDetailPage />,
					},
					{
						path: "models/:modelId/signatures/:signatureId/predictions/create",
						element: (
							<Suspense fallback={<EditorRouteFallback />}>
								<CreatePredictionPage />
							</Suspense>
						),
					},
					{
						path: "models/:modelId/signatures/:signatureId/predictions/create/:inputs",
						element: (
							<Suspense fallback={<EditorRouteFallback />}>
								<CreatePredictionPage />
							</Suspense>
						),
					},
				],
			},
		],
	},
];

export const router = createBrowserRouter(routes);
