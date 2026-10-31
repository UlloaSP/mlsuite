package dev.ulloasp.mlsuite.schema.job;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.ResultActions;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.schema.PublicPredictionFixture;

/**
 * A bulk upload runs on the server as a job: started with its rows, run by a worker in chunks
 * through the workspace share, every row stored as a run the server performed or failed with its
 * reason. A job outlives its tab and its worker (the lease), can be cancelled, its failed rows run
 * again, and starting one takes the right to run predictions within bounded sizes.
 */
@TestPropertySource(properties = { "mlsuite.prediction-jobs.poll-ms=3600000", "mlsuite.prediction-jobs.max-rows=5",
        "mlsuite.prediction-jobs.max-open-per-member=2", "mlsuite.prediction-jobs.chunk-rows=2" })
class PredictionJobHttpTest extends PublicPredictionFixture {

    @Autowired PredictionJobWorker worker;
    @Autowired PredictionJobLedger ledger;
    @Autowired PredictionJobOutcomes outcomes;
    @Autowired JdbcTemplate jdbc;
    private RoleDefinition role;

    @BeforeEach
    void theRuntimePredictsBatches() {
        role = authorizeOwner();
        when(analyzer.post(eq("/predict/batch"), any())).thenAnswer(call -> {
            List<?> rows = objectMapper.readValue(data(call.getArgument(1)), List.class);
            return Map.of("rows", rows.stream().map(row -> ((Map<?, ?>) row).isEmpty()
                    ? Map.of("error", Map.of("status", 400, "detail", "Missing features: age."))
                    : Map.of("reports", List.of(CLASSIFIER))).toList());
        });
    }

    @Test
    void aJobRunsOnTheServerAndStoresEveryRowAsARunItPerformed() throws Exception {
        long runs = count("PredictionRun");
        JsonNode job = start(rows(3)).andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("QUEUED"))
                .andExpect(jsonPath("$.pendingRows").value(3)).andReturn().getResponse().getContentAsString()
                .transform(this::json);

        worker.work();

        read(job).andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.doneRows").value(3)).andExpect(jsonPath("$.failedRows").value(0));
        assertEquals(runs + 3, count("PredictionRun"));
        assertEquals("high", jdbc.queryForObject("SELECT r.output_json -> 'reports' -> 1 ->> 'prediction'"
                + " FROM prediction_result r JOIN prediction_run p ON p.id = r.prediction_run_id"
                + " WHERE p.name = 'job-row-0' AND r.model_id = ?", String.class, forestModel.getId()));
        // Two chunks of two rows at most, one runtime call per model each.
        verify(analyzer, times(4)).post(eq("/predict/batch"), any());
    }

    @Test
    void aRowAModelRefusesFailsWithItsReasonAndRunsAgainOnRetry() throws Exception {
        List<Map<String, Object>> rows = rows(2);
        rows.set(1, row("job-row-1", Map.of()));
        JsonNode job = json(start(rows).andReturn().getResponse().getContentAsString());
        worker.work();

        read(job).andExpect(jsonPath("$.doneRows").value(1)).andExpect(jsonPath("$.failedRows").value(1));
        mockMvc.perform(signedIn(get("/api/prediction-jobs/{id}/failures", job.get("id").asLong()), owner.getId()))
                .andExpect(jsonPath("$[0].name").value("job-row-1"))
                .andExpect(jsonPath("$[0].error").value("risk-forest: Missing features: age."));

        when(analyzer.post(eq("/predict/batch"), any())).thenReturn(Map.of("rows", List.of(Map.of("reports",
                List.of(CLASSIFIER)))));
        mockMvc.perform(signedIn(post("/api/prediction-jobs/{id}/retry", job.get("id").asLong()), owner.getId()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("QUEUED"))
                .andExpect(jsonPath("$.failedRows").value(0)).andExpect(jsonPath("$.pendingRows").value(1));
        worker.work();

        read(job).andExpect(jsonPath("$.doneRows").value(2)).andExpect(jsonPath("$.failedRows").value(0));
    }

    @Test
    void aCancelledJobRunsNoFurtherRows() throws Exception {
        long runs = count("PredictionRun");
        JsonNode job = json(start(rows(3)).andReturn().getResponse().getContentAsString());

        mockMvc.perform(signedIn(post("/api/prediction-jobs/{id}/cancel", job.get("id").asLong()), owner.getId()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CANCELLED"));
        worker.work();

        assertEquals(runs, count("PredictionRun"));
        mockMvc.perform(signedIn(post("/api/prediction-jobs/{id}/cancel", job.get("id").asLong()), owner.getId()))
                .andExpect(status().isConflict());
    }

    @Test
    void aJobWhoseWorkerDiedIsClaimedAgainOnceItsLeaseEnds() throws Exception {
        JsonNode job = json(start(rows(1)).andReturn().getResponse().getContentAsString());
        long id = job.get("id").asLong();
        assertEquals(id, ledger.claim("a-worker-that-dies", 120).orElseThrow().id());

        worker.work();
        read(job).andExpect(jsonPath("$.status").value("RUNNING")).andExpect(jsonPath("$.doneRows").value(0));

        jdbc.update("UPDATE prediction_job SET lease_expires_at = now() - interval '1 second' WHERE id = ?", id);
        worker.work();
        read(job).andExpect(jsonPath("$.status").value("COMPLETED")).andExpect(jsonPath("$.doneRows").value(1));
    }

    @Test
    void aMemberWhoMayNotRunPredictionsStartsNoJobButMayFollowThem() throws Exception {
        JsonNode job = json(start(rows(1)).andReturn().getResponse().getContentAsString());
        grant(PermissionKey.VIEW_MODELS);

        start(rows(1)).andExpect(status().isForbidden());
        mockMvc.perform(signedIn(get("/api/schema-bookmarks/{id}/prediction-jobs", bookmark.getId()), owner.getId()))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(job.get("id").asLong()));
        mockMvc.perform(signedIn(post("/api/prediction-jobs/{id}/cancel", job.get("id").asLong()), owner.getId()))
                .andExpect(status().isForbidden());
        // The rows still to run fail once their member lost the right to run predictions.
        worker.work();
        read(job).andExpect(jsonPath("$.status").value("COMPLETED")).andExpect(jsonPath("$.failedRows").value(1));
        mockMvc.perform(signedIn(get("/api/prediction-jobs/{id}", Long.MAX_VALUE), owner.getId()))
                .andExpect(status().isNotFound());
    }

    @Test
    void aFinishedJobTellsItsMemberOnceWithItsCounts() throws Exception {
        long job = json(start(rows(3)).andReturn().getResponse().getContentAsString()).get("id").asLong();

        worker.work();
        worker.work();

        assertEquals(List.of("PREDICTION_JOB_COMPLETED"), told(job));
        assertEquals(bookmark.getName(), payload(job, "bookmarkName"));
        assertEquals(bookmark.getId().toString(), payload(job, "bookmarkId"));
        assertEquals("3", payload(job, "doneRows"));
        assertEquals("0", payload(job, "failedRows"));
        assertEquals(organization.getId(), jdbc.queryForObject(
                "SELECT organization_id FROM notification WHERE target_type = 'PREDICTION_JOB' AND target_id = ?",
                Long.class, String.valueOf(job)));
    }

    @Test
    void failedRowsAreToldAndARetryThatFinishesReportsItsNewEnd() throws Exception {
        List<Map<String, Object>> rows = rows(2);
        rows.set(1, row("job-row-1", Map.of()));
        long job = json(start(rows).andReturn().getResponse().getContentAsString()).get("id").asLong();
        worker.work();

        assertEquals(List.of("PREDICTION_JOB_COMPLETED_WITH_FAILURES"), told(job));
        assertEquals("1", payload(job, "failedRows"));

        when(analyzer.post(eq("/predict/batch"), any())).thenReturn(Map.of("rows", List.of(Map.of("reports",
                List.of(CLASSIFIER)))));
        mockMvc.perform(signedIn(post("/api/prediction-jobs/{id}/retry", job), owner.getId()))
                .andExpect(status().isOk());
        worker.work();

        assertEquals(List.of("PREDICTION_JOB_COMPLETED_WITH_FAILURES", "PREDICTION_JOB_COMPLETED"), told(job));
    }

    @Test
    void aMemberWhoCancelsTheirOwnJobIsNotToldAndOneWhoseJobWasCancelledIs() throws Exception {
        long own = json(start(rows(1)).andReturn().getResponse().getContentAsString()).get("id").asLong();
        mockMvc.perform(signedIn(post("/api/prediction-jobs/{id}/cancel", own), owner.getId()))
                .andExpect(status().isOk());
        assertEquals(List.of(), told(own));

        long theirs = json(start(rows(1)).andReturn().getResponse().getContentAsString()).get("id").asLong();
        Long starter = jdbc.queryForObject("""
                INSERT INTO app_user (username, email, full_name, password_hash, enabled, system_role, created_at, updated_at)
                VALUES (?, ?, 'Starter', 'unused', TRUE, 'USER', now(), now()) RETURNING id""", Long.class,
                "starter" + theirs, "starter" + theirs + "@example.test");
        jdbc.update("UPDATE prediction_job SET created_by_user_id = ? WHERE id = ?", starter, theirs);

        mockMvc.perform(signedIn(post("/api/prediction-jobs/{id}/cancel", theirs), owner.getId()))
                .andExpect(status().isOk());
        worker.work();

        assertEquals(List.of("PREDICTION_JOB_CANCELLED"), told(theirs));
        assertEquals(owner.getFullName(), payload(theirs, "actorName"));
        assertEquals(starter, jdbc.queryForObject(
                "SELECT recipient_user_id FROM notification WHERE target_type = 'PREDICTION_JOB' AND target_id = ?",
                Long.class, String.valueOf(theirs)));
    }

    @Test
    void aMemberWhoLostTheRightToRunPredictionsIsToldTheSystemStoppedTheirJob() throws Exception {
        long job = json(start(rows(2)).andReturn().getResponse().getContentAsString()).get("id").asLong();
        grant(PermissionKey.VIEW_MODELS);

        worker.work();

        assertEquals(List.of("PREDICTION_JOB_STOPPED"), told(job));
        assertEquals("The member who started the upload may no longer run predictions", payload(job, "reason"));
        assertEquals("2", payload(job, "failedRows"));
    }

    @Test
    void aWorkerThatLostItsLeaseToldNobodyAndFailsNoRows() throws Exception {
        long job = json(start(rows(1)).andReturn().getResponse().getContentAsString()).get("id").asLong();
        ledger.claim("a-worker-that-stalled", 120).orElseThrow();
        jdbc.update("UPDATE prediction_job SET lease_expires_at = now() - interval '1 second' WHERE id = ?", job);
        ledger.claim("the-next-worker", 120).orElseThrow();

        outcomes.complete(job, "a-worker-that-stalled");
        outcomes.stop(job, "a-worker-that-stalled", "too late");

        assertEquals(List.of(), told(job));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM prediction_job_row WHERE job_id = ? AND status = 'FAILED'",
                Integer.class, job));
        outcomes.complete(job, "the-next-worker");
        outcomes.complete(job, "the-next-worker");
        assertEquals(List.of("PREDICTION_JOB_COMPLETED"), told(job));
    }

    @Test
    void aJobHoldsBoundedRowsForBoundModelsAndAMemberBoundedOpenJobs() throws Exception {
        start(rows(6)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("A bulk upload holds at most 5 rows; split the file"));
        start(List.of(row("twice", Map.of("age", 1)), row("twice", Map.of("age", 2)))).andExpect(status().isBadRequest());
        start(List.of(Map.of("name", "stranger", "inputData", Map.of("Age", 1),
                "models", List.of(Map.of("modelId", Long.MAX_VALUE, "modelInput", Map.of())))))
                .andExpect(status().isBadRequest());

        start(rows(1)).andExpect(status().isCreated());
        start(rows(1, 10)).andExpect(status().isCreated());
        start(rows(1, 20)).andExpect(status().isTooManyRequests());
    }

    /** The kinds the job was reported with, oldest first. */
    private List<String> told(long job) {
        return jdbc.queryForList("SELECT kind FROM notification WHERE target_type = 'PREDICTION_JOB' AND target_id = ?"
                + " ORDER BY id", String.class, String.valueOf(job));
    }

    private String payload(long job, String label) {
        return jdbc.queryForObject("SELECT payload ->> ? FROM notification WHERE target_type = 'PREDICTION_JOB'"
                + " AND target_id = ? ORDER BY id DESC LIMIT 1", String.class, label, String.valueOf(job));
    }

    private ResultActions start(List<Map<String, Object>> rows) throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("schemaVersionId", version.getId(), "rows", rows));
        return mockMvc.perform(signedIn(post("/api/schema-bookmarks/{id}/prediction-jobs", bookmark.getId())
                .contentType(MediaType.APPLICATION_JSON).content(body), owner.getId()));
    }

    private ResultActions read(JsonNode job) throws Exception {
        return mockMvc.perform(signedIn(get("/api/prediction-jobs/{id}", job.get("id").asLong()), owner.getId()))
                .andExpect(status().isOk());
    }

    private List<Map<String, Object>> rows(int count) {
        return rows(count, 0);
    }

    private List<Map<String, Object>> rows(int count, int from) {
        return new java.util.ArrayList<>(IntStream.range(from, from + count)
                .mapToObj(index -> row("job-row-" + index, Map.of("age", 40 + index))).toList());
    }

    private Map<String, Object> row(String name, Map<String, Object> forestInput) {
        return Map.of("name", name, "inputData", Map.of("Age", 52), "models", List.of(
                Map.of("modelId", forestModel.getId(), "modelInput", forestInput),
                Map.of("modelId", netModel.getId(), "modelInput", Map.of("1", 52))));
    }

    private void grant(PermissionKey... permissions) {
        inTransaction(() -> entityManager.find(RoleDefinition.class, role.getId())
                .setPermissions(EnumSet.copyOf(List.of(permissions))));
    }

    private JsonNode json(String body) {
        try {
            return objectMapper.readTree(body.getBytes(StandardCharsets.UTF_8));
        } catch (java.io.IOException ex) {
            throw new IllegalStateException(ex);
        }
    }
}
