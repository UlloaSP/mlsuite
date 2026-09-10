package dev.ulloasp.mlsuite.organization.application.dto;

public record OrganizationAdminStatsDto(
        long totalMembers,
        long totalModels,
        long pendingInvitations) {
}
