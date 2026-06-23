/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

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
  canManageReviewLinks: boolean;
  canViewPlugins: boolean;
  canManagePlugins: boolean;
}
