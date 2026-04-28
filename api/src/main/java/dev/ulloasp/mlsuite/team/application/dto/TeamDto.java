package dev.ulloasp.mlsuite.team.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.team.domain.model.Team;

public record TeamDto(
        Long id,
        Long organizationId,
        String slug,
        String name,
        String description,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {

    public static TeamDto from(Team team) {
        return new TeamDto(
                team.getId(),
                team.getOrganization().getId(),
                team.getSlug(),
                team.getName(),
                team.getDescription(),
                team.getCreatedAt(),
                team.getUpdatedAt());
    }
}
