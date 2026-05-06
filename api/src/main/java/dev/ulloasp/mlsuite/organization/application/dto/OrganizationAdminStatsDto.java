package dev.ulloasp.mlsuite.organization.application.dto;

public record OrganizationAdminStatsDto(
        long totalTeams,
        long activeTeams,
        long totalMembers,
        long totalModels,
        long pendingInvitations,
        long quotaUsed,
        long quotaLimit) {
}
