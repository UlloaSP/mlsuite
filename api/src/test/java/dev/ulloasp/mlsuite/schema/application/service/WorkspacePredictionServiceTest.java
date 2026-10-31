package dev.ulloasp.mlsuite.schema.application.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.mock;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.function.Executable;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.ObjectMapper;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.model.adapter.out.analyzer.ModelRuntimeClient;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.model.application.service.WorkspaceRuntimeSlots;
import dev.ulloasp.mlsuite.model.domain.exception.AnalyzerServiceException;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaModelBindingRepository;
import dev.ulloasp.mlsuite.schema.application.dto.WorkspacePredictionDto;
import dev.ulloasp.mlsuite.schema.application.dto.WorkspacePredictionRequest;
import dev.ulloasp.mlsuite.schema.domain.model.BoundModel;
import dev.ulloasp.mlsuite.schema.domain.exception.RuntimeBusyException;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultStatus;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.model.application.runtime.RunnableModel;
import dev.ulloasp.mlsuite.model.domain.model.ModelRuntimeState;
import dev.ulloasp.mlsuite.storage.ModelArtifactReference;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

/** A member's prediction: performed by the server for one bound model, shaped as runs store it, and sealed. */
@ExtendWith(MockitoExtension.class)
class WorkspacePredictionServiceTest {

    /** A share that turns away at once a run finding it in use. */
    private static final RuntimeQueue NO_WAITING = new RuntimeQueue(0, 16, 0);

    private static final Instant NOW = Instant.parse("2026-10-27T10:00:00Z");
    private static final Map<String, Object> INPUT = Map.of("age", 52);
    private static final Map<String, String> PREDICT = Map.of("data", "{\"age\":52}");
    private static final Map<String, String> EXPLAIN = Map.of("data", "{\"age\":52}", "traces", "[]");
    private static final RunnableModel FOREST = new RunnableModel(new ModelArtifactReference(11L, "forest.mlbundle",
            "bucket", "key", null, 3L, "abc123"),
            "legacy", ModelRuntimeState.READY);
    private static final Map<String, Object> CLASSIFIER = Map.of("kind", "classifier", "output", 0,
            "mapping", List.of("low", "high"), "probabilities", List.of(List.of(0.2, 0.8)), "prediction", "high");

    @Mock private WorkspaceAuthorizationService authorization;
    @Mock private SchemaBookmarkRepository bookmarks;
    @Mock private SchemaModelBindingRepository bindings;
    @Mock private ModelRepository models;
    @Mock private ModelRuntimeClient runtime;

    private final PredictionAttestations attestations = new PredictionAttestations(new ObjectMapper(),
            "unit-test-prediction-attestation-secret-0123", Clock.fixed(NOW, ZoneOffset.UTC));
    private WorkspacePredictionService service;
    private SchemaVersion version;

    @BeforeEach
    void setUp() {
        service = service(new WorkspaceRuntimeSlots(1, NO_WAITING));
        Organization organization = new Organization();
        organization.setId(41L);
        lenient().when(authorization.requireCurrent(7L, PermissionKey.RUN_PREDICTIONS)).thenReturn(organization);
        lenient().when(models.findRunnableModel(11L, 41L)).thenReturn(Optional.of(FOREST));
        useReports(List.of(Map.of("id", "risk", "kind", "classifier", "label", "Risk", "mappedTo", Map.of("forest", 0))));
    }

    @Test
    void performsTheRunAndSealsItInTheShapeRunsStore() {
        when(runtime.run("/predict", FOREST, PREDICT)).thenReturn(Map.of("reports", List.of(CLASSIFIER)));

        WorkspacePredictionDto result = service.predict(7L, 70L, request(11L));

        assertEquals(PredictionResultStatus.SUCCESS, result.status());
        assertEquals(INPUT, result.modelInput());
        List<?> reports = (List<?>) result.output().get("reports");
        Map<?, ?> stored = (Map<?, ?>) reports.get(1);
        assertEquals("risk", stored.get("id"));
        assertEquals("0", stored.get("mappedTo"));
        assertEquals(List.of(0.2, 0.8), stored.get("probabilities"));
        assertEquals(List.of("low", "high"), stored.get("labels"));
        assertEquals(Map.of("modelId", "11", "backendFieldValues", INPUT), result.output().get("meta"));
        AttestedPrediction sealed = attestations.open(result.attestation());
        assertEquals(41L, sealed.organizationId());
        assertEquals(9L, sealed.schemaVersionId());
        assertEquals(11L, sealed.modelId());
        assertEquals(result.output(), sealed.output());
        assertEquals(NOW.toEpochMilli(), sealed.issuedAt());
        verify(runtime, never()).run(eq("/explain"), any(), anyMap());
    }

    @Test
    void aRecordTheRuntimeRefusesIsASealedFailure() {
        when(runtime.run("/predict", FOREST, PREDICT)).thenThrow(new AnalyzerServiceException(422, "age must be positive"));

        WorkspacePredictionDto result = service.predict(7L, 70L, request(11L));

        assertEquals(PredictionResultStatus.FAILED, result.status());
        assertEquals("age must be positive", result.errorMessage());
        assertEquals(Map.of("status", 422, "message", "age must be positive"), result.errorJson());
        assertEquals(Map.of("meta", Map.of("modelId", "11", "backendFieldValues", INPUT)), result.output());
        assertEquals(PredictionResultStatus.FAILED, attestations.open(result.attestation()).status());
    }

    @Test
    void anUnreachableRuntimeIsASealedFailure() {
        when(runtime.run("/predict", FOREST, PREDICT)).thenThrow(AnalyzerServiceException.fromNetwork());

        WorkspacePredictionDto result = service.predict(7L, 70L, request(11L));

        assertEquals(PredictionResultStatus.FAILED, result.status());
        assertEquals(Map.of("status", 502, "message", "Analyzer service unreachable"), result.errorJson());
    }

    /** The explanation is asked for in the prediction's slot: one slot serves the whole run. */
    @Test
    void aPluginReportIsTheRuntimesExplanationOfTheSameRun() {
        useReports(List.of(Map.of("id", "path", "kind", "Crystal Tree", "mappedTo", Map.of("forest", "tree"))));
        when(runtime.run("/predict", FOREST, PREDICT)).thenReturn(Map.of("reports", List.of(CLASSIFIER)));
        when(runtime.run("/explain", FOREST, EXPLAIN)).thenReturn(
                Map.of("reports", List.of(Map.of("kind", "Crystal Tree", "explanation", "age <= 60"))));

        WorkspacePredictionDto result = service.predict(7L, 70L, request(11L));

        List<?> reports = (List<?>) result.output().get("reports");
        assertEquals(Map.of("kind", "Crystal Tree", "explanation", "age <= 60", "id", "path", "mappedTo", "tree"),
                reports.get(2));
    }

    @Test
    void aModelTheRuntimeCannotExplainKeepsItsPrediction() {
        useReports(List.of(Map.of("id", "path", "kind", "Crystal Tree", "mappedTo", Map.of("forest", "tree"))));
        when(runtime.run("/predict", FOREST, PREDICT)).thenReturn(Map.of("reports", List.of(CLASSIFIER)));
        when(runtime.run("/explain", FOREST, EXPLAIN))
                .thenThrow(new AnalyzerServiceException(400, "crystal-tree requires a DecisionTree estimator"));

        WorkspacePredictionDto result = service.predict(7L, 70L, request(11L));

        assertEquals(PredictionResultStatus.SUCCESS, result.status());
        assertEquals(List.of(CLASSIFIER), result.output().get("reports"));
        assertNull(result.errorMessage());
    }

    @Test
    void refusesAModelTheSnapshotDoesNotBind() {
        assertRefused(400, () -> service.predict(7L, 70L, request(12L)));
    }

    @Test
    void refusesABoundModelOutsideTheOrganization() {
        when(models.findRunnableModel(11L, 41L)).thenReturn(Optional.empty());

        assertRefused(400, () -> service.predict(7L, 70L, request(11L)));
    }

    @Test
    void refusesASnapshotTheBookmarkNoLongerTargets() {
        assertRefused(409, () -> service.predict(7L, 70L, new WorkspacePredictionRequest(8L, 11L, INPUT)));
    }

    @Test
    void refusesABookmarkOutsideTheOrganization() {
        assertRefused(404, () -> service.predict(7L, 71L, request(11L)));
    }

    @Test
    void refusesAMemberWhoMayNotRunPredictions() {
        when(authorization.requireCurrent(7L, PermissionKey.RUN_PREDICTIONS))
                .thenThrow(new OrganizationAccessDeniedException(41L));

        assertThrows(OrganizationAccessDeniedException.class, () -> service.predict(7L, 70L, request(11L)));
        verify(runtime, never()).run(anyString(), any(), anyMap());
    }

    @Test
    void aRunTheShareCannotQueueIsTurnedAwayWithRetryAfterBeforeAnyDatabaseWork() {
        service = service(new WorkspaceRuntimeSlots(0, NO_WAITING));

        RuntimeBusyException busy = assertThrows(RuntimeBusyException.class, () -> service.predict(7L, 70L, request(11L)));

        assertEquals(503, busy.getStatusCode().value());
        assertEquals("2", busy.getHeaders().getFirst(HttpHeaders.RETRY_AFTER));
        verifyNoInteractions(authorization, bookmarks, bindings, models, runtime);
    }

    @Test
    void manyRecordsRunInOneCallAndEachPredictedRecordIsExplained() {
        useReports(List.of(Map.of("id", "risk", "kind", "classifier", "label", "Risk", "mappedTo", Map.of("forest", 0)),
                Map.of("id", "why", "kind", "Crystal Tree", "label", "Why", "mappedTo", Map.of("forest", "why"))));
        when(runtime.run("/predict/batch", FOREST, Map.of("data", "[{\"age\":52},{\"age\":61}]")))
                .thenReturn(Map.of("rows", List.of(Map.of("reports", List.of(CLASSIFIER)),
                        Map.of("error", Map.of("status", 400, "detail", "Missing features")))));
        when(runtime.run("/explain", FOREST, EXPLAIN)).thenReturn(Map.of("reports", List.of(Map.of("kind", "Crystal Tree"))));

        WorkspacePredictionPlanner planner = new WorkspacePredictionPlanner(authorization, bookmarks,
                new BookmarkPublishability(bindings, 50), models);

        List<AttestedPrediction> results = service.predictRows(planner.planFor(41L, 70L, 9L, 11L),
                List.of(INPUT, Map.of("age", 61)));

        assertEquals(PredictionResultStatus.SUCCESS, results.get(0).status());
        assertEquals(PredictionResultStatus.FAILED, results.get(1).status());
        assertEquals("Missing features", results.get(1).errorMessage());
        assertEquals(11L, results.get(1).modelId());
        // Only the record that was predicted is explained.
        verify(runtime).run("/explain", FOREST, EXPLAIN);
    }

    @Test
    void aRunFindingTheWorkspaceShareInUseWaitsItsTurnAndRuns() throws Exception {
        service = service(new WorkspaceRuntimeSlots(1, new RuntimeQueue(4, 16, 10_000)));
        CountDownLatch running = new CountDownLatch(1);
        CountDownLatch finish = new CountDownLatch(1);
        when(runtime.run("/predict", FOREST, PREDICT)).thenAnswer(call -> {
            if (running.getCount() > 0) {
                running.countDown();
                assertTrue(finish.await(10, TimeUnit.SECONDS));
            }
            return Map.of("reports", List.of(CLASSIFIER));
        });
        try (ExecutorService pool = Executors.newVirtualThreadPerTaskExecutor()) {
            Future<WorkspacePredictionDto> first = pool.submit(() -> service.predict(7L, 70L, request(11L)));
            assertTrue(running.await(10, TimeUnit.SECONDS));
            Future<WorkspacePredictionDto> second = pool.submit(() -> service.predict(7L, 70L, request(11L)));
            Thread.sleep(100);
            assertFalse(second.isDone());

            finish.countDown();
            assertEquals(PredictionResultStatus.SUCCESS, first.get(10, TimeUnit.SECONDS).status());
            assertEquals(PredictionResultStatus.SUCCESS, second.get(10, TimeUnit.SECONDS).status());
        }
    }

    private WorkspacePredictionService service(WorkspaceRuntimeSlots slots) {
        WorkspacePredictionPlanner planner = new WorkspacePredictionPlanner(authorization, bookmarks,
                new BookmarkPublishability(bindings, 50), models);
        return new WorkspacePredictionService(planner, slots, runtime, attestations, new ObjectMapper(), mock(AuditLogService.class));
    }

    private void assertRefused(int status, Executable call) {
        ResponseStatusException error = assertThrows(ResponseStatusException.class, call);

        assertEquals(status, error.getStatusCode().value());
        verify(runtime, never()).run(anyString(), any(), anyMap());
    }

    private void useReports(List<Map<String, Object>> reports) {
        Organization organization = new Organization();
        organization.setId(41L);
        version = new SchemaVersion(new Schema(organization, "Risk", null), 1, "v1",
                Map.of("fields", List.of(), "reports", reports));
        version.setId(9L);
        lenient().when(bookmarks.findByIdAndOrganizationId(70L, 41L))
                .thenReturn(Optional.of(new SchemaBookmark(version.getSchema(), version, "production")));
        lenient().when(bindings.findBoundModels(9L)).thenReturn(List.of(new BoundModel(11L, "forest", 10L)));
    }

    private static WorkspacePredictionRequest request(long modelId) {
        return new WorkspacePredictionRequest(9L, modelId, INPUT);
    }
}
