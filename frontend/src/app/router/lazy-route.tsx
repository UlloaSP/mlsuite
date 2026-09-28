/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ComponentType, ReactElement } from "react";
import { Outlet, type RouteObject } from "react-router";
import type { WorkspacePermissionKey } from "@/capabilities/workspace-context/workspace-context.types";
import { RequireWorkspacePermission } from "@/features/workspace/components/RequireWorkspacePermission";
import { RequireSuperadmin } from "@/features/workspace/components/RequireSuperadmin";
import { RequireReviewAccess } from "@/features/reviews/components/RequireReviewAccess";

/** A lazily loaded page; keep `load` a literal `import()` so each page gets its own chunk. */
export const page = (path: string, load: () => Promise<ComponentType>): RouteObject => ({
  path,
  lazy: async () => ({ Component: await load() }),
});

const guard = (element: ReactElement, children: RouteObject[]): RouteObject => ({
  element,
  children,
});

export const superadmin = (children: RouteObject[]) =>
  guard(
    <RequireSuperadmin>
      <Outlet />
    </RequireSuperadmin>,
    children,
  );

export const reviewAccess = (children: RouteObject[]) =>
  guard(
    <RequireReviewAccess>
      <Outlet />
    </RequireReviewAccess>,
    children,
  );

export const workspace = (permission: WorkspacePermissionKey, children: RouteObject[]) =>
  guard(
    <RequireWorkspacePermission permission={permission}>
      <Outlet />
    </RequireWorkspacePermission>,
    children,
  );
