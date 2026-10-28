package dev.ulloasp.mlsuite.schema.review.application.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.function.Executable;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.node.JsonNodeFactory;

import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultFeedbackRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultFeedbackRevisionRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaModelBindingRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaVersionRepository;
import dev.ulloasp.mlsuite.schema.application.dto.CreatePredictionResultFeedbackRequest;
import dev.ulloasp.mlsuite.schema.application.dto.UpdatePredictionResultFeedbackRequest;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResult;
import dev.ulloasp.mlsuite.schema.application.service.FeedbackHistory;
import dev.ulloasp.mlsuite.schema.catalog.InferenceRows;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedback;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedbackChange;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedbackType;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultStatus;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRunStatus;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewRepository;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewRunRepository;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewRunSubmissionRepository;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReview;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewRun;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

/**
 * A reviewer's answers, the workspace's only way to write feedback on a saved run: only an
 * assigned reviewer of an open review writes them, only their own, only on the run under review,
 * and never once they submitted it.
 */
@ExtendWith(MockitoExtension.class)
class SchemaReviewFeedbackTest {

    private static final String REVIEW = "review-public-id";
    private static final String RUN = "review-run-public-id";

    @Mock private SchemaReviewRepository reviews;
    @Mock private SchemaReviewRunRepository reviewRuns;
    @Mock private SchemaReviewRunSubmissionRepository submissions;
    @Mock private SchemaReviewAssignmentService assignments;
    @Mock private WorkspaceAccessService workspaceAccess;
    @Mock private WorkspaceAuthorizationService authorization;
    @Mock private UserLookupService users;
    @Mock private PredictionRunRepository runs;
    @Mock private PredictionResultRepository results;
    @Mock private PredictionResultFeedbackRepository feedback;
    @Mock private PredictionResultFeedbackRevisionRepository revisions;
    @Mock private InferenceRows inferenceRows;

    private SchemaReviewService service;
    private PredictionResult result;
    private PredictionResultFeedback ownAnswer;

    @BeforeEach
    void setUp() {
        service = new SchemaReviewService(reviews, reviewRuns, submissions, assignments, workspaceAccess,
                authorization, users, mock(SchemaRepository.class),
                mock(SchemaVersionRepository.class),
                mock(SchemaModelBindingRepository.class), runs, results, feedback,
                new FeedbackHistory(feedback, revisions, inferenceRows));
        Organization organization = new Organization();
        organization.setId(41L);
        Schema schema = new Schema(organization, "Risk", null);
        SchemaVersion version = new SchemaVersion(schema, 1, "v1", Map.of("fields", List.of()));
        SchemaReview review = new SchemaReview(organization, schema, version, user(1L),
                OffsetDateTime.now().plusDays(1));
        review.setId(88L);
        PredictionRun run = run(version, 50L);
        result = result(run, 77L);
        ownAnswer = new PredictionResultFeedback(result, user(7L), review, PredictionResultFeedbackType.OUTPUT, 0,
                JsonNodeFactory.instance.objectNode().put("correct", true));
        ownAnswer.setId(90L);
        lenient().when(workspaceAccess.requireCurrentOrganization(7L)).thenReturn(organization);
        lenient().when(reviews.findByPublicIdAndOrganizationId(REVIEW, 41L)).thenReturn(Optional.of(review));
        lenient().when(assignments.isAssigned(88L, 7L)).thenReturn(true);
        lenient().when(reviewRuns.findByReviewIdAndPublicId(88L, RUN))
                .thenReturn(Optional.of(new SchemaReviewRun(review, run)));
        lenient().when(results.findById(77L)).thenReturn(Optional.of(result));
        lenient().when(feedback.findById(90L)).thenReturn(Optional.of(ownAnswer));
        lenient().when(users.requireById(7L)).thenReturn(user(7L));
        lenient().when(feedback.saveAndFlush(any(PredictionResultFeedback.class))).thenAnswer(call -> call.getArgument(0));
    }

    @Test
    void anAssignedReviewerAnswersTheRunUnderReviewInThatReviewAndTheAnswerIsKeptInItsHistory() {
        var saved = service.createFeedback(7L, REVIEW, RUN, create(77L));

        assertEquals(77L, saved.resultId());
        verify(authorization).require(7L, 41L, PermissionKey.REVIEW, PermissionKey.MANAGE_REVIEWS);
        verify(feedback).saveAndFlush(argThat(answer -> answer.getReview() != null && answer.getReview().getId() == 88L));
        verify(revisions).save(argThat(revision -> revision.getChange() == PredictionResultFeedbackChange.CREATED
                && revision.getReviewId() == 88L && revision.getChangedByUserId() == 7L));
        // The run's stored inferences row is no longer current.
        verify(inferenceRows).answersChanged(50L);
    }

    @Test
    void aReviewerChangesTheirOwnAnswerAndTheChangeJoinsItsHistory() {
        var saved = service.updateFeedback(7L, REVIEW, RUN, update(90L));

        assertEquals(false, saved.value().get("correct").asBoolean());
        verify(revisions).save(argThat(revision -> revision.getChange() == PredictionResultFeedbackChange.UPDATED
                && !revision.getValue().get("correct").asBoolean()));
    }

    @Test
    void anAnswerGivenInAnotherReviewIsNotChangedThroughThisOne() {
        SchemaReview other = new SchemaReview(ownAnswer.getResult().getRun().getSchemaVersion().getSchema().getOrganization(),
                ownAnswer.getResult().getRun().getSchemaVersion().getSchema(), ownAnswer.getResult().getRun().getSchemaVersion(),
                user(1L), OffsetDateTime.now().plusDays(1));
        other.setId(99L);
        ownAnswer.setReview(other);

        assertRefused(403, () -> service.updateFeedback(7L, REVIEW, RUN, update(90L)));
    }

    @Test
    void aSubmittedReviewTakesNoNewAnswer() {
        when(submissions.existsByReviewRunIdAndUserId(null, 7L)).thenReturn(true);

        assertRefused(404, () -> service.createFeedback(7L, REVIEW, RUN, create(77L)));
    }

    @Test
    void aSubmittedReviewKeepsItsAnswers() {
        when(submissions.existsByReviewRunIdAndUserId(null, 7L)).thenReturn(true);

        assertRefused(404, () -> service.updateFeedback(7L, REVIEW, RUN, update(90L)));
    }

    @Test
    void noOneRewritesAnotherReviewersAnswer() {
        ownAnswer.setUser(user(8L));

        assertRefused(403, () -> service.updateFeedback(7L, REVIEW, RUN, update(90L)));
    }

    @Test
    void anAnswerOfAnotherRunIsNotChangedThroughThisOne() {
        ownAnswer.setResult(result(run(result.getRun().getSchemaVersion(), 51L), 78L));

        assertRefused(403, () -> service.updateFeedback(7L, REVIEW, RUN, update(90L)));
    }

    @Test
    void aResultOfAnotherRunIsNotAnsweredThroughThisOne() {
        when(results.findById(78L)).thenReturn(Optional.of(result(run(result.getRun().getSchemaVersion(), 51L), 78L)));

        assertRefused(404, () -> service.createFeedback(7L, REVIEW, RUN, create(78L)));
    }

    @Test
    void aMemberNotAssignedToTheReviewWritesNothing() {
        when(assignments.isAssigned(88L, 7L)).thenReturn(false);

        assertRefused(404, () -> service.createFeedback(7L, REVIEW, RUN, create(77L)));
        assertRefused(404, () -> service.updateFeedback(7L, REVIEW, RUN, update(90L)));
    }

    @Test
    void aMemberWithoutReviewPermissionWritesNothing() {
        doThrow(new OrganizationAccessDeniedException(41L)).when(authorization)
                .require(7L, 41L, PermissionKey.REVIEW, PermissionKey.MANAGE_REVIEWS);

        assertThrows(OrganizationAccessDeniedException.class, () -> service.createFeedback(7L, REVIEW, RUN, create(77L)));
        assertThrows(OrganizationAccessDeniedException.class, () -> service.updateFeedback(7L, REVIEW, RUN, update(90L)));
        verify(feedback, never()).saveAndFlush(any());
    }

    private void assertRefused(int status, Executable call) {
        ResponseStatusException error = assertThrows(ResponseStatusException.class, call);

        assertEquals(status, error.getStatusCode().value());
        verify(feedback, never()).saveAndFlush(any());
        verify(revisions, never()).save(any());
    }

    private static CreatePredictionResultFeedbackRequest create(long resultId) {
        return new CreatePredictionResultFeedbackRequest(resultId, PredictionResultFeedbackType.OUTPUT, 0,
                JsonNodeFactory.instance.objectNode().put("correct", true));
    }

    private static UpdatePredictionResultFeedbackRequest update(long feedbackId) {
        return new UpdatePredictionResultFeedbackRequest(feedbackId,
                JsonNodeFactory.instance.objectNode().put("correct", false));
    }

    private static PredictionRun run(SchemaVersion version, long id) {
        PredictionRun run = new PredictionRun(version, "case-" + id, Map.of(), PredictionRunStatus.SUCCESS);
        run.setId(id);
        return run;
    }

    private static PredictionResult result(PredictionRun run, long id) {
        Model model = new Model();
        model.setId(11L);
        PredictionResult result = new PredictionResult(run, model, Map.of(), Map.of(), PredictionResultStatus.SUCCESS,
                null, null);
        result.setId(id);
        return result;
    }

    private static User user(long id) {
        User user = new User();
        user.setId(id);
        return user;
    }
}
