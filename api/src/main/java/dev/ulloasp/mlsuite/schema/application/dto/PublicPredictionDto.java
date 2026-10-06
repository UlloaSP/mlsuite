package dev.ulloasp.mlsuite.schema.application.dto;

import java.util.List;

/**
 * The outcome of a public run, held only by this response: nothing about it is stored. A report
 * of the form that no model produced a result for is absent.
 */
public record PublicPredictionDto(List<PublicPredictionReportDto> reports) {
}
