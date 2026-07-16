package dev.ulloasp.mlsuite.organization.application.dto;

import java.util.List;

public record OrganizationPageDto(
        List<OrganizationCatalogItemDto> items,
        int page,
        int size,
        long totalItems,
        boolean hasNext) {
}
