package dev.ulloasp.mlsuite.model.application.runtime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import dev.ulloasp.mlsuite.model.adapter.out.analyzer.RuntimeBuilderClient;
import dev.ulloasp.mlsuite.model.domain.exception.AnalyzerServiceException;
import dev.ulloasp.mlsuite.model.domain.model.RuntimeEnvironment;
import dev.ulloasp.mlsuite.schema.PublicPredictionFixture;

/**
 * An uploaded model whose bundle carries a lock is prepared on the server: the builder installs
 * its environment and the runtime loads it there before anyone runs it. What the bundle causes
 * fails it at once with the reason; an outage is tried again later, up to the attempts allowed;
 * a failed model is prepared again on request; a model that is not ready never reaches the runtime.
 */
@TestPropertySource(properties = { "mlsuite.model-preparation.poll-ms=3600000",
        "mlsuite.model-preparation.max-attempts=2" })
class ModelPreparationTest extends PublicPredictionFixture {

    private static final String KEY = "e".repeat(64);

    @Autowired ModelPreparationWorker worker;
    @Autowired ModelPreparationLedger ledger;
    @Autowired JdbcTemplate jdbc;
    @MockitoBean RuntimeBuilderClient builder;

    @BeforeEach
    void theForestNeedsAnEnvironmentOfItsOwn() {
        authorizeOwner();
        jdbc.update("""
                INSERT INTO runtime_environment (environment_key, environment_id, writer_version, python_version,
                    packages, lock_toml, created_at)
                VALUES (?, ?, '0.3.0', '3.14.7', '[{"name": "scikit-learn", "version": "1.9.1"}]'::jsonb,
                    'lock-version = "1.0"', now())
                ON CONFLICT DO NOTHING""", KEY, "i".repeat(64));
        jdbc.update("UPDATE model SET environment_key = ?, runtime_state = 'PREPARING', feature_importances = NULL"
                + " WHERE id = ?", KEY, forestModel.getId());
    }

    @Test
    void aModelWhoseEnvironmentIsBuiltAndWhichLoadsThereIsReady() {
        when(analyzer.post(eq("/verify"), any())).thenReturn(Map.of(
                "featureImportances", List.of(Map.of("feature", "age", "importance", 0.7)), "samples", 3));

        worker.work();

        verify(builder).build(any(RuntimeEnvironment.class));
        assertEquals("READY", state());
        assertEquals("age", jdbc.queryForObject(
                "SELECT feature_importances -> 0 ->> 'feature' FROM model WHERE id = ?", String.class, forestModel.getId()));
    }

    @Test
    void anEnvironmentTheAllowlistRefusesFailsTheModelAtOnceWithTheReason() {
        doThrow(new AnalyzerServiceException(422,
                "The environment needs packages MLsuite does not install: numpy==9.9.9"))
                .when(builder).build(any());

        worker.work();

        assertEquals("FAILED", state());
        assertEquals("The environment needs packages MLsuite does not install: numpy==9.9.9", error());
        verify(analyzer, never()).post(eq("/verify"), any());
    }

    @Test
    void aModelThatCannotLoadInItsEnvironmentFails() {
        when(analyzer.post(eq("/verify"), any())).thenThrow(new AnalyzerServiceException(422,
                "The model cannot predict its own samples here: Missing features"));

        worker.work();

        assertEquals("FAILED", state());
        assertTrue(error().startsWith("The model cannot predict its own samples here"));
    }

    @Test
    void anOutageIsTriedAgainLaterAndFailsTheModelAfterTheAttemptsAllowed() {
        doThrow(new AnalyzerServiceException(0, "The environment builder is unreachable")).when(builder).build(any());

        worker.work();

        assertEquals("PREPARING", state());
        assertEquals(1, jdbc.queryForObject("SELECT runtime_attempts FROM model WHERE id = ?", Integer.class,
                forestModel.getId()));
        assertTrue(jdbc.queryForObject("SELECT runtime_lease_expires_at > now() FROM model WHERE id = ?",
                Boolean.class, forestModel.getId()), "not claimed again before its delay");
        jdbc.update("UPDATE model SET runtime_lease_expires_at = now() - interval '1 second' WHERE id = ?",
                forestModel.getId());

        worker.work();

        assertEquals("FAILED", state());
        assertEquals("The environment builder is unreachable", error());
    }

    @Test
    void aFailedModelIsPreparedAgainOnRequestAndOnlyAFailedOne() throws Exception {
        jdbc.update("UPDATE model SET runtime_state = 'FAILED', runtime_error = 'boom', runtime_attempts = 2"
                + " WHERE id = ?", forestModel.getId());

        mockMvc.perform(signedIn(post("/api/models/{id}/environment/retry", forestModel.getId()), owner.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.runtimeState").value("PREPARING"))
                .andExpect(jsonPath("$.runtimeError").doesNotExist());
        assertNull(error());
        mockMvc.perform(signedIn(post("/api/models/{id}/environment/retry", forestModel.getId()), owner.getId()))
                .andExpect(status().isConflict());
    }

    @Test
    void aModelBeingPreparedIsAnswered503AndAFailedOne409WithoutReachingTheRuntime() throws Exception {
        String request = objectMapper.writeValueAsString(Map.of("schemaVersionId", version.getId(),
                "modelId", forestModel.getId(), "modelInput", Map.of("age", 52)));

        mockMvc.perform(signedIn(post("/api/schema-bookmarks/{id}/predictions", bookmark.getId()), owner.getId())
                .contentType(MediaType.APPLICATION_JSON).content(request))
                .andExpect(status().isServiceUnavailable())
                .andExpect(header().exists("Retry-After"));
        jdbc.update("UPDATE model SET runtime_state = 'FAILED' WHERE id = ?", forestModel.getId());
        mockMvc.perform(signedIn(post("/api/schema-bookmarks/{id}/predictions", bookmark.getId()), owner.getId())
                .contentType(MediaType.APPLICATION_JSON).content(request))
                .andExpect(status().isConflict());

        verify(analyzer, never()).post(eq("/predict"), any());
    }

    @Test
    void aResultKeepsTheEnvironmentThatComputedIt() throws Exception {
        jdbc.update("UPDATE model SET runtime_state = 'READY' WHERE id = ?", forestModel.getId());
        when(analyzer.post(eq("/predict"), any())).thenReturn(Map.of("reports", List.of(CLASSIFIER)));
        String run = objectMapper.writeValueAsString(Map.of("name", "with-environment",
                "inputData", Map.of("age", 52), "schemaVersionId", version.getId(),
                "results", List.of(sealed(forestModel.getId()), sealed(netModel.getId()))));

        mockMvc.perform(signedIn(post("/api/schema-bookmarks/{id}/runs", bookmark.getId()), owner.getId())
                .contentType(MediaType.APPLICATION_JSON).content(run))
                .andExpect(status().isCreated());

        assertEquals(List.of(KEY, RuntimeEnvironment.LEGACY), jdbc.queryForList("""
                SELECT r.environment_key FROM prediction_result r JOIN prediction_run p ON p.id = r.prediction_run_id
                WHERE p.name = 'with-environment' ORDER BY r.model_id = ? DESC""", String.class, forestModel.getId()));
    }

    @Test
    void theMemberWhoUploadedAModelIsToldOnceItIsReady() {
        when(analyzer.post(eq("/verify"), any())).thenReturn(Map.of("samples", 3));

        worker.work();
        worker.work();

        assertEquals(List.of("MODEL_READY"), told());
        assertEquals(forestModel.getName(), label("modelName"));
        assertEquals(organization.getId(), jdbc.queryForObject("SELECT organization_id FROM notification"
                + " WHERE recipient_user_id = ? AND target_id = ?", Long.class, owner.getId(), forestModel.getId().toString()));
    }

    @Test
    void aModelThatFailsAtOnceTellsTheReason() {
        doThrow(new AnalyzerServiceException(422, "numpy==9.9.9 is refused")).when(builder).build(any());

        worker.work();

        assertEquals(List.of("MODEL_FAILED"), told());
        assertEquals("numpy==9.9.9 is refused", label("reason"));
    }

    @Test
    void anAttemptThatWillBeRetriedTellsNobodyAndTheLastOneToldOnce() {
        doThrow(new AnalyzerServiceException(0, "The environment builder is unreachable")).when(builder).build(any());

        worker.work();
        assertEquals(List.of(), told());

        jdbc.update("UPDATE model SET runtime_lease_expires_at = now() - interval '1 second' WHERE id = ?",
                forestModel.getId());
        worker.work();
        assertEquals(List.of("MODEL_FAILED"), told());
        assertEquals("The environment builder is unreachable", label("reason"));
    }

    @Test
    void aWorkerThatLostTheModelTellsNobody() {
        jdbc.update("UPDATE model SET runtime_lease_owner = 'the-next-worker' WHERE id = ?", forestModel.getId());

        ledger.ready(forestModel.getId(), "a-worker-that-stalled", null);
        ledger.fail(forestModel.getId(), "a-worker-that-stalled", "too late");

        assertEquals(List.of(), told());
        assertEquals("PREPARING", state());
    }

    private Map<String, String> sealed(Long modelId) throws Exception {
        String request = objectMapper.writeValueAsString(Map.of("schemaVersionId", version.getId(),
                "modelId", modelId, "modelInput", Map.of("age", 52)));
        String prediction = mockMvc.perform(signedIn(post("/api/schema-bookmarks/{id}/predictions",
                bookmark.getId()), owner.getId()).contentType(MediaType.APPLICATION_JSON).content(request))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return Map.of("attestation", objectMapper.readTree(prediction).get("attestation").asText());
    }

    /** What the forest's uploader was told about it, oldest first. */
    private List<String> told() {
        return jdbc.queryForList("SELECT kind FROM notification WHERE recipient_user_id = ? AND target_type = 'MODEL'"
                + " AND target_id = ? ORDER BY id", String.class, owner.getId(), forestModel.getId().toString());
    }

    private String label(String label) {
        return jdbc.queryForObject("SELECT payload ->> ? FROM notification WHERE recipient_user_id = ?"
                + " AND target_id = ? ORDER BY id DESC LIMIT 1", String.class, label, owner.getId(),
                forestModel.getId().toString());
    }

    private String state() {
        return jdbc.queryForObject("SELECT runtime_state FROM model WHERE id = ?", String.class, forestModel.getId());
    }

    private String error() {
        return jdbc.queryForObject("SELECT runtime_error FROM model WHERE id = ?", String.class, forestModel.getId());
    }
}
