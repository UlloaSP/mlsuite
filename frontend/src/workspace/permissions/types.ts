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
  | "MANAGE_REVIEW_LINKS"
  | "EXTERNAL_REVIEW"
  | "VIEW_PLUGINS"
  | "MANAGE_PLUGINS"
  | "VIEW_AUDIT_LOG";

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

export interface TeamPermissionsDto {
  canViewTeam: boolean;
  canEditTeam: boolean;
  canDeleteTeam: boolean;
  canViewTeamMembers: boolean;
  canManageTeamMemberRoles: boolean;
  canRemoveTeamMembers: boolean;
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
