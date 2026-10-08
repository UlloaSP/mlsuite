package dev.ulloasp.mlsuite.schema.application.dto;

import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedbackType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** The caller's answers about the reports of their public run; each replaces the one before it. */
public record PublicRunFeedbackRequest(@NotEmpty @Size(max = 50) List<@Valid Item> items) {

    public record Item(@NotBlank String reportKey, @NotNull PredictionResultFeedbackType type, @NotNull JsonNode value) {
    }
}
