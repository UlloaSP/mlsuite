package dev.ulloasp.mlsuite.search.application.dto;

import java.util.List;

public record SearchGroupDto(
        String label,
        List<SearchResultDto> results) {
}
