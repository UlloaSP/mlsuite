package dev.ulloasp.mlsuite.organization.application.dto;

/** Counts are zero when the caller lacks the permission to see that resource. */
public record OrganizationAdminStatsDto(
        long totalMembers,
        long totalModels,
        long pendingInvitations,
        long totalSchemas,
        long totalInferences,
        long totalPlugins,
        long totalReviews) {
}
