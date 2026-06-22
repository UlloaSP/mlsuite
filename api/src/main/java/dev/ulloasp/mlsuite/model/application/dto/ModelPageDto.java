package dev.ulloasp.mlsuite.model.application.dto;

import java.util.List;

public record ModelPageDto(
        List<ModelDto> items,
        int page,
        int size,
        long totalItems,
        boolean hasNext) {
}
