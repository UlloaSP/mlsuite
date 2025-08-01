import { createBrowserRouter, type RouteObject } from "react-router-dom"
import { HomePage } from "../app/pages/homePage"
import { ModelAnalyzerPage } from "../form/pages/model-analyzer-page"
import Layout from "../Layout"
import { CreateModelPage } from "../models/pages/create-model-page"
import { CreateSignaturePage } from "../models/pages/create-signature-page"
import { ModelsPage } from "../models/pages/models-page"
import { ProfilePage } from "../user/pages/profilePage"

export const routes: RouteObject[] = [
    {
        path: "/",
        element: <Layout />,
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
                path: "analyzer",
                element: <ModelAnalyzerPage />,
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
                path: "models/signatures/create",
                element: <CreateSignaturePage />,
            }
        ],
    },
]

export const router = createBrowserRouter(routes)
