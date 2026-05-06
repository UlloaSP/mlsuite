package dev.ulloasp.mlsuite.team.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.team.domain.model.Team;

public record TeamDto(
        Long id,
        Long organizationId,
        String slug,
        String name,
        String description,
        String leadName,
        String leadEmail,
        long memberCount,
        long modelCount,
        long quotaUsed,
        Long quotaLimit,
        String status,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {

    public static TeamDto from(Team team) {
        return from(team, 0, 0, 0);
    }

    public static TeamDto from(Team team, long memberCount, long modelCount, long quotaUsed) {
        var lead = team.getLeadMembership() == null ? null : team.getLeadMembership().getUser();
        return new TeamDto(
                team.getId(),
                team.getOrganization().getId(),
                team.getSlug(),
                team.getName(),
                team.getDescription(),
                lead == null ? null : lead.getFullName(),
                lead == null ? null : lead.getEmail(),
                memberCount,
                modelCount,
                quotaUsed,
                team.getMonthlyInferenceQuota(),
                team.getStatus().name(),
                team.getCreatedAt(),
                team.getUpdatedAt());
    }
}
