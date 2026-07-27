/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type {
  InvitationDto,
  MembershipStatus,
  OrganizationDto,
  OrganizationRole,
  RoleScope,
  RoleSummaryDto,
  TeamDto,
  WorkspacePermissionsDto,
} from "@/capabilities/workspace-context/workspace-context.types";

export interface CreateInvitationRequest {
  email: string;
  role?: OrganizationRole;
  roleDefinitionId?: number;
  teamId?: number;
}

export interface CreateOrganizationRequest {
  name: string;
  slug?: string;
  description?: string;
  ownerUserId?: number;
}

export interface CreateRoleFromTemplateRequest {
  templateId: number;
  name?: string;
  permissionKeys?: PermissionKey[];
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
  permissionKeys: PermissionKey[];
}

export interface CreateTeamRequest {
  name: string;
  slug?: string;
  description?: string;
  leadMembershipId?: number;
  monthlyInferenceQuota?: number;
}

export interface InvitationCandidateDto {
  id: number;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
}

export interface MembershipRowActionsDto {
  canChangeRole: boolean;
  canRemove: boolean;
  assignableRoles: RoleSummaryDto[];
}

export interface OrganizationAdminDashboardDto {
  organization: OrganizationDto;
  permissions: WorkspacePermissionsDto;
  stats: OrganizationAdminStatsDto;
  recentTeams: TeamDto[];
  recentMembers: OrganizationMembershipRowDto[];
  recentInvitations: InvitationDto[];
}

export interface OrganizationAdminStatsDto {
  totalTeams: number;
  activeTeams: number;
  totalMembers: number;
  totalModels: number;
  pendingInvitations: number;
  quotaUsed: number;
  quotaLimit: number;
}

export interface OrganizationCatalogItemDto {
  id: number;
  slug: string;
  name: string;
  description?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  ownerName?: string | null;
  ownerEmail?: string | null;
  ownerAvatarUrl?: string | null;
  updatedByName?: string | null;
  updatedByEmail?: string | null;
  updatedByAvatarUrl?: string | null;
  teamCount: number;
  modelCount: number;
  schemaCount: number;
  pluginCount: number;
  inferenceCount: number;
  publicAccess: boolean;
  memberCount: number;
}

export interface OrganizationMembershipRowDto {
  id: number;
  organizationId: number;
  userId: number;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  role: RoleSummaryDto;
  legacyRole?: OrganizationRole | null;
  status: MembershipStatus;
  createdAt: string;
  actions: MembershipRowActionsDto;
}

export interface OrganizationPageDto {
  items: OrganizationCatalogItemDto[];
  page: number;
  size: number;
  totalItems: number;
  hasNext: boolean;
}

export interface PermissionDto {
  key: PermissionKey;
  label: string;
  description: string;
  dangerous: boolean;
}

export interface PermissionGroupDto {
  name: string;
  permissions: PermissionDto[];
}

export type PermissionKey =
  | "VIEW_WORKSPACE"
  | "VIEW_ORGANIZATION"
  | "EDIT_ORGANIZATION"
  | "DELETE_ORGANIZATION"
  | "TRANSFER_OWNERSHIP"
  | "VIEW_MEMBERS"
  | "INVITE_MEMBERS"
  | "MANAGE_MEMBER_ROLES"
  | "REMOVE_MEMBERS"
  | "VIEW_INVITATIONS"
  | "MANAGE_INVITATIONS"
  | "VIEW_TEAMS"
  | "CREATE_TEAMS"
  | "EDIT_TEAMS"
  | "DELETE_TEAMS"
  | "VIEW_MODELS"
  | "CREATE_MODELS"
  | "EDIT_MODELS"
  | "DELETE_MODELS"
  | "RUN_PREDICTIONS"
  | "EXPORT_PREDICTIONS"
  | "REVIEW"
  | "MANAGE_REVIEWS"
  | "VIEW_PLUGINS"
  | "MANAGE_PLUGINS"
  | "VIEW_AUDIT_LOG";

export interface RoleDefinitionDto {
  id: number;
  name: string;
  slug: string;
  description: string;
  scope: RoleScope;
  locked: boolean;
  systemKey?: string | null;
  userCount: number;
  permissions: PermissionDto[];
  actions: {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canDuplicate: boolean;
    canAssign: boolean;
  };
}

export interface RoleTemplateDto {
  id: number;
  name: string;
  description: string;
  category: string;
  scope: string;
  permissionKeys: string[];
}

export interface RolesResponseDto {
  roles: RoleDefinitionDto[];
  templates: RoleTemplateDto[];
  permissionCatalog: PermissionGroupDto[];
  stats: {
    customRoles: number;
    lockedRoles: number;
    assignedUsers: number;
  };
}

export interface TeamDetailDto extends TeamDto {
  currentUserRole?: TeamRole | null;
  permissions: TeamPermissionsDto;
}

export interface TeamMembershipRowDto {
  id: number;
  teamId: number;
  userId: number;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  role: RoleSummaryDto;
  legacyRole?: TeamRole | null;
  status: MembershipStatus;
  createdAt: string;
  actions: MembershipRowActionsDto;
}

export interface TeamPermissionsDto {
  canViewTeam: boolean;
  canEditTeam: boolean;
  canDeleteTeam: boolean;
  canViewTeamMembers: boolean;
  canManageTeamMemberRoles: boolean;
  canRemoveTeamMembers: boolean;
}

export type TeamRole = "TEAM_ADMIN" | "TEAM_MEMBER" | "TEAM_VIEWER";

export interface UpdateOrganizationRequest {
  name: string;
  slug?: string;
  description?: string;
}

export interface UpdateRoleRequest extends CreateRoleRequest {}

export interface UpdateTeamRequest {
  name?: string;
  description?: string;
  leadMembershipId?: number;
  monthlyInferenceQuota?: number;
  status?: "ACTIVE" | "INACTIVE" | "ARCHIVED";
}
