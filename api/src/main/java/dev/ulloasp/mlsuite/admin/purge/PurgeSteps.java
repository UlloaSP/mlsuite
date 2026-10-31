package dev.ulloasp.mlsuite.admin.purge;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

/**
 * The batched statements of the phases that go through a job's snapshots, in plain SQL: entities
 * would load what is about to go. Everything is reached through {@code purge_job_version}, fixed
 * in PREPARE; a run has no organization of its own, and reaches one only through its snapshot.
 */
@Component
@RequiredArgsConstructor
class PurgeSteps {

    private static final String VERSIONS = "(SELECT schema_version_id FROM purge_job_version WHERE job_id = ?)";
    private static final String RUN_RESULTS = """
            prediction_result x JOIN prediction_run r ON r.id = x.prediction_run_id
            WHERE r.schema_version_id IN """ + VERSIONS;
    private static final String CANCEL = """
            UPDATE prediction_job SET status = 'CANCELLED', lease_owner = NULL, lease_expires_at = NULL,
                finished_at = now(), updated_at = now() WHERE status IN ('QUEUED', 'RUNNING')""";

    private final JdbcTemplate jdbc;
    private final NamedParameterJdbcTemplate named;
    private final PurgeBlobSteps blobs;
    private final PurgeMemberSteps members;
    private final PurgeAccountSteps account;

    List<PurgeStep> of(PurgePhase phase, PurgeJob job) {
        return switch (phase) {
            case PREPARE -> List.of(prepare(job));
            case JOBS -> jobs(job);
            case FEEDBACK -> List.of(
                    delete(job, "answerHistory", "prediction_result_feedback_revision", "id", """
                            SELECT id FROM prediction_result_feedback_revision WHERE schema_version_id IN """ + VERSIONS),
                    delete(job, "answers", "prediction_result_feedback", "id",
                            "SELECT f.id FROM prediction_result_feedback f JOIN " + """
                                    prediction_result x ON x.id = f.prediction_result_id
                                    JOIN prediction_run r ON r.id = x.prediction_run_id
                                    WHERE r.schema_version_id IN """ + VERSIONS));
            case REVIEWS -> List.of(
                    delete(job, "reviewSubmissions", "schema_review_run_submission", "id", """
                            SELECT s.id FROM schema_review_run_submission s
                            JOIN schema_review_run rr ON rr.id = s.schema_review_run_id
                            JOIN schema_review sr ON sr.id = rr.schema_review_id
                            WHERE sr.schema_version_id IN """ + VERSIONS),
                    delete(job, "reviewRuns", "schema_review_run", "id", """
                            SELECT rr.id FROM schema_review_run rr JOIN schema_review sr ON sr.id = rr.schema_review_id
                            WHERE sr.schema_version_id IN """ + VERSIONS),
                    delete(job, "reviewAssignees", "schema_review_assignee", "id", """
                            SELECT a.id FROM schema_review_assignee a JOIN schema_review sr ON sr.id = a.review_id
                            WHERE sr.schema_version_id IN """ + VERSIONS),
                    delete(job, "reviews", "schema_review", "id",
                            "SELECT id FROM schema_review WHERE schema_version_id IN " + VERSIONS));
            case RESULTS -> List.of(delete(job, "results", "prediction_result", "id", "SELECT x.id FROM " + RUN_RESULTS));
            case RUNS -> List.of(delete(job, "runs", "prediction_run", "id",
                    "SELECT id FROM prediction_run WHERE schema_version_id IN " + VERSIONS));
            case SCHEMA_CONTENT -> List.of(
                    delete(job, "bindings", "schema_model_binding", "id",
                            "SELECT id FROM schema_model_binding WHERE schema_version_id IN " + VERSIONS),
                    delete(job, "examples", "schema_bookmark_example", "id", """
                            SELECT e.id FROM schema_bookmark_example e JOIN schema_bookmark b ON b.id = e.schema_bookmark_id
                            WHERE b.schema_version_id IN """ + VERSIONS),
                    delete(job, "bookmarks", "schema_bookmark", "id",
                            "SELECT id FROM schema_bookmark WHERE schema_version_id IN " + VERSIONS),
                    drafts(job));
            case VERSIONS -> versions(job);
            case MODELS -> blobs.models(job);
            case PLUGINS -> blobs.plugins(job);
            case MEMBERS -> members.of(job);
            case ACCOUNT -> account.of(job);
            case FINISH -> List.of();
        };
    }

    /** Fixes the snapshots the job destroys; a retry adds those that appeared since. */
    private PurgeStep prepare(PurgeJob job) {
        Map<String, Long> parameters = Map.of("job", job.id(), "organization", job.organizationId(),
                "target", job.targetId());
        return new PurgeStep("preparedVersions", limit -> named.update(
                "INSERT INTO purge_job_version (job_id, schema_version_id) SELECT :job, chosen.id FROM ("
                        + job.scope().versions() + ") chosen ON CONFLICT DO NOTHING", parameters));
    }

    /** Stops every bulk upload first: a worker in the middle of a chunk finishes it, and stores no other. */
    private List<PurgeStep> jobs(PurgeJob job) {
        List<PurgeStep> steps = new ArrayList<>();
        steps.add(new PurgeStep("predictionJobsCancelled",
                limit -> jdbc.update(CANCEL + " AND schema_version_id IN " + VERSIONS, job.id())));
        if (job.scope() == PurgeScope.USER) {
            steps.add(new PurgeStep("predictionJobsCancelled",
                    limit -> jdbc.update(CANCEL + " AND created_by_user_id = ?", job.targetId())));
        }
        steps.add(new PurgeStep("predictionJobRows", limit -> jdbc.update("""
                DELETE FROM prediction_job_row WHERE (job_id, row_index) IN (
                    SELECT r.job_id, r.row_index FROM prediction_job_row r JOIN prediction_job j ON j.id = r.job_id
                    WHERE j.schema_version_id IN """ + VERSIONS + " LIMIT ?)", job.id(), limit)));
        steps.add(delete(job, "predictionJobs", "prediction_job", "id",
                "SELECT id FROM prediction_job WHERE schema_version_id IN " + VERSIONS));
        return steps;
    }

    private PurgeStep drafts(PurgeJob job) {
        return new PurgeStep("drafts", limit -> jdbc.update("""
                DELETE FROM schema_draft WHERE id IN (SELECT id FROM schema_draft
                    WHERE base_version_id IN """ + VERSIONS + " OR published_version_id IN " + VERSIONS + " LIMIT ?)",
                job.id(), job.id(), limit));
    }

    private List<PurgeStep> versions(PurgeJob job) {
        List<PurgeStep> steps = new ArrayList<>();
        steps.add(delete(job, "schemaVersions", "schema_version", "id",
                "SELECT id FROM schema_version WHERE id IN " + VERSIONS));
        if (job.scope() == PurgeScope.SCHEMA) {
            steps.add(new PurgeStep("schemas", limit -> jdbc.update(
                    "DELETE FROM schema_artifact WHERE id = ?", job.targetId())));
        } else if (job.scope().ownsOrganization()) {
            steps.add(new PurgeStep("schemas", limit -> jdbc.update("""
                    DELETE FROM schema_artifact WHERE id IN (
                        SELECT id FROM schema_artifact WHERE organization_id = ? LIMIT ?)""",
                    job.organizationId(), limit)));
        }
        return steps;
    }

    private PurgeStep delete(PurgeJob job, String counter, String table, String key, String chosen) {
        String sql = "DELETE FROM " + table + " WHERE " + key + " IN (" + chosen + " LIMIT ?)";
        return new PurgeStep(counter, limit -> jdbc.update(sql, job.id(), limit));
    }
}
