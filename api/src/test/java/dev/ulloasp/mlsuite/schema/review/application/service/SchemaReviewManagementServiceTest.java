package dev.ulloasp.mlsuite.schema.review.application.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultFeedbackRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRunStatus;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewAssigneeRepository;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewRepository;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewRunRepository;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewRunSubmissionRepository;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReview;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewAssignee;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewRun;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewRunSubmission;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@ExtendWith(MockitoExtension.class)
class SchemaReviewManagementServiceTest {
    @Mock private SchemaReviewRepository reviews;
    @Mock private SchemaReviewRunRepository reviewRuns;
    @Mock private SchemaReviewRunSubmissionRepository submissions;
    @Mock private SchemaReviewAssigneeRepository assignees;
    @Mock private PredictionRunRepository runs;
    @Mock private PredictionResultFeedbackRepository feedback;
    @Mock private WorkspaceAccessService workspaceAccess;
    @Mock private WorkspaceAuthorizationService authorization;
    private SchemaReviewManagementService service;

    @BeforeEach
    void setUp() {
        service = new SchemaReviewManagementService(reviews, reviewRuns, submissions, assignees,
                runs, feedback, workspaceAccess, authorization);
    }

    @Test
    void assignmentStatus_ReturnsReviewerScopedSubmissionState() {
        Organization organization = organization();
        User reviewer = reviewer();
        PredictionRun run = run(organization);
        SchemaReview review = review(organization, run.getSchemaVersion(), OffsetDateTime.now().plusDays(1));
        SchemaReviewRun reviewRun = new SchemaReviewRun(review, run);
        SchemaReviewRunSubmission submission = new SchemaReviewRunSubmission(
                reviewRun, reviewer, OffsetDateTime.now().minusMinutes(2));
        when(workspaceAccess.requireCurrentOrganization(7L)).thenReturn(organization);
        when(runs.findByIdAndOrganizationId(50L, 41L)).thenReturn(Optional.of(run));
        when(reviewRuns.findByRunIdOrderByIdAsc(50L)).thenReturn(List.of(reviewRun));
        when(assignees.findByReviewIdOrderByIdAsc(88L))
                .thenReturn(List.of(new SchemaReviewAssignee(review, reviewer)));
        when(submissions.findByReviewRunIdAndUserId(null, 12L)).thenReturn(Optional.of(submission));

        var status = service.assignmentStatus(7L, 50L).getFirst();

        assertEquals("COMPLETED", status.reviewState());
        assertEquals(12L, status.reviewer().id());
        assertEquals(12L, status.createdBy().id());
        assertEquals(submission.getSubmittedAt(), status.submittedAt());
        verify(authorization).requireReviewManagement(7L, 41L);
    }

    @Test
    void assignmentStatus_RejectsInferenceOutsideCurrentOrganization() {
        when(workspaceAccess.requireCurrentOrganization(7L)).thenReturn(organization());
        when(runs.findByIdAndOrganizationId(50L, 41L)).thenReturn(Optional.empty());

        assertThrows(SchemaReviewUnavailableException.class,
                () -> service.assignmentStatus(7L, 50L));
    }

    @Test
    void reopen_DeletesOnlyCompletedSubmission() {
        Organization organization = organization();
        User reviewer = reviewer();
        PredictionRun run = run(organization);
        SchemaReview review = review(organization, run.getSchemaVersion(), OffsetDateTime.now().plusDays(1));
        SchemaReviewRun reviewRun = new SchemaReviewRun(review, run);
        SchemaReviewRunSubmission submission = new SchemaReviewRunSubmission(
                reviewRun, reviewer, OffsetDateTime.now());
        stubReopen(organization, review, reviewRun, reviewer.getId());
        when(submissions.findByReviewRunIdAndUserId(null, 12L)).thenReturn(Optional.of(submission));

        service.reopen(7L, review.getPublicId(), reviewRun.getPublicId(), 12L);

        verify(submissions).delete(submission);
        verifyNoInteractions(feedback);
        verify(authorization).requireReviewManagement(7L, 41L);
    }

    @Test
    void reopen_RejectsExpiredReview() {
        Organization organization = organization();
        PredictionRun run = run(organization);
        SchemaReview review = review(organization, run.getSchemaVersion(), OffsetDateTime.now().minusMinutes(1));
        when(workspaceAccess.requireCurrentOrganization(7L)).thenReturn(organization);
        when(reviews.findByPublicIdAndOrganizationId(review.getPublicId(), 41L))
                .thenReturn(Optional.of(review));

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.reopen(7L, review.getPublicId(), "run", 12L));

        assertEquals(HttpStatus.CONFLICT, error.getStatusCode());
    }

    @Test
    void reopen_RejectsUnassignedReviewer() {
        Organization organization = organization();
        PredictionRun run = run(organization);
        SchemaReview review = review(organization, run.getSchemaVersion(), OffsetDateTime.now().plusDays(1));
        SchemaReviewRun reviewRun = new SchemaReviewRun(review, run);
        when(workspaceAccess.requireCurrentOrganization(7L)).thenReturn(organization);
        when(reviews.findByPublicIdAndOrganizationId(review.getPublicId(), 41L))
                .thenReturn(Optional.of(review));
        when(reviewRuns.findByReviewIdAndPublicId(88L, reviewRun.getPublicId()))
                .thenReturn(Optional.of(reviewRun));
        when(assignees.existsByReviewIdAndUserId(88L, 12L)).thenReturn(false);

        assertThrows(SchemaReviewUnavailableException.class,
                () -> service.reopen(7L, review.getPublicId(), reviewRun.getPublicId(), 12L));
    }

    @Test
    void reopen_RejectsSubmissionThatIsNotCompleted() {
        Organization organization = organization();
        PredictionRun run = run(organization);
        SchemaReview review = review(organization, run.getSchemaVersion(), OffsetDateTime.now().plusDays(1));
        SchemaReviewRun reviewRun = new SchemaReviewRun(review, run);
        stubReopen(organization, review, reviewRun, 12L);
        when(submissions.findByReviewRunIdAndUserId(null, 12L)).thenReturn(Optional.empty());

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.reopen(7L, review.getPublicId(), reviewRun.getPublicId(), 12L));

        assertEquals(HttpStatus.CONFLICT, error.getStatusCode());
    }

    @Test
    void deleteResponse_RemovesSubmissionAndReviewerFeedback() {
        Organization organization = organization();
        User reviewer = reviewer();
        PredictionRun run = run(organization);
        SchemaReview review = review(organization, run.getSchemaVersion(), OffsetDateTime.now().plusDays(1));
        SchemaReviewRun reviewRun = new SchemaReviewRun(review, run);
        SchemaReviewRunSubmission submission = new SchemaReviewRunSubmission(
                reviewRun, reviewer, OffsetDateTime.now());
        stubReopen(organization, review, reviewRun, reviewer.getId());
        when(submissions.findByReviewRunIdAndUserId(null, 12L)).thenReturn(Optional.of(submission));

        service.deleteResponse(7L, review.getPublicId(), reviewRun.getPublicId(), 12L);

        verify(submissions).delete(submission);
        verify(feedback).deleteByResultRunIdAndUserId(50L, 12L);
        verify(authorization).requireReviewManagement(7L, 41L);
    }

    @Test
    void deleteResponse_RejectsAssignmentWithoutSavedResponse() {
        Organization organization = organization();
        PredictionRun run = run(organization);
        SchemaReview review = review(organization, run.getSchemaVersion(), OffsetDateTime.now().plusDays(1));
        SchemaReviewRun reviewRun = new SchemaReviewRun(review, run);
        stubReopen(organization, review, reviewRun, 12L);
        when(submissions.findByReviewRunIdAndUserId(null, 12L)).thenReturn(Optional.empty());
        when(feedback.existsByResultRunIdAndUserId(50L, 12L)).thenReturn(false);

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.deleteResponse(7L, review.getPublicId(), reviewRun.getPublicId(), 12L));

        assertEquals(HttpStatus.CONFLICT, error.getStatusCode());
    }

    @Test
    void deleteResponse_RejectsUnassignedReviewer() {
        Organization organization = organization();
        PredictionRun run = run(organization);
        SchemaReview review = review(organization, run.getSchemaVersion(), OffsetDateTime.now().plusDays(1));
        SchemaReviewRun reviewRun = new SchemaReviewRun(review, run);
        when(workspaceAccess.requireCurrentOrganization(7L)).thenReturn(organization);
        when(reviews.findByPublicIdAndOrganizationId(review.getPublicId(), 41L))
                .thenReturn(Optional.of(review));
        when(reviewRuns.findByReviewIdAndPublicId(88L, reviewRun.getPublicId()))
                .thenReturn(Optional.of(reviewRun));
        when(assignees.existsByReviewIdAndUserId(88L, 12L)).thenReturn(false);

        assertThrows(SchemaReviewUnavailableException.class,
                () -> service.deleteResponse(7L, review.getPublicId(), reviewRun.getPublicId(), 12L));

        verifyNoInteractions(feedback);
    }

    @Test
    void deleteResponse_RejectsReviewOutsideCurrentOrganization() {
        Organization organization = organization();
        when(workspaceAccess.requireCurrentOrganization(7L)).thenReturn(organization);
        when(reviews.findByPublicIdAndOrganizationId("missing", 41L)).thenReturn(Optional.empty());

        assertThrows(SchemaReviewUnavailableException.class,
                () -> service.deleteResponse(7L, "missing", "run", 12L));

        verifyNoInteractions(feedback);
    }

    private void stubReopen(Organization organization, SchemaReview review,
            SchemaReviewRun reviewRun, Long reviewerId) {
        when(workspaceAccess.requireCurrentOrganization(7L)).thenReturn(organization);
        when(reviews.findByPublicIdAndOrganizationId(review.getPublicId(), 41L))
                .thenReturn(Optional.of(review));
        when(reviewRuns.findByReviewIdAndPublicId(88L, reviewRun.getPublicId()))
                .thenReturn(Optional.of(reviewRun));
        when(assignees.existsByReviewIdAndUserId(88L, reviewerId)).thenReturn(true);
    }

    private SchemaReview review(Organization organization, SchemaVersion version,
            OffsetDateTime expiresAt) {
        SchemaReview review = new SchemaReview(organization, version.getSchema(), version, reviewer(), expiresAt);
        review.setId(88L);
        return review;
    }

    private PredictionRun run(Organization organization) {
        Schema schema = new Schema(organization, "Risk", null);
        schema.setId(5L);
        SchemaVersion version = new SchemaVersion(schema, 1, "v1", Map.of("fields", List.of()));
        version.setId(9L);
        PredictionRun run = new PredictionRun(version, "case", Map.of(), PredictionRunStatus.SUCCESS);
        run.setId(50L);
        return run;
    }

    private User reviewer() {
        User user = new User();
        user.setId(12L);
        user.setFullName("Reviewer");
        user.setEmail("reviewer@example.com");
        return user;
    }

    private Organization organization() {
        Organization organization = new Organization();
        organization.setId(41L);
        organization.setName("Org");
        organization.setSlug("org");
        return organization;
    }
}
