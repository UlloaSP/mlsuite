package dev.ulloasp.mlsuite.team.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.team.domain.model.TeamMembership;

public record TeamMembershipDto(
        Long id,
        Long teamId,
        Long userId,
        String fullName,
        String email,
        String avatarUrl,
        String role,
        String status,
        OffsetDateTime createdAt) {

    public static TeamMembershipDto from(TeamMembership membership) {
        return new TeamMembershipDto(
                membership.getId(),
                membership.getTeam().getId(),
                membership.getUser().getId(),
                membership.getUser().getFullName(),
                membership.getUser().getEmail(),
                membership.getUser().getAvatarUrl(),
                membership.getRole().name(),
                membership.getStatus().name(),
                membership.getCreatedAt());
    }
}
