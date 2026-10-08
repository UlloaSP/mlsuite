/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReactNode } from "react";
import { createBrowserRouter, Navigate, Outlet, type RouteObject } from "react-router";
import { EXPLORE_PATH } from "@/app/components/explore-navigation";
import { AppShellFrame } from "@/app/layouts/AppShellLayout";
import { PublicLayout } from "@/app/layouts/PublicLayout";
import { SessionFrameLayout } from "@/app/layouts/SessionFrameLayout";
import { SIGN_IN_PATH } from "@/capabilities/workspace-context/session";
import { protectedPages } from "./protected-routes";
import { ProtectedRoute } from "./ProtectedRoute";
import { publicPages } from "./public-routes";
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
          // `/` has no page of its own: with or without a session, it opens the public feed.
          { index: true, element: <Navigate to={EXPLORE_PATH} replace /> },
          {
            path: SIGN_IN_PATH,
            lazy: async () => ({
              Component: (await import("@/app/pages/AuthLandingPage")).AuthLandingPage,
            }),
          },
        ],
      },
      { element: <SessionFrameLayout />, children: publicPages },
      {
        element: <ProtectedRoute />,
        children: [{ element: app(<Outlet />), children: protectedPages }],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
enableViewTransitions(router);
