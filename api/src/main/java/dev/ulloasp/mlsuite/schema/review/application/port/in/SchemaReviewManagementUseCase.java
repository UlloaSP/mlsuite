package dev.ulloasp.mlsuite.schema.review.application.port.in;

import java.util.List;

import dev.ulloasp.mlsuite.schema.review.application.dto.ReviewAssignmentCountsDto;
import dev.ulloasp.mlsuite.schema.review.application.dto.SchemaReviewAssignmentStatusDto;

public interface SchemaReviewManagementUseCase {
    List<SchemaReviewAssignmentStatusDto> assignmentStatus(Long userId, Long predictionRunId);

    /** One reviewer's assignment to the inference in one of its review runs. */
    SchemaReviewAssignmentStatusDto assignment(Long userId, Long predictionRunId, String reviewRunId,
            Long reviewerId);

    ReviewAssignmentCountsDto assignmentCounts(Long userId, Long predictionRunId);

    void reopen(Long userId, String reviewId, String reviewRunId, Long reviewerId);

    void deleteResponse(Long userId, String reviewId, String reviewRunId, Long reviewerId);

    /** Removes the review with the answers given in it; its runs stay, as do answers given elsewhere. */
    void delete(Long userId, String reviewId);
}
