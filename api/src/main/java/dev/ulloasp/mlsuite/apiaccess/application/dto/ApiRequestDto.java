package dev.ulloasp.mlsuite.apiaccess.application.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

import dev.ulloasp.mlsuite.apiaccess.domain.model.ApiRequest;
import jakarta.annotation.Nullable;

/**
 * One call in the request log. {@code predictionRunId} is the inference the call made, while it
 * exists; {@code errorCode} is the problem code the caller was answered with.
 */
public record ApiRequestDto(
        UUID requestId,
        OffsetDateTime createdAt,
        @Nullable Long clientId,
        String clientName,
        String keyPrefix,
        @Nullable Long bookmarkId,
        @Nullable String bookmarkName,
        @Nullable Long predictionRunId,
        int status,
        @Nullable String errorCode,
        int durationMs) {

    public static ApiRequestDto from(ApiRequest request) {
        return new ApiRequestDto(request.getRequestId(), request.getCreatedAt(), request.getClientId(),
                request.getClientName(), request.getKeyPrefix(), request.getBookmarkId(), request.getBookmarkName(),
                request.getPredictionRunId(), request.getStatus(), request.getErrorCode(), request.getDurationMs());
    }
}
