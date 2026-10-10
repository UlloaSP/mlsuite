package dev.ulloasp.mlsuite.schema.application.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

/**
 * One run a caller made on a public page, kept for good and read back by whoever made it. It
 * names nothing internal: {@code inputs} are by visible field, as an example's are, so the form
 * can be filled with them again; {@code reports} are under the public form's report keys, as
 * the run answered; {@code version} says which form they fit. {@code feedback} is the caller's own.
 */
public record PublicRunDto(
        Long id,
        int version,
        OffsetDateTime createdAt,
        Map<String, Object> inputs,
        List<PublicPredictionReportDto> reports,
        List<PublicRunFeedbackDto> feedback) {
}
