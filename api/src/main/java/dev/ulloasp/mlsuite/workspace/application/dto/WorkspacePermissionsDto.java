package dev.ulloasp.mlsuite.workspace.application.dto;

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
}
