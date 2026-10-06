package dev.ulloasp.mlsuite.schema.application.dto;

import java.time.Instant;

import dev.ulloasp.mlsuite.schema.domain.exception.PublicRunLimitException;

/**
 * The 429 of a public run: the fields of every error response, plus which limit was reached and
 * the caller's quota, whose {@code resetsAt} is when a run is accepted again.
 */
public record PublicRunLimitDto(
        Instant timestamp,
        int status,
        String message,
        String path,
        PublicRunLimitCode code,
        PublicRunQuotaDto quota) {

    public static PublicRunLimitDto of(PublicRunLimitException refusal, int status, String path) {
        return new PublicRunLimitDto(
                Instant.now(),
                status,
                refusal.getMessage(),
                path,
                refusal.isSignedIn()
                        ? PublicRunLimitCode.SIGNED_IN_RUN_LIMIT_REACHED
                        : PublicRunLimitCode.ANONYMOUS_RUN_LIMIT_REACHED,
                new PublicRunQuotaDto(refusal.getLimit(), 0, refusal.getResetsAt()));
    }
}
