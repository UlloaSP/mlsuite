package dev.ulloasp.mlsuite.team.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateTeamRequest(
        @NotBlank @Size(max = 150) String name,
        @Size(max = 120) String slug,
        @Size(max = 600) String description) {
}
