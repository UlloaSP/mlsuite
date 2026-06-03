package dev.ulloasp.mlsuite.schema.application.dto;

import java.util.List;
import java.util.Map;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

public record CreateSchemaVersionRequest(
        String name,
        @NotEmpty Map<String, Object> formSchema,
        @NotEmpty List<@Valid CreateSchemaModelBindingRequest> bindings) {
}
