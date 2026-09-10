package dev.ulloasp.mlsuite.schema.review.application.service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultFeedbackRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewAssigneeRepository;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewRepository;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewRunRepository;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewRunSubmissionRepository;
import dev.ulloasp.mlsuite.schema.review.application.dto.SchemaReviewAssignmentStatusDto;
import dev.ulloasp.mlsuite.schema.review.application.dto.SchemaReviewReviewerDto;
import dev.ulloasp.mlsuite.schema.review.application.port.in.SchemaReviewManagementUseCase;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReview;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewAssignee;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewRun;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewRunSubmission;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@Service
@Transactional
public class SchemaReviewManagementService implements SchemaReviewManagementUseCase {
    private final SchemaReviewRepository reviews;
    private final SchemaReviewRunRepository reviewRuns;
    private final SchemaReviewRunSubmissionRepository submissions;
    private final SchemaReviewAssigneeRepository assignees;
    private final PredictionRunRepository runs;
    private final PredictionResultFeedbackRepository feedback;
    private final WorkspaceAccessService workspaceAccess;
    private final WorkspaceAuthorizationService authorization;

    public SchemaReviewManagementService(SchemaReviewRepository reviews,
            SchemaReviewRunRepository reviewRuns, SchemaReviewRunSubmissionRepository submissions,
            SchemaReviewAssigneeRepository assignees, PredictionRunRepository runs,
            PredictionResultFeedbackRepository feedback, WorkspaceAccessService workspaceAccess,
            WorkspaceAuthorizationService authorization) {
        this.reviews = reviews;
        this.reviewRuns = reviewRuns;
        this.submissions = submissions;
        this.assignees = assignees;
        this.runs = runs;
        this.feedback = feedback;
        this.workspaceAccess = workspaceAccess;
        this.authorization = authorization;
    }

    @Transactional(readOnly = true)
    public List<SchemaReviewAssignmentStatusDto> assignmentStatus(Long userId, Long predictionRunId) {
        Long organizationId = organizationId(userId);
        authorization.requireReviewManagement(userId, organizationId);
        runs.findByIdAndOrganizationId(predictionRunId, organizationId)
                .orElseThrow(SchemaReviewUnavailableException::new);
        return reviewRuns.findByRunIdOrderByIdAsc(predictionRunId).stream()
                .flatMap(reviewRun -> assignees.findByReviewIdOrderByIdAsc(reviewRun.getReview().getId()).stream()
                        .map(assignee -> status(reviewRun, assignee)))
                .toList();
    }

    public void reopen(Long userId, String reviewId, String reviewRunId, Long reviewerId) {
        Long organizationId = organizationId(userId);
        authorization.requireReviewManagement(userId, organizationId);
        SchemaReview review = reviews.findByPublicIdAndOrganizationId(reviewId, organizationId)
                .orElseThrow(SchemaReviewUnavailableException::new);
        if (!review.getExpiresAt().isAfter(now())) throw conflict("Expired review cannot be reopened");
        SchemaReviewRun reviewRun = reviewRuns.findByReviewIdAndPublicId(review.getId(), reviewRunId)
                .orElseThrow(SchemaReviewUnavailableException::new);
        if (!assignees.existsByReviewIdAndUserId(review.getId(), reviewerId)) {
            throw new SchemaReviewUnavailableException();
        }
        SchemaReviewRunSubmission submission = submissions
                .findByReviewRunIdAndUserId(reviewRun.getId(), reviewerId)
                .orElseThrow(() -> conflict("Review submission is not completed"));
        submissions.delete(submission);
    }

    public void deleteResponse(Long userId, String reviewId, String reviewRunId, Long reviewerId) {
        Long organizationId = organizationId(userId);
        authorization.requireReviewManagement(userId, organizationId);
        SchemaReview review = reviews.findByPublicIdAndOrganizationId(reviewId, organizationId)
                .orElseThrow(SchemaReviewUnavailableException::new);
        SchemaReviewRun reviewRun = reviewRuns.findByReviewIdAndPublicId(review.getId(), reviewRunId)
                .orElseThrow(SchemaReviewUnavailableException::new);
        if (!assignees.existsByReviewIdAndUserId(review.getId(), reviewerId)) {
            throw new SchemaReviewUnavailableException();
        }
        Optional<SchemaReviewRunSubmission> submission = submissions
                .findByReviewRunIdAndUserId(reviewRun.getId(), reviewerId);
        boolean hasFeedback = feedback.existsByResultRunIdAndUserId(reviewRun.getRun().getId(), reviewerId);
        if (submission.isEmpty() && !hasFeedback) throw conflict("Review response is already empty");
        submission.ifPresent(submissions::delete);
        feedback.deleteByResultRunIdAndUserId(reviewRun.getRun().getId(), reviewerId);
    }

    private SchemaReviewAssignmentStatusDto status(SchemaReviewRun reviewRun,
            SchemaReviewAssignee assignee) {
        SchemaReview review = reviewRun.getReview();
        Long reviewerId = assignee.getUser().getId();
        SchemaReviewRunSubmission submission = submissions
                .findByReviewRunIdAndUserId(reviewRun.getId(), reviewerId).orElse(null);
        String state = submission != null ? "COMPLETED"
                : feedback.existsByResultRunIdAndUserId(reviewRun.getRun().getId(), reviewerId)
                        ? "IN_PROGRESS"
                        : "PENDING";
        return new SchemaReviewAssignmentStatusDto(
                review.getPublicId(), reviewRun.getPublicId(),
                SchemaReviewReviewerDto.from(assignee.getUser()),
                SchemaReviewReviewerDto.from(review.getCreatedBy()), state,
                submission == null ? null : submission.getSubmittedAt(),
                review.getCreatedAt(), review.getUpdatedAt(),
                review.getExpiresAt(), !review.getExpiresAt().isAfter(now()));
    }

    private Long organizationId(Long userId) {
        return workspaceAccess.requireCurrentOrganization(userId).getId();
    }

    private OffsetDateTime now() {
        return OffsetDateTime.now(ZoneOffset.UTC);
    }

    private ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }
}
