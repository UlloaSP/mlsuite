package dev.ulloasp.mlsuite.schema.application.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

public record CreateSchemaWithInitialVersionRequest(
        @NotNull @Valid CreateSchemaRequest schema,
        @NotNull @Valid CreateSchemaVersionRequest initialVersion) {
}
