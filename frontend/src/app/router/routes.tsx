/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReactNode } from "react";
import { createBrowserRouter, Outlet, type RouteObject } from "react-router";
import { AppShellFrame } from "@/app/layouts/AppShellLayout";
import { PublicLayout } from "@/app/layouts/PublicLayout";
import { lazyPage } from "./lazy-route";
import { protectedPages } from "./protected-routes";
import { ProtectedRoute } from "./ProtectedRoute";
import { RouteErrorBoundary } from "./RouteErrorBoundary";
import { enableViewTransitions } from "./view-transitions";

const app = (element: ReactNode) => <AppShellFrame>{element}</AppShellFrame>;

export const routes: RouteObject[] = [
  {
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          {
            index: true,
            lazy: () => lazyPage(() => import("@/app/pages/AuthLandingPage"), "AuthLandingPage"),
          },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [{ element: app(<Outlet />), children: protectedPages }],
      },
      {
        path: "review/:token/login",
        lazy: () =>
          lazyPage(() => import("@/app/pages/schema-review-login-route"), "SchemaReviewLoginRoute"),
      },
      {
        lazy: () =>
          lazyPage(
            () => import("@/features/reviews/components/SchemaReviewProtectedRoute"),
            "SchemaReviewProtectedRoute",
          ),
        children: [
          {
            path: "review/:token",
            lazy: () =>
              lazyPage(
                () => import("@/features/reviews/pages/review-workspace-page"),
                "SchemaReviewWorkspacePage",
              ),
          },
          {
            path: "review/:token/runs/:runToken",
            lazy: () =>
              lazyPage(
                () => import("@/features/reviews/pages/review-workspace-page"),
                "SchemaReviewWorkspacePage",
              ),
          },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
enableViewTransitions(router);
