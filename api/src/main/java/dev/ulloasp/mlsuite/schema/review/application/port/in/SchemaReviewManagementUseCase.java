package dev.ulloasp.mlsuite.schema.review.application.port.in;

import java.util.List;

import dev.ulloasp.mlsuite.schema.review.application.dto.SchemaReviewAssignmentStatusDto;

public interface SchemaReviewManagementUseCase {
    List<SchemaReviewAssignmentStatusDto> assignmentStatus(Long userId, Long predictionRunId);

    void reopen(Long userId, String reviewId, String reviewRunId, Long reviewerId);

    void deleteResponse(Long userId, String reviewId, String reviewRunId, Long reviewerId);
}
