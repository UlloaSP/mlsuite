package dev.ulloasp.mlsuite.role.application.dto;

public record RoleActionsDto(
        boolean canView,
        boolean canEdit,
        boolean canDelete,
        boolean canDuplicate,
        boolean canAssign) {
}
