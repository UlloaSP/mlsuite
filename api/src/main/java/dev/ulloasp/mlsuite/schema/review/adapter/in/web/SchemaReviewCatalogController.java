package dev.ulloasp.mlsuite.schema.review.adapter.in.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.schema.review.application.dto.ReviewAssignmentCountsDto;
import dev.ulloasp.mlsuite.schema.review.application.dto.ReviewCatalogSummaryDto;
import dev.ulloasp.mlsuite.schema.review.application.dto.ReviewInboxCatalogDto;
import dev.ulloasp.mlsuite.schema.review.application.dto.ReviewInboxItemDto;
import dev.ulloasp.mlsuite.schema.review.application.dto.SchemaReviewAssignmentStatusDto;
import dev.ulloasp.mlsuite.schema.review.application.dto.SchemaReviewRunListItemDto;
import dev.ulloasp.mlsuite.schema.review.application.port.in.SchemaReviewCatalogUseCase;
import dev.ulloasp.mlsuite.schema.review.application.port.in.SchemaReviewManagementUseCase;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/schema-reviews")
@RequiredArgsConstructor
public class SchemaReviewCatalogController {
    private final SchemaReviewCatalogUseCase catalog;
    private final SchemaReviewManagementUseCase management;

    @GetMapping("/inbox/runs/catalog")
    public ReviewInboxCatalogDto inboxRunCatalog(CurrentUser user, @ModelAttribute CatalogRequest request) {
        return catalog.inboxRuns(user.userId(), request);
    }

    @GetMapping("/inbox/{reviewId}/runs/{runId}")
    public ReviewInboxItemDto inboxRun(CurrentUser user, @PathVariable String reviewId,
            @PathVariable String runId) {
        return catalog.inboxRun(user.userId(), reviewId, runId);
    }

    @GetMapping("/inbox/{reviewId}")
    public ReviewCatalogSummaryDto inboxReview(CurrentUser user, @PathVariable String reviewId) {
        return catalog.context(user.userId(), reviewId);
    }

    @GetMapping("/inbox/{reviewId}/runs/catalog")
    public PageDto<SchemaReviewRunListItemDto> inboxReviewRunCatalog(CurrentUser user,
            @PathVariable String reviewId, @ModelAttribute CatalogRequest request) {
        return catalog.reviewRuns(user.userId(), reviewId, request);
    }

    @GetMapping("/inferences/{runId}/assignments/catalog")
    public PageDto<SchemaReviewAssignmentStatusDto> assignmentCatalog(CurrentUser user, @PathVariable Long runId,
            @ModelAttribute CatalogRequest request) {
        return catalog.assignments(user.userId(), runId, request);
    }

    @GetMapping("/inferences/{runId}/assignments/counts")
    public ReviewAssignmentCountsDto assignmentCounts(CurrentUser user, @PathVariable Long runId) {
        return management.assignmentCounts(user.userId(), runId);
    }

    @GetMapping("/inferences/{runId}/assignments/{reviewRunId}/{reviewerId}")
    public SchemaReviewAssignmentStatusDto assignment(CurrentUser user, @PathVariable Long runId,
            @PathVariable String reviewRunId, @PathVariable Long reviewerId) {
        return management.assignment(user.userId(), runId, reviewRunId, reviewerId);
    }
}
