package dev.ulloasp.mlsuite.schema;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.ResultActions;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResult;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedback;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedbackChange;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedbackRevision;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedbackType;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultStatus;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRunStatus;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaDraft;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReview;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewAssignee;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewRun;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewRunSubmission;
import dev.ulloasp.mlsuite.user.domain.model.User;

/** Every delete a member has, over HTTP on PostgreSQL: what goes, what stays, and each refusal. */
class ContentDeletionHttpTest extends PublicPredictionFixture {

    private JdbcTemplate jdbc;
    private RoleDefinition role;
    private PredictionRun run;
    private SchemaReview review;
    private SchemaDraft draft;
    private Long answer;

    @BeforeEach
    void reviewedRun() {
        jdbc = new JdbcTemplate(dataSource);
        role = authorizeOwner();
        inTransaction(() -> {
            run = new PredictionRun(bookmark, version, "reviewed", Map.of("Age", 1), PredictionRunStatus.SUCCESS);
            entityManager.persist(run);
            PredictionResult result = new PredictionResult(run, entityManager.find(forestModel.getClass(), forestModel.getId()),
                    Map.of(), Map.of(), PredictionResultStatus.SUCCESS, null, null);
            entityManager.persist(result);
            User reviewer = entityManager.find(User.class, owner.getId());
            review = new SchemaReview(entityManager.getReference(Organization.class, organization.getId()), schema,
                    version, reviewer, OffsetDateTime.now().plusDays(1));
            entityManager.persist(review);
            entityManager.persist(new SchemaReviewAssignee(review, reviewer));
            SchemaReviewRun reviewRun = new SchemaReviewRun(review, run);
            entityManager.persist(reviewRun);
            entityManager.persist(new SchemaReviewRunSubmission(reviewRun, reviewer, OffsetDateTime.now()));
            PredictionResultFeedback given = new PredictionResultFeedback(result, reviewer, review,
                    PredictionResultFeedbackType.OUTPUT, 0, objectMapper.valueToTree(Map.of("a", 1)));
            entityManager.persist(given);
            entityManager.flush();
            answer = given.getId();
            entityManager.persist(new PredictionResultFeedbackRevision(given, PredictionResultFeedbackChange.CREATED,
                    reviewer.getId(), OffsetDateTime.now()));
            draft = new SchemaDraft(schema, version, "wip", Map.of("fields", List.of()), List.of());
            entityManager.persist(draft);
        });
    }

    private ResultActions remove(String path, Object... ids) throws Exception {
        return mockMvc.perform(signedIn(delete(path, ids), owner.getId()));
    }

    private long rows(String sql, Object... args) {
        return jdbc.queryForObject("SELECT count(*) FROM " + sql, Long.class, args);
    }

    private Long openJob() {
        return jdbc.queryForObject("""
                INSERT INTO prediction_job (organization_id, schema_bookmark_id, schema_version_id, created_by_user_id,
                    status, total_rows, created_at, updated_at) VALUES (?, ?, ?, ?, 'QUEUED', 1, now(), now())
                RETURNING id""", Long.class, organization.getId(), bookmark.getId(), version.getId(), owner.getId());
    }

    private void lose(PermissionKey permission) {
        jdbc.update("DELETE FROM role_permission WHERE role_definition_id = ? AND permission_key = ?", role.getId(),
                permission.name());
    }

    @Test
    void aRunInAReviewLeavesTheReviewAndARecordOfItsAnswers() throws Exception {
        remove("/api/prediction-runs/{id}", run.getId()).andExpect(status().isNoContent());

        assertEquals(0, rows("prediction_run WHERE id = ?", run.getId()));
        assertEquals(0, rows("prediction_result_feedback WHERE id = ?", answer));
        assertEquals(0, rows("schema_review_run WHERE schema_review_id = ?", review.getId()));
        assertEquals(1, rows("schema_review WHERE id = ?", review.getId()));
        assertEquals(1, rows("prediction_result_feedback_revision WHERE feedback_id = ? AND change = 'DELETED'"
                + " AND changed_by_user_id = ?", answer, owner.getId()));
        assertEquals(0, rows("prediction_result_feedback_revision WHERE feedback_id = ? AND change <> 'DELETED'", answer));
        mockMvc.perform(signedIn(get("/api/schema-reviews/managed/catalog").param("filter", "empty"), owner.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].id").value(review.getPublicId()))
                .andExpect(jsonPath("$.items[0].runs").value(0));
    }

    @Test
    void aSelectionGoesWhole() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("runIds", List.of(run.getId())));
        mockMvc.perform(signedIn(post("/api/prediction-runs/batch-delete").contentType(MediaType.APPLICATION_JSON)
                .content(body), owner.getId()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.deleted").value(1));
        assertEquals(0, rows("prediction_run WHERE id = ?", run.getId()));
        assertEquals(1, rows("audit_event WHERE action = 'PREDICTION_RUN_BATCH_DELETE' AND organization_id = ?",
                organization.getId()));
    }

    @Test
    void aSelectionWithARunOfAnotherOrganizationDeletesNothing() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("runIds", List.of(run.getId(), Long.MAX_VALUE)));
        mockMvc.perform(signedIn(post("/api/prediction-runs/batch-delete").contentType(MediaType.APPLICATION_JSON)
                .content(body), owner.getId())).andExpect(status().isNotFound());
        assertEquals(1, rows("prediction_run WHERE id = ?", run.getId()));
    }

    @Test
    void runsAreDeletedOnlyByThoseWhoRunPredictions() throws Exception {
        lose(PermissionKey.RUN_PREDICTIONS);
        remove("/api/prediction-runs/{id}", run.getId()).andExpect(status().isForbidden());
    }

    @Test
    void aReviewGoesWithItsAnswersAndLeavesItsRuns() throws Exception {
        remove("/api/schema-reviews/{id}", review.getPublicId()).andExpect(status().isNoContent());

        assertEquals(0, rows("schema_review WHERE id = ?", review.getId()));
        assertEquals(0, rows("prediction_result_feedback WHERE id = ?", answer));
        assertEquals(1, rows("prediction_run WHERE id = ?", run.getId()));
        assertEquals(1, rows("inference_row WHERE prediction_run_id = ? AND answer_changes > 0", run.getId()));
    }

    @Test
    void aReviewIsDeletedOnlyByThoseWhoManageReviews() throws Exception {
        lose(PermissionKey.MANAGE_REVIEWS);
        remove("/api/schema-reviews/{id}", review.getPublicId()).andExpect(status().isForbidden());
        assertEquals(1, rows("schema_review WHERE id = ?", review.getId()));
    }

    @Test
    void aBulkJobGoesOnceItEndedWithItsRowsAndLeavesItsRuns() throws Exception {
        Long job = openJob();
        jdbc.update("""
                INSERT INTO prediction_job_row (job_id, row_index, name, input_data, model_inputs, status, prediction_run_id)
                VALUES (?, 0, 'row', '{"secret":1}', '[]', 'DONE', ?)""", job, run.getId());
        remove("/api/prediction-jobs/{id}", job).andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("still running")));

        jdbc.update("UPDATE prediction_job SET status = 'COMPLETED' WHERE id = ?", job);
        remove("/api/prediction-jobs/{id}", job).andExpect(status().isNoContent());

        assertEquals(0, rows("prediction_job_row WHERE job_id = ?", job));
        assertEquals(1, rows("prediction_run WHERE id = ?", run.getId()));
    }

    @Test
    void aDraftGoesFreely() throws Exception {
        remove("/api/schema-drafts/{id}", draft.getId()).andExpect(status().isNoContent());
        assertEquals(0, rows("schema_draft WHERE id = ?", draft.getId()));
    }

    @Test
    void aBookmarkIsUnpublishedAndGoesWithItsGrantsAndExamplesLeavingItsRuns() throws Exception {
        Long client = jdbc.queryForObject("""
                INSERT INTO api_client (organization_id, name, created_at, updated_at)
                VALUES (?, ?, now(), now()) RETURNING id""", Long.class, organization.getId(), UUID.randomUUID().toString());
        jdbc.update("INSERT INTO api_client_bookmark (api_client_id, schema_bookmark_id) VALUES (?, ?)", client, bookmark.getId());
        jdbc.update("""
                INSERT INTO schema_bookmark_example (schema_bookmark_id, prediction_run_id, public_id, created_at)
                VALUES (?, ?, ?, now())""", bookmark.getId(), run.getId(), UUID.randomUUID().toString());

        remove("/api/schema-bookmarks/{id}", bookmark.getId()).andExpect(status().isNoContent());

        assertEquals(0, rows("schema_bookmark WHERE id = ?", bookmark.getId()));
        assertEquals(0, rows("api_client_bookmark WHERE api_client_id = ?", client));
        assertEquals(0, rows("schema_bookmark_example WHERE prediction_run_id = ?", run.getId()));
        assertNull(jdbc.queryForObject("SELECT schema_bookmark_id FROM prediction_run WHERE id = ?", Long.class, run.getId()));
        assertEquals(1, rows("audit_event WHERE action = 'BOOKMARK_UNPUBLISH' AND target_id = ?", bookmark.getId().toString()));
    }

    @Test
    void aPublicBookmarkGoesOnlyForThoseWhoMayUnpublishIt() throws Exception {
        lose(PermissionKey.PUBLISH_BOOKMARKS);
        remove("/api/schema-bookmarks/{id}", bookmark.getId()).andExpect(status().isForbidden());
        assertEquals(1, rows("schema_bookmark WHERE id = ?", bookmark.getId()));
    }

    @Test
    void aBookmarkWithAnOpenBulkUploadStays() throws Exception {
        openJob();
        remove("/api/schema-bookmarks/{id}", bookmark.getId()).andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("still running")));
    }

    @Test
    void aSnapshotStaysWhileAnythingNeedsItAndSaysWhat() throws Exception {
        remove("/api/schema-versions/{id}", version.getId()).andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("Inferences ran on this snapshot (1)")));
        remove("/api/prediction-runs/{id}", run.getId()).andExpect(status().isNoContent());

        remove("/api/schema-versions/{id}", version.getId()).andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("review")));
        remove("/api/schema-reviews/{id}", review.getPublicId()).andExpect(status().isNoContent());

        remove("/api/schema-versions/{id}", version.getId()).andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("bookmark \"production\"")));
        remove("/api/schema-bookmarks/{id}", bookmark.getId()).andExpect(status().isNoContent());

        remove("/api/schema-versions/{id}", version.getId()).andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("\"wip\"")));
        remove("/api/schema-drafts/{id}", draft.getId()).andExpect(status().isNoContent());

        remove("/api/schema-versions/{id}", version.getId()).andExpect(status().isNoContent());
        assertEquals(0, rows("schema_version WHERE id = ?", version.getId()));
        assertEquals(0, rows("schema_model_binding WHERE schema_version_id = ?", version.getId()));
        assertEquals(0, rows("prediction_result_feedback_revision WHERE schema_version_id = ?", version.getId()));
    }

    @Test
    void anOrganizationIsEmptyWithOnlyAnsweredOrRevokedInvitationsLeft() throws Exception {
        Long empty = jdbc.queryForObject("""
                INSERT INTO organization (slug, name, created_by_user_id, created_at, updated_at)
                VALUES (?, 'Empty', ?, now(), now()) RETURNING id""", Long.class, "empty-" + UUID.randomUUID(), owner.getId());
        Long member = jdbc.queryForObject("""
                INSERT INTO role_definition (organization_id, scope, name, slug, locked, created_at, updated_at)
                VALUES (?, 'ORGANIZATION', 'Member', 'member', TRUE, now(), now()) RETURNING id""", Long.class, empty);
        jdbc.update("""
                INSERT INTO invitation (organization_id, invited_by_user_id, role_definition_id, email, status, expires_at,
                    created_at, updated_at) VALUES (?, ?, ?, 'r@example.test', 'REVOKED', now() + interval '1 day', now(), now())""",
                empty, owner.getId(), member);
        Long pending = jdbc.queryForObject("""
                INSERT INTO invitation (organization_id, invited_by_user_id, role_definition_id, email, status, expires_at,
                    created_at, updated_at) VALUES (?, ?, ?, 'p@example.test', 'PENDING', now() + interval '1 day', now(), now())
                RETURNING id""", Long.class, empty, owner.getId(), member);
        jdbc.update("INSERT INTO role_permission (role_definition_id, permission_key) VALUES (?, 'DELETE_ORGANIZATION')", member);
        jdbc.update("""
                INSERT INTO organization_membership (organization_id, user_id, role_definition_id, status, created_at, updated_at)
                VALUES (?, ?, ?, 'ACTIVE', now(), now())""", empty, owner.getId(), member);

        remove("/api/organizations/{id}", empty).andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("Only empty")));

        jdbc.update("UPDATE invitation SET status = 'REVOKED' WHERE id = ?", pending);
        remove("/api/organizations/{id}", empty).andExpect(status().isNoContent());
        assertEquals(0, rows("organization WHERE id = ?", empty));
        assertEquals(0, rows("invitation WHERE organization_id = ?", empty));
    }
}
