package dev.ulloasp.mlsuite.schema.application.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
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

import com.fasterxml.jackson.databind.ObjectMapper;

import dev.ulloasp.mlsuite.model.application.dto.ExplainRequest;
import dev.ulloasp.mlsuite.model.application.port.in.AnalyzerUseCase;
import dev.ulloasp.mlsuite.model.domain.exception.AnalyzerServiceException;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaModelBindingRepository;
import dev.ulloasp.mlsuite.schema.application.dto.WorkspacePredictionDto;
import dev.ulloasp.mlsuite.schema.application.dto.WorkspacePredictionRequest;
import dev.ulloasp.mlsuite.schema.domain.model.BoundModel;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultStatus;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

/** A member's prediction: performed by the server for one bound model, shaped as runs store it, and sealed. */
@ExtendWith(MockitoExtension.class)
class WorkspacePredictionServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-27T10:00:00Z");
    private static final Map<String, Object> INPUT = Map.of("age", 52);
    private static final Map<String, Object> CLASSIFIER = Map.of("kind", "classifier", "output", 0,
            "mapping", List.of("low", "high"), "probabilities", List.of(List.of(0.2, 0.8)), "prediction", "high");

    @Mock private WorkspaceAuthorizationService authorization;
    @Mock private SchemaBookmarkRepository bookmarks;
    @Mock private SchemaModelBindingRepository bindings;
    @Mock private AnalyzerUseCase analyzer;

    private final PredictionAttestations attestations = new PredictionAttestations(new ObjectMapper(),
            "unit-test-prediction-attestation-secret-0123", Clock.fixed(NOW, ZoneOffset.UTC));
    private WorkspacePredictionService service;
    private SchemaVersion version;

    @BeforeEach
    void setUp() {
        service = new WorkspacePredictionService(authorization, bookmarks, new BookmarkPublishability(bindings, 50),
                analyzer, attestations);
        Organization organization = new Organization();
        organization.setId(41L);
        lenient().when(authorization.requireCurrent(7L, PermissionKey.RUN_PREDICTIONS)).thenReturn(organization);
        useReports(List.of(Map.of("id", "risk", "kind", "classifier", "label", "Risk", "mappedTo", Map.of("forest", 0))));
    }

    @Test
    void performsTheRunAndSealsItInTheShapeRunsStore() {
        when(analyzer.predict(7L, 11L, INPUT)).thenReturn(Map.of("reports", List.of(CLASSIFIER)));

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
        verify(analyzer, never()).explain(anyLong(), anyLong(), any());
    }

    @Test
    void aRecordTheRuntimeRefusesIsASealedFailure() {
        when(analyzer.predict(7L, 11L, INPUT)).thenThrow(new AnalyzerServiceException(422, "age must be positive"));

        WorkspacePredictionDto result = service.predict(7L, 70L, request(11L));

        assertEquals(PredictionResultStatus.FAILED, result.status());
        assertEquals("age must be positive", result.errorMessage());
        assertEquals(Map.of("status", 422, "message", "age must be positive"), result.errorJson());
        assertEquals(Map.of("meta", Map.of("modelId", "11", "backendFieldValues", INPUT)), result.output());
        assertEquals(PredictionResultStatus.FAILED, attestations.open(result.attestation()).status());
    }

    @Test
    void anUnreachableRuntimeIsASealedFailure() {
        when(analyzer.predict(7L, 11L, INPUT)).thenThrow(AnalyzerServiceException.fromNetwork());

        WorkspacePredictionDto result = service.predict(7L, 70L, request(11L));

        assertEquals(PredictionResultStatus.FAILED, result.status());
        assertEquals(Map.of("status", 502, "message", "Analyzer service unreachable"), result.errorJson());
    }

    @Test
    void aPluginReportIsTheRuntimesExplanationOfTheSameRun() {
        useReports(List.of(Map.of("id", "path", "kind", "Crystal Tree", "mappedTo", Map.of("forest", "tree"))));
        when(analyzer.predict(7L, 11L, INPUT)).thenReturn(Map.of("reports", List.of(CLASSIFIER)));
        when(analyzer.explain(7L, 11L, new ExplainRequest(INPUT, List.of()))).thenReturn(
                Map.of("reports", List.of(Map.of("kind", "Crystal Tree", "explanation", "age <= 60"))));

        WorkspacePredictionDto result = service.predict(7L, 70L, request(11L));

        List<?> reports = (List<?>) result.output().get("reports");
        assertEquals(Map.of("kind", "Crystal Tree", "explanation", "age <= 60", "id", "path", "mappedTo", "tree"),
                reports.get(2));
    }

    @Test
    void aModelTheRuntimeCannotExplainKeepsItsPrediction() {
        useReports(List.of(Map.of("id", "path", "kind", "Crystal Tree", "mappedTo", Map.of("forest", "tree"))));
        when(analyzer.predict(7L, 11L, INPUT)).thenReturn(Map.of("reports", List.of(CLASSIFIER)));
        when(analyzer.explain(7L, 11L, new ExplainRequest(INPUT, List.of())))
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
        verify(analyzer, never()).predict(anyLong(), anyLong(), any());
    }

    private void assertRefused(int status, Executable call) {
        ResponseStatusException error = assertThrows(ResponseStatusException.class, call);

        assertEquals(status, error.getStatusCode().value());
        verify(analyzer, never()).predict(anyLong(), anyLong(), any());
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
