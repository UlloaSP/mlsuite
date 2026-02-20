/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { createBrowserRouter, type RouteObject } from "react-router-dom";
import { NotFoundError } from "../app/pages/error-page";
import { HomePage } from "../app/pages/homePage";
import Layout from "../Layout";
import { CreateModelPage } from "../models/pages/create-model-page";
import { CreatePredictionPage } from "../models/pages/create-prediction-page";
import { CreateSignaturePage } from "../models/pages/create-signature-page";
import { ModelsPage } from "../models/pages/models-page";
import { ProfilePage } from "../user/pages/profilePage";

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
				element: <CreateSignaturePage />,
			},
			{
				path: "models/:modelId/signatures/:signatureId/predictions/create",
				element: <CreatePredictionPage />,
			},
			{
				path: "models/:modelId/signatures/:signatureId/predictions/create/:inputs",
				element: <CreatePredictionPage />,
			},
		],
	},
];

export const router = createBrowserRouter(routes);
