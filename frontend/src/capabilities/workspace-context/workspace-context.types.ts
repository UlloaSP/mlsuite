/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export interface InvitationDto {
  id: number;
  organizationId: number;
  organizationName: string;
  email: string;
  roleDefinition: RoleSummaryDto;
  status: InvitationStatus;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export type InvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";

export type MembershipStatus = "ACTIVE" | "PENDING" | "REMOVED";

export interface OrganizationDto {
  id: number;
  slug: string;
  name: string;
  description?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMembershipDto {
  id: number;
  organizationId: number;
  userId: number;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  roleDefinition: RoleSummaryDto;
  status: MembershipStatus;
  createdAt: string;
}

export type OrganizationRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export type RoleScope = "SYSTEM" | "ORGANIZATION";

export interface RoleSummaryDto {
  id: number | null;
  name: string;
  slug: string;
  scope: RoleScope;
  locked: boolean;
  systemKey?: string | null;
}

export interface WorkspaceContextDto {
  user: WorkspaceUserDto;
  memberships: OrganizationMembershipDto[];
  organizations: OrganizationDto[];
  currentOrganization: OrganizationDto;
  currentMembership: OrganizationMembershipDto;
  permissions: WorkspacePermissionsDto;
}

export type WorkspacePermissionKey =
  | "canViewWorkspace"
  | "canViewOrganization"
  | "canEditOrganization"
  | "canDeleteOrganization"
  | "canTransferOwnership"
  | "canViewMembers"
  | "canInviteMembers"
  | "canManageMemberRoles"
  | "canRemoveMembers"
  | "canViewInvitations"
  | "canManageInvitations"
  | "canViewModels"
  | "canCreateModels"
  | "canEditModels"
  | "canDeleteModels"
  | "canRunPredictions"
  | "canExportPredictions"
  | "canReview"
  | "canManageReviews"
  | "canViewPlugins"
  | "canManagePlugins";

export type WorkspacePermissionsDto = Record<WorkspacePermissionKey, boolean>;

export interface WorkspaceUserDto {
  id: number;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
}
