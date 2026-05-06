package dev.ulloasp.mlsuite.team.application.dto;

import jakarta.validation.constraints.Size;

public record UpdateTeamRequest(
        @Size(max = 150) String name,
        @Size(max = 600) String description,
        Long leadMembershipId,
        Long monthlyInferenceQuota,
        String status) {
}
