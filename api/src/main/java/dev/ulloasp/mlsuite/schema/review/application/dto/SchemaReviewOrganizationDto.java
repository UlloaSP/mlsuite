package dev.ulloasp.mlsuite.schema.review.application.dto;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;

public record SchemaReviewOrganizationDto(Long id, String name) {
    public static SchemaReviewOrganizationDto from(Organization organization) {
        return new SchemaReviewOrganizationDto(organization.getId(), organization.getName());
    }
}
