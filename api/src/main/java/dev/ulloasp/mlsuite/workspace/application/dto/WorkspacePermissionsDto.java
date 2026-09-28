package dev.ulloasp.mlsuite.workspace.application.dto;

import java.util.Set;

import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;

public record WorkspacePermissionsDto(
        boolean canViewWorkspace,
        boolean canViewOrganization,
        boolean canEditOrganization,
        boolean canDeleteOrganization,
        boolean canTransferOwnership,
        boolean canViewMembers,
        boolean canInviteMembers,
        boolean canManageMemberRoles,
        boolean canRemoveMembers,
        boolean canViewInvitations,
        boolean canManageInvitations,
        boolean canViewModels,
        boolean canCreateModels,
        boolean canEditModels,
        boolean canDeleteModels,
        boolean canRunPredictions,
        boolean canExportPredictions,
        boolean canReview,
        boolean canManageReviews,
        boolean canViewPlugins,
        boolean canManagePlugins) {

    public static WorkspacePermissionsDto from(Set<PermissionKey> granted) {
        return new WorkspacePermissionsDto(
                granted.contains(PermissionKey.VIEW_WORKSPACE),
                granted.contains(PermissionKey.VIEW_ORGANIZATION),
                granted.contains(PermissionKey.EDIT_ORGANIZATION),
                granted.contains(PermissionKey.DELETE_ORGANIZATION),
                granted.contains(PermissionKey.TRANSFER_OWNERSHIP),
                granted.contains(PermissionKey.VIEW_MEMBERS),
                granted.contains(PermissionKey.INVITE_MEMBERS),
                granted.contains(PermissionKey.MANAGE_MEMBER_ROLES),
                granted.contains(PermissionKey.REMOVE_MEMBERS),
                granted.contains(PermissionKey.VIEW_INVITATIONS),
                granted.contains(PermissionKey.MANAGE_INVITATIONS),
                granted.contains(PermissionKey.VIEW_MODELS),
                granted.contains(PermissionKey.CREATE_MODELS),
                granted.contains(PermissionKey.EDIT_MODELS),
                granted.contains(PermissionKey.DELETE_MODELS),
                granted.contains(PermissionKey.RUN_PREDICTIONS),
                granted.contains(PermissionKey.EXPORT_PREDICTIONS),
                granted.contains(PermissionKey.REVIEW),
                granted.contains(PermissionKey.MANAGE_REVIEWS),
                granted.contains(PermissionKey.VIEW_PLUGINS),
                granted.contains(PermissionKey.MANAGE_PLUGINS));
    }
}
