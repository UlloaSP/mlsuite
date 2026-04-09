/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { lazy, Suspense } from "react";
import { createBrowserRouter, type RouteObject } from "react-router";
import { NotFoundError } from "../app/pages/error-page";
import { HomePage } from "../app/pages/homePage";
import Layout from "../Layout";
import { CreateModelPage } from "../models/pages/create-model-page";
import { ModelsPage } from "../models/pages/models-page";
import { ProfilePage } from "../user/pages/profilePage";

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

export const routes: RouteObject[] = [
	{
		path: "/",
		element: <Layout />,
		errorElement: <NotFoundError />,

		children: [
			{
				index: true,
				element: <HomePage />,
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
				path: "models/:modelId/signatures/create",
				element: (
					<Suspense fallback={<EditorRouteFallback />}>
						<CreateSignaturePage />
					</Suspense>
				),
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
];

export const router = createBrowserRouter(routes);
