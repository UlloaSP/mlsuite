/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.application.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.user.domain.model.User;
public record ModelDto(
        Long id,
        String name,
        String type,
        String specificType,
        String fileName,
        Map<String, Object> inputSchema,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        OffsetDateTime archivedAt,
        String updatedByName,
        String updatedByEmail,
        String updatedByAvatarUrl,
        long fieldCount,
        long reportCount) {

    public static final ModelDto toDto(Model model) {
        User modifier = model.getUpdatedBy() == null ? model.getUser() : model.getUpdatedBy();
        return new ModelDto(
                model.getId(),
                model.getName(),
                model.getType(),
                model.getSpecificType(),
                model.getFileName(),
                model.getInputSchema(),
                model.getCreatedAt(),
                model.getUpdatedAt(),
                model.getArchivedAt(),
                modifier == null ? null : modifier.getFullName(),
                modifier == null ? null : modifier.getEmail(),
                modifier == null ? null : modifier.getAvatarUrl(),
                countVisibleFields(model.getInputSchema()),
                countReports(model.getInputSchema()));
    }

    public static final List<ModelDto> toDtoList(List<Model> models) {
        return models.stream()
                .map(ModelDto::toDto)
                .toList();
    }

    private static long countVisibleFields(Map<String, Object> inputSchema) {
        Object fields = inputSchema == null ? null : inputSchema.get("fields");
        if (!(fields instanceof List<?> list)) return 0;
        return list.stream()
                .filter(Map.class::isInstance)
                .map(Map.class::cast)
                .filter(field -> !Boolean.TRUE.equals(field.get("hidden")))
                .count();
    }

    private static long countReports(Map<String, Object> inputSchema) {
        Object reports = inputSchema == null ? null : inputSchema.get("reports");
        return reports instanceof List<?> list ? list.size() : 0;
    }
}

