package dev.ulloasp.mlsuite.team.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.team.domain.model.Team;

public record TeamDetailDto(
        Long id,
        Long organizationId,
        String slug,
        String name,
        String description,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        String currentUserRole,
        TeamPermissionsDto permissions) {

    public static TeamDetailDto from(
            Team team,
            String currentUserRole,
            TeamPermissionsDto permissions) {
        return new TeamDetailDto(
                team.getId(),
                team.getOrganization().getId(),
                team.getSlug(),
                team.getName(),
                team.getDescription(),
                team.getCreatedAt(),
                team.getUpdatedAt(),
                currentUserRole,
                permissions);
    }
}
