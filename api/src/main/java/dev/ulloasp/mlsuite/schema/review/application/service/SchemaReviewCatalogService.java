package dev.ulloasp.mlsuite.schema.review.application.service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultFeedbackRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaModelBindingRepository;
import dev.ulloasp.mlsuite.schema.application.dto.PredictionRunDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaVersionDto;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResult;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewRepository;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewRunRepository;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewRunRepository.ReviewerRun;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewRunSubmissionRepository;
import dev.ulloasp.mlsuite.schema.review.application.dto.ReviewCatalogSummaryDto;
import dev.ulloasp.mlsuite.schema.review.application.dto.ReviewInboxCatalogDto;
import dev.ulloasp.mlsuite.schema.review.application.dto.ReviewInboxItemDto;
import dev.ulloasp.mlsuite.schema.review.application.dto.SchemaReviewAssignmentStatusDto;
import dev.ulloasp.mlsuite.schema.review.application.dto.SchemaReviewRunListItemDto;
import dev.ulloasp.mlsuite.schema.review.application.port.in.SchemaReviewCatalogUseCase;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReview;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewRun;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewRunSubmission;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewState;
import dev.ulloasp.mlsuite.util.CatalogPages;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import lombok.RequiredArgsConstructor;

/**
 * A reviewer's inbox read one page at a time. The database selects, counts and orders the review
 * runs; results and answers are loaded only for the runs a response carries.
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class SchemaReviewCatalogService implements SchemaReviewCatalogUseCase {
    private final SchemaReviewRepository reviews;
    private final SchemaReviewRunRepository reviewRuns;
    private final SchemaReviewRunSubmissionRepository submissions;
    private final SchemaReviewAssignmentService assignees;
    private final SchemaReviewAssignmentCatalogService assignmentCatalog;
    private final SchemaModelBindingRepository bindings;
    private final PredictionResultRepository results;
    private final PredictionResultFeedbackRepository feedback;
    private final WorkspaceAccessService workspaceAccess;
    private final WorkspaceAuthorizationService authorization;

    @Override
    public ReviewInboxCatalogDto inboxRuns(Long userId, CatalogRequest request) {
        Long organizationId = reviewerOrganization(userId);
        OffsetDateTime now = now();
        Page<ReviewerRun> page = reviewRuns.findInboxPage(organizationId, userId, now, request.filter(),
                CatalogPages.likeLiteral(request.search()), unsorted(request));
        List<ReviewerRun> rows = page.getContent();
        List<SchemaReviewRunListItemDto> runs = items(userId, rows);
        List<ReviewInboxItemDto> items = IntStream.range(0, rows.size())
                .mapToObj(index -> inboxItem(rows.get(index).getReview(), runs.get(index)))
                .toList();
        return new ReviewInboxCatalogDto(items, page.getNumber(), page.getSize(), page.getTotalElements(),
                page.hasNext(),
                reviewRuns.countInbox(organizationId, userId, now, SchemaReviewState.IN_PROGRESS.name()),
                reviewRuns.countInbox(organizationId, userId, now, SchemaReviewState.PENDING.name()));
    }

    @Override
    public ReviewInboxItemDto inboxRun(Long userId, String reviewId, String reviewRunId) {
        SchemaReview review = accessibleReview(userId, reviewId);
        SchemaReviewRun reviewRun = reviewRuns.findByReviewIdAndPublicId(review.getId(), reviewRunId)
                .filter(found -> !submissions.existsByReviewRunIdAndUserId(found.getId(), userId))
                .orElseThrow(SchemaReviewUnavailableException::new);
        PredictionRun run = reviewRun.getRun();
        Set<Long> started = feedback.existsByResultRunIdAndUserId(run.getId(), userId)
                ? Set.of(run.getId())
                : Set.of();
        return inboxItem(review,
                item(reviewRun, run, null, results.findByRunIdOrderByIdAsc(run.getId()), started));
    }

    @Override
    public ReviewCatalogSummaryDto context(Long userId, String reviewId) {
        SchemaReview review = accessibleReview(userId, reviewId);
        SchemaVersion version = review.getSchemaVersion();
        return new ReviewCatalogSummaryDto(review.getPublicId(), SchemaDto.from(review.getSchema()),
                SchemaVersionDto.from(version, bindings.findBySchemaVersionId(version.getId())),
                reviewRuns.countInReview(review.getId(), userId, "all"),
                reviewRuns.countInReview(review.getId(), userId, SchemaReviewState.IN_PROGRESS.name()),
                reviewRuns.countInReview(review.getId(), userId, SchemaReviewState.COMPLETED.name()));
    }

    @Override
    public PageDto<SchemaReviewRunListItemDto> reviewRuns(Long userId, String reviewId, CatalogRequest request) {
        SchemaReview review = accessibleReview(userId, reviewId);
        Page<ReviewerRun> page = reviewRuns.findReviewPage(review.getId(), userId, request.filter(),
                CatalogPages.likeLiteral(request.search()), unsorted(request));
        return PageDto.of(page, items(userId, page.getContent()));
    }

    @Override
    public PageDto<SchemaReviewAssignmentStatusDto> assignments(Long userId, Long predictionRunId,
            CatalogRequest request) {
        return assignmentCatalog.page(userId, predictionRunId, request);
    }

    /** Results and the reviewer's progress for exactly these runs, in two reads. */
    private List<SchemaReviewRunListItemDto> items(Long userId, List<ReviewerRun> rows) {
        if (rows.isEmpty()) {
            return List.of();
        }
        List<Long> runIds = rows.stream().map(row -> row.getRun().getId()).toList();
        Map<Long, List<PredictionResult>> runResults = results.findByRunIdInOrderByRunIdAscIdAsc(runIds).stream()
                .collect(Collectors.groupingBy(result -> result.getRun().getId()));
        Set<Long> started = feedback.findRunIdsAnsweredBy(runIds, userId);
        return rows.stream()
                .map(row -> item(row.getReviewRun(), row.getRun(), row.getSubmission(),
                        runResults.getOrDefault(row.getRun().getId(), List.of()), started))
                .toList();
    }

    private SchemaReviewRunListItemDto item(SchemaReviewRun reviewRun, PredictionRun run,
            SchemaReviewRunSubmission submission, List<PredictionResult> runResults, Set<Long> started) {
        SchemaReviewState state = submission != null ? SchemaReviewState.COMPLETED
                : started.contains(run.getId()) ? SchemaReviewState.IN_PROGRESS : SchemaReviewState.PENDING;
        return new SchemaReviewRunListItemDto(reviewRun.getPublicId(), PredictionRunDto.from(run, runResults),
                state,
                submission == null ? run.getCreatedAt() : submission.getSubmittedAt(),
                submission == null ? null : submission.getSubmittedAt());
    }

    private ReviewInboxItemDto inboxItem(SchemaReview review, SchemaReviewRunListItemDto item) {
        return new ReviewInboxItemDto(item.publicId(), item.run(), item.reviewState(), item.stateEnteredAt(),
                item.submittedAt(), review.getPublicId(), review.getSchema().getName());
    }

    /** The same visibility as the inbox: an open review of the organization, assigned to the reviewer. */
    private SchemaReview accessibleReview(Long userId, String reviewId) {
        Long organizationId = reviewerOrganization(userId);
        return reviews.findByPublicIdAndOrganizationId(reviewId, organizationId)
                .filter(review -> review.getExpiresAt().isAfter(now()))
                .filter(review -> assignees.isAssigned(review.getId(), userId))
                .orElseThrow(SchemaReviewUnavailableException::new);
    }

    private Long reviewerOrganization(Long userId) {
        Long organizationId = workspaceAccess.requireCurrentOrganization(userId).getId();
        authorization.require(userId, organizationId, PermissionKey.REVIEW, PermissionKey.MANAGE_REVIEWS);
        return organizationId;
    }

    /** The queries carry their own order, which a page request must not replace. */
    private Pageable unsorted(CatalogRequest request) {
        return CatalogPages.pageable(request, Sort.unsorted());
    }

    private OffsetDateTime now() {
        return OffsetDateTime.now(ZoneOffset.UTC);
    }
}
