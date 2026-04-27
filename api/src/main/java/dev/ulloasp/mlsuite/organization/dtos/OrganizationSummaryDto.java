package dev.ulloasp.mlsuite.organization.dtos;

import java.util.List;

public record OrganizationSummaryDto(
        Long id,
        String name,
        String slug,
        String status,
        List<String> roleNames) {
}
