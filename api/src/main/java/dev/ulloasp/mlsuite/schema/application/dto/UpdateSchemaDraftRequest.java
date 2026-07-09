package dev.ulloasp.mlsuite.schema.application.dto;

import java.util.List;
import java.util.Map;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

public record UpdateSchemaDraftRequest(
        @jakarta.validation.constraints.NotNull Long expectedDraftRevision,
        @NotBlank String name,
        @NotEmpty Map<String, Object> formSchema,
        @NotEmpty List<Map<String, Object>> bindings) {
}
