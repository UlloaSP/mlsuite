package dev.ulloasp.mlsuite.team.application.dto;

public record TeamPermissionsDto(
        boolean canViewTeam,
        boolean canEditTeam,
        boolean canDeleteTeam,
        boolean canViewTeamMembers,
        boolean canManageTeamMemberRoles,
        boolean canRemoveTeamMembers) {
}
