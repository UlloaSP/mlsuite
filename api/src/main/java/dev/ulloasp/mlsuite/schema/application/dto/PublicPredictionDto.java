package dev.ulloasp.mlsuite.schema.application.dto;

import java.util.List;

/**
 * The outcome of a public run, held only by this response: nothing about it is stored. A report
 * of the form that no model produced a result for is absent. {@code quota} is what the caller
 * may still run on this bookmark now that this run is counted.
 */
public record PublicPredictionDto(List<PublicPredictionReportDto> reports, PublicRunQuotaDto quota) {
}
