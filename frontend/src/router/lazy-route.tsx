/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { createElement, type ComponentType, type ReactNode } from "react";
import type { WorkspacePermissionKey } from "@/api/workspace/dtos";
import { RequireTeamPermission } from "@/workspace/components/RequireTeamPermission";
import {
  RequireSuperadmin,
  RequireWorkspacePermission,
} from "@/workspace/components/RequireWorkspacePermission";

type Wrap = (element: ReactNode) => ReactNode;

export const lazyPage = async (load: () => Promise<unknown>, name: string, wrap?: Wrap) => {
  const page = (await load()) as Record<string, ComponentType>;
  const element = createElement(page[name]);
  return { element: wrap ? wrap(element) : element };
};

export const superadmin: Wrap = (element) => <RequireSuperadmin>{element}</RequireSuperadmin>;
export const team: Wrap = (element) => (
  <RequireTeamPermission permission="canViewTeam">{element}</RequireTeamPermission>
);
export const workspacePage =
  (permission: WorkspacePermissionKey): Wrap =>
  (element) => (
    <RequireWorkspacePermission permission={permission}>{element}</RequireWorkspacePermission>
  );
