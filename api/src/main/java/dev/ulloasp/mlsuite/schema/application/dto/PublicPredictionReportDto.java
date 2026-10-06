package dev.ulloasp.mlsuite.schema.application.dto;

import java.util.Map;

/** What the runtime returned for one report of the public form, under that report's key. */
public record PublicPredictionReportDto(String key, Map<String, Object> payload) {
}
