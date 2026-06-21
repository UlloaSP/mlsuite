/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

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
  | "canManageReviewLinks"
  | "canViewPlugins"
  | "canManagePlugins";
