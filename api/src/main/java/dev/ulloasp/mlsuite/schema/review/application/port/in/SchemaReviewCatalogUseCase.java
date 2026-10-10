package dev.ulloasp.mlsuite.schema.review.application.port.in;

import dev.ulloasp.mlsuite.schema.review.application.dto.ReviewCatalogSummaryDto;
import dev.ulloasp.mlsuite.schema.review.application.dto.ReviewInboxCatalogDto;
import dev.ulloasp.mlsuite.schema.review.application.dto.ReviewInboxItemDto;
import dev.ulloasp.mlsuite.schema.review.application.dto.SchemaReviewAssignmentStatusDto;
import dev.ulloasp.mlsuite.schema.review.application.dto.SchemaReviewRunListItemDto;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;

/** Paged reads of a reviewer's inbox and of the review assignments of one inference. */
public interface SchemaReviewCatalogUseCase {

    /** The runs the reviewer still has to submit, with how many of the whole inbox are started and untouched. */
    ReviewInboxCatalogDto inboxRuns(Long userId, CatalogRequest request);

    /** One run of the inbox; a submitted run, or one of a review that is not open and assigned, is not found. */
    ReviewInboxItemDto inboxRun(Long userId, String reviewId, String reviewRunId);

    ReviewCatalogSummaryDto context(Long userId, String reviewId);

    PageDto<SchemaReviewRunListItemDto> reviewRuns(Long userId, String reviewId, CatalogRequest request);

    PageDto<SchemaReviewAssignmentStatusDto> assignments(Long userId, Long predictionRunId, CatalogRequest request);
}
