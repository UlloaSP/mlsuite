package dev.ulloasp.mlsuite.review.application.dto;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;

public record ReviewOrganizationDto(Long id, String name) {
    public static ReviewOrganizationDto from(Organization organization) {
        return new ReviewOrganizationDto(organization.getId(), organization.getName());
    }
}
