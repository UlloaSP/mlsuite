package dev.ulloasp.mlsuite.schema.application.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.ObjectMapper;

import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultFeedbackRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaModelBindingRepository;
import dev.ulloasp.mlsuite.schema.application.dto.CreatePredictionResultRequest;
import dev.ulloasp.mlsuite.schema.application.dto.CreatePredictionRunRequest;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResult;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultStatus;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRunStatus;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaModelBinding;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

/** Saving a workspace run: it keeps only results the server sealed, for this organization and snapshot. */
@ExtendWith(MockitoExtension.class)
class PredictionRunCreationTest {

    private static final long ORG = 41L;
    private static final long VERSION = 9L;
    private static final Instant NOW = Instant.parse("2026-10-27T10:00:00Z");
    private static final String SECRET = "unit-test-prediction-attestation-secret-0123";

    @Mock private UserLookupService users;
    @Mock private SchemaBookmarkRepository bookmarks;
    @Mock private SchemaModelBindingRepository bindings;
    @Mock private PredictionRunRepository runs;
    @Mock private PredictionResultRepository results;
    @Mock private PredictionResultFeedbackRepository feedback;
    @Mock private ModelRepository models;
    @Mock private WorkspaceAuthorizationService authorization;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final PredictionAttestations attestations =
            new PredictionAttestations(objectMapper, SECRET, Clock.fixed(NOW, ZoneOffset.UTC));
    private final List<PredictionResult> saved = new ArrayList<>();
    private PredictionRunServiceImpl service;
    private SchemaBookmark bookmark;

    @BeforeEach
    void setUp() {
        service = new PredictionRunServiceImpl(users, bookmarks, bindings, runs, results, feedback, models,
                authorization, attestations);
        Organization organization = new Organization();
        organization.setId(ORG);
        User user = new User();
        user.setId(7L);
        user.setFullName("Alice");
        Schema schema = new Schema(organization, "Risk", null);
        SchemaVersion version = new SchemaVersion(schema, 1, "v1", Map.of("fields", List.of()));
        version.setId(VERSION);
        bookmark = new SchemaBookmark(schema, version, "production");
        lenient().when(users.requireById(7L)).thenReturn(user);
        lenient().when(authorization.requireCurrent(7L, PermissionKey.RUN_PREDICTIONS)).thenReturn(organization);
        lenient().when(bookmarks.findByIdAndOrganizationId(70L, ORG)).thenReturn(Optional.of(bookmark));
        lenient().when(bindings.findBySchemaVersionId(VERSION))
                .thenReturn(List.of(binding(version, 11L), binding(version, 12L)));
        lenient().when(runs.save(any(PredictionRun.class))).thenAnswer(call -> call.getArgument(0));
        lenient().when(models.findByIdAndOrganizationId(any(), eq(ORG)))
                .thenAnswer(call -> Optional.of(model(call.getArgument(0))));
        lenient().when(results.save(any(PredictionResult.class))).thenAnswer(call -> {
            saved.add(call.getArgument(0));
            return call.getArgument(0);
        });
    }

    @Test
    void storesExactlyWhatTheServerSealed() {
        PredictionRun run = save(sealed(11L, PredictionResultStatus.SUCCESS), sealed(12L, PredictionResultStatus.FAILED));

        assertEquals(PredictionRunStatus.PARTIAL_SUCCESS, run.getStatus());
        assertEquals(2, saved.size());
        PredictionResult first = saved.get(0);
        assertEquals(11L, first.getModel().getId());
        assertEquals(Map.of("age", 52), first.getModelInput());
        assertEquals(output(11L), first.getOutput());
        assertEquals(PredictionResultStatus.SUCCESS, first.getStatus());
        PredictionResult second = saved.get(1);
        assertEquals(PredictionResultStatus.FAILED, second.getStatus());
        assertEquals("Model refused the record", second.getErrorMessage());
        assertEquals(Map.of("status", 422, "message", "Model refused the record"), second.getErrorJson());
    }

    @Test
    void refusesAResultWhoseContentWasChanged() throws Exception {
        String seal = sealed(11L, PredictionResultStatus.SUCCESS);
        String payload = new String(Base64.getUrlDecoder().decode(seal.substring(0, seal.indexOf('.'))));
        String forged = payload.replace("\"high\"", "\"low\"");
        String tampered = Base64.getUrlEncoder().withoutPadding().encodeToString(forged.getBytes())
                + seal.substring(seal.indexOf('.'));

        assertRefused(400, tampered, sealed(12L, PredictionResultStatus.SUCCESS));
    }

    @Test
    void refusesAResultSignedWithAnotherKey() {
        PredictionAttestations foreign = new PredictionAttestations(objectMapper,
                "another-deployment-secret-that-is-long-enough", Clock.fixed(NOW, ZoneOffset.UTC));
        String seal = foreign.seal(prediction(ORG, VERSION, 11L, PredictionResultStatus.SUCCESS, NOW.toEpochMilli()));

        assertRefused(400, seal, sealed(12L, PredictionResultStatus.SUCCESS));
    }

    @Test
    void refusesAResultThatIsNoSeal() {
        assertRefused(400, "not-a-seal", sealed(12L, PredictionResultStatus.SUCCESS));
        assertRefused(400, "a.b.c", sealed(12L, PredictionResultStatus.SUCCESS));
        assertRefused(400, "%%%.%%%", sealed(12L, PredictionResultStatus.SUCCESS));
    }

    @Test
    void refusesAResultPerformedForAnotherOrganization() {
        String seal = attestations.seal(prediction(99L, VERSION, 11L, PredictionResultStatus.SUCCESS, NOW.toEpochMilli()));

        assertRefused(400, seal, sealed(12L, PredictionResultStatus.SUCCESS));
    }

    @Test
    void refusesAResultPerformedForAnotherSnapshot() {
        String seal = attestations.seal(prediction(ORG, 8L, 11L, PredictionResultStatus.SUCCESS, NOW.toEpochMilli()));

        assertRefused(400, seal, sealed(12L, PredictionResultStatus.SUCCESS));
    }

    @Test
    void refusesAnExpiredResult() {
        long dayAndASecondAgo = NOW.minus(PredictionAttestations.LIFETIME).minusSeconds(1).toEpochMilli();
        String seal = attestations.seal(prediction(ORG, VERSION, 11L, PredictionResultStatus.SUCCESS, dayAndASecondAgo));

        assertRefused(400, seal, sealed(12L, PredictionResultStatus.SUCCESS));
    }

    @Test
    void refusesAResultIssuedInTheFuture() {
        long later = NOW.plusSeconds(3600).toEpochMilli();
        String seal = attestations.seal(prediction(ORG, VERSION, 11L, PredictionResultStatus.SUCCESS, later));

        assertRefused(400, seal, sealed(12L, PredictionResultStatus.SUCCESS));
    }

    @Test
    void refusesAResultOfAnUnboundModel() {
        assertRefused(400, sealed(11L, PredictionResultStatus.SUCCESS), sealed(13L, PredictionResultStatus.SUCCESS));
    }

    @Test
    void refusesTwoResultsOfOneModel() {
        assertRefused(400, sealed(11L, PredictionResultStatus.SUCCESS), sealed(11L, PredictionResultStatus.SUCCESS));
    }

    @Test
    void refusesARunMissingABoundModel() {
        assertRefused(400, sealed(11L, PredictionResultStatus.SUCCESS));
    }

    @Test
    void refusesARunOfASnapshotTheBookmarkNoLongerTargets() {
        CreatePredictionRunRequest request = new CreatePredictionRunRequest(8L, "case-1", Map.of("age", 52),
                List.of(new CreatePredictionResultRequest(sealed(11L, PredictionResultStatus.SUCCESS))));

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.createRunForBookmark(7L, 70L, request));

        assertEquals(409, error.getStatusCode().value());
        verify(runs, never()).save(any());
    }

    @Test
    void theApiDoesNotStartWithoutASecretLongEnoughToSign() {
        for (String secret : new String[] { null, "", "   ", "too-short-to-sign" }) {
            assertThrows(IllegalStateException.class, () -> new PredictionAttestations(objectMapper, secret));
        }
    }

    private PredictionRun save(String... seals) {
        return service.createRunForBookmark(7L, 70L, request(seals));
    }

    private void assertRefused(int status, String... seals) {
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.createRunForBookmark(7L, 70L, request(seals)));

        assertEquals(status, error.getStatusCode().value());
        verify(runs, never()).save(any());
        verify(results, never()).save(any());
    }

    private static CreatePredictionRunRequest request(String... seals) {
        return new CreatePredictionRunRequest(VERSION, "case-1", Map.of("age", 52),
                Arrays.stream(seals).map(CreatePredictionResultRequest::new).toList());
    }

    private String sealed(long modelId, PredictionResultStatus status) {
        return attestations.seal(prediction(ORG, VERSION, modelId, status, NOW.toEpochMilli()));
    }

    private static AttestedPrediction prediction(long organizationId, long versionId, long modelId,
            PredictionResultStatus status, long issuedAt) {
        boolean failed = status == PredictionResultStatus.FAILED;
        return new AttestedPrediction(organizationId, versionId, modelId, Map.of("age", 52),
                failed ? Map.of("meta", Map.of("modelId", String.valueOf(modelId))) : output(modelId), status,
                failed ? "Model refused the record" : null,
                failed ? Map.of("status", 422, "message", "Model refused the record") : null, issuedAt);
    }

    private static Map<String, Object> output(long modelId) {
        return Map.of("reports", List.of(Map.of("kind", "classifier", "mappedTo", "risk", "prediction", "high")),
                "meta", Map.of("modelId", String.valueOf(modelId), "backendFieldValues", Map.of("age", 52)));
    }

    private static SchemaModelBinding binding(SchemaVersion version, long modelId) {
        return new SchemaModelBinding(version, model(modelId), Map.of());
    }

    private static Model model(Long id) {
        Model model = new Model();
        model.setId(id);
        return model;
    }
}
