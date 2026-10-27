package dev.ulloasp.mlsuite.schema.application.dto;

import java.time.Instant;
import java.util.List;

import dev.ulloasp.mlsuite.schema.domain.exception.SchemaMappingException;

/** A refused schema: the error every endpoint answers, with each mapping that names nothing. */
public record SchemaMappingErrorDto(
        Instant timestamp,
        int status,
        String message,
        String path,
        List<SchemaMappingIssueDto> issues) {

    public static SchemaMappingErrorDto of(SchemaMappingException refusal, int status, String path) {
        return new SchemaMappingErrorDto(Instant.now(), status, refusal.getMessage(), path, refusal.getIssues());
    }
}
