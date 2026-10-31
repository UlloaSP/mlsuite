package dev.ulloasp.mlsuite.schema.application.dto;

import java.util.List;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** One slice of a selection; the catalog's whole-result selection is sent a slice at a time. */
public record DeletePredictionRunsRequest(@NotEmpty @Size(max = 500) List<@NotNull Long> runIds) {
}
