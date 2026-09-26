/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { KeyRound, LayoutGrid, Mail, Settings, Users } from "lucide-react";
import type { WorkspacePermissionsDto } from "@/capabilities/workspace-context/workspace-context.types";
import type { NavigationChild } from "./sidebar-navigation-support";

/** Pages of the active organization, offered from the organization switcher. */
export function getWorkspaceLinks(
  permissions: WorkspacePermissionsDto,
  organizationId: number,
): NavigationChild[] {
  if (!permissions.canViewWorkspace) return [];
  const organizationPath = `/workspace/organizations/${organizationId}`;

  return [
    { to: "/workspace", icon: LayoutGrid, label: "Overview", exact: true },
    ...(permissions.canViewMembers
      ? [{ to: `${organizationPath}/members`, icon: Users, label: "Members" }]
      : []),
    ...(permissions.canViewInvitations || permissions.canInviteMembers
      ? [{ to: `${organizationPath}/invitations`, icon: Mail, label: "Invitations" }]
      : []),
    ...(permissions.canViewMembers ||
    permissions.canInviteMembers ||
    permissions.canManageMemberRoles
      ? [{ to: `${organizationPath}/roles`, icon: KeyRound, label: "Roles & Templates" }]
      : []),
    ...(permissions.canViewOrganization
      ? [{ to: `${organizationPath}/settings`, icon: Settings, label: "Settings" }]
      : []),
  ];
}

export function isWorkspacePath(pathname: string, organizationId: number) {
  return (
    pathname === "/workspace" || pathname.startsWith(`/workspace/organizations/${organizationId}/`)
  );
}
