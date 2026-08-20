/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export interface InvitationDto {
  id: number;
  organizationId: number;
  organizationName: string;
  teamId?: number | null;
  email: string;
  role: OrganizationRole;
  roleDefinition?: RoleSummaryDto | null;
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
  role: OrganizationRole;
  status: MembershipStatus;
  createdAt: string;
}

export type OrganizationRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export type RoleScope = "SYSTEM" | "ORGANIZATION" | "TEAM";

export interface RoleSummaryDto {
  id: number | null;
  name: string;
  slug: string;
  scope: RoleScope;
  locked: boolean;
  systemKey?: string | null;
}

export interface TeamDto {
  id: number;
  organizationId: number;
  slug: string;
  name: string;
  description?: string | null;
  leadName?: string | null;
  leadEmail?: string | null;
  memberCount?: number;
  modelCount?: number;
  quotaUsed?: number;
  quotaLimit?: number | null;
  status?: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceContextDto {
  user: WorkspaceUserDto;
  memberships: OrganizationMembershipDto[];
  organizations: OrganizationDto[];
  currentOrganization: OrganizationDto;
  currentMembership: OrganizationMembershipDto;
  teams: TeamDto[];
  invitations: InvitationDto[];
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
  | "canViewTeams"
  | "canCreateTeams"
  | "canEditTeams"
  | "canDeleteTeams"
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

export interface WorkspacePermissionsDto {
  canViewWorkspace: boolean;
  canViewOrganization: boolean;
  canEditOrganization: boolean;
  canDeleteOrganization: boolean;
  canTransferOwnership: boolean;
  canViewMembers: boolean;
  canInviteMembers: boolean;
  canManageMemberRoles: boolean;
  canRemoveMembers: boolean;
  canViewInvitations: boolean;
  canManageInvitations: boolean;
  canViewTeams: boolean;
  canCreateTeams: boolean;
  canEditTeams: boolean;
  canDeleteTeams: boolean;
  canViewModels: boolean;
  canCreateModels: boolean;
  canEditModels: boolean;
  canDeleteModels: boolean;
  canRunPredictions: boolean;
  canExportPredictions: boolean;
  canReview: boolean;
  canManageReviews: boolean;
  canViewPlugins: boolean;
  canManagePlugins: boolean;
}

export interface WorkspaceUserDto {
  id: number;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
}
