/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { KeyRound, LayoutGrid, Mail, Settings, Users } from "lucide-react";
import { SECTION_ICONS } from "@/shared/ui/section-icons";
import type { NavigationChild } from "./sidebar-navigation-support";
import type { OrganizationDto, WorkspacePermissionsDto } from "@/shared/api/openapi.gen";

/**
 * Pages of the active organization, offered from the organization switcher. A personal account
 * has no members to manage, so it keeps only what stays true of one person.
 */
export function getWorkspaceLinks(
  permissions: WorkspacePermissionsDto,
  organization: Pick<OrganizationDto, "id" | "kind">,
): NavigationChild[] {
  if (!permissions.canViewWorkspace) return [];
  const organizationPath = `/workspace/organizations/${organization.id}`;
  const overview = { to: "/workspace", icon: LayoutGrid, label: "Overview", exact: true };
  const auditLog = permissions.canViewAuditLog
    ? [{ to: `${organizationPath}/audit-log`, icon: SECTION_ICONS.audit, label: "Audit log" }]
    : [];
  if (organization.kind === "PERSONAL") return [overview, ...auditLog];

  return [
    overview,
    ...(permissions.canViewMembers
      ? [{ to: `${organizationPath}/members`, icon: Users, label: "Members" }]
      : []),
    ...(permissions.canViewInvitations || permissions.canInviteMembers
      ? [{ to: `${organizationPath}/invitations`, icon: Mail, label: "Invitations" }]
      : []),
    ...(permissions.canViewMembers ||
    permissions.canInviteMembers ||
    permissions.canManageMemberRoles
      ? [{ to: `${organizationPath}/roles`, icon: KeyRound, label: "Roles & templates" }]
      : []),
    ...auditLog,
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
