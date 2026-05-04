package dev.ulloasp.mlsuite.search.application.dto;

import java.util.List;

public record SearchResponseDto(
        String query,
        List<SearchGroupDto> groups) {
}
