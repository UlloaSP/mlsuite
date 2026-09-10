package dev.ulloasp.mlsuite.search.application.dto;

public record SearchResultDto(
        String type,
        String id,
        String title,
        String subtitle,
        String href,
        Long organizationId,
        Long modelId) {
}
