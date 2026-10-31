package dev.ulloasp.mlsuite.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.ObjectMapper;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.model.adapter.out.analyzer.AnalyzerClient;
import dev.ulloasp.mlsuite.model.adapter.out.analyzer.ModelRuntimeClient;
import dev.ulloasp.mlsuite.model.application.runtime.ModelPreparationLedger;
import dev.ulloasp.mlsuite.model.application.runtime.RunnableModel;
import dev.ulloasp.mlsuite.model.domain.model.ModelRuntimeState;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.model.application.dto.ExplainRequest;
import dev.ulloasp.mlsuite.model.application.service.AnalyzerServiceImpl;
import dev.ulloasp.mlsuite.model.application.service.WorkspaceRuntimeSlots;
import dev.ulloasp.mlsuite.schema.application.service.RuntimeQueue;
import dev.ulloasp.mlsuite.model.domain.exception.AnalyzerServiceException;
import dev.ulloasp.mlsuite.model.domain.exception.ModelDoesNotExistsException;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.storage.ModelArtifactContentReader;
import dev.ulloasp.mlsuite.storage.ModelArtifactReference;
import dev.ulloasp.mlsuite.storage.ObjectStorageService;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@ExtendWith(MockitoExtension.class)
class AnalyzerServiceTest {

    /** A share that turns away at once a run finding it in use. */
    private static final RuntimeQueue NO_WAITING = new RuntimeQueue(0, 16, 0);

    @Mock
    private ModelRepository modelRepository;

    @Mock
    private ObjectStorageService objectStorageService;

    @Mock
    private UserLookupService userLookupService;

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private WorkspaceAuthorizationService authorizationService;

    private AnalyzerServiceImpl service;

    @BeforeEach
    void setUp() {
        service = service(new WorkspaceRuntimeSlots(4, NO_WAITING));
        lenient().when(authorizationService.requireCurrent(3L, PermissionKey.RUN_PREDICTIONS)).thenReturn(organization());
    }

    @Test
    void explain_SendsTheInstanceAndTracesForTheModelsArtifact() {
        when(modelRepository.findRunnableModel(11L, 5L)).thenReturn(Optional.of(artifact()));
        when(restTemplate.postForObject(eq("http://py-analyzer:8000/explain"), any(), eq(Map.class)))
                .thenReturn(Map.of("reports", List.of()));

        service.explain(3L, 11L, request());

        MultiValueMap<String, HttpEntity<?>> sent = sent(1).get(0);
        assertEquals("abc123", sent.getFirst("artifact_sha256").getBody());
        assertEquals("{\"x\":1}", sent.getFirst("data").getBody());
        assertEquals("[]", sent.getFirst("traces").getBody());
        verifyNoInteractions(objectStorageService);
    }

    @Test
    void explain_IsTurnedAwayWithoutCallingTheRuntimeWhenEverySlotIsInUse() {
        service = service(new WorkspaceRuntimeSlots(0, NO_WAITING));

        ResponseStatusException busy = assertThrows(ResponseStatusException.class, () -> service.explain(3L, 11L, request()));

        assertEquals(503, busy.getStatusCode().value());
        assertEquals("Too many workspace runs are in progress. Try again in a moment.", busy.getReason());
        // Turned away before any database work.
        verifyNoInteractions(authorizationService, modelRepository, restTemplate);
    }

    @Test
    void explain_ReturnsTheSlotHoweverTheRunEnds() {
        service = service(new WorkspaceRuntimeSlots(1, NO_WAITING));
        when(modelRepository.findRunnableModel(11L, 5L)).thenReturn(Optional.of(artifact()));
        when(restTemplate.postForObject(eq("http://py-analyzer:8000/explain"), any(), eq(Map.class)))
                .thenThrow(restError(400, "{\"detail\":\"Missing features\"}"))
                .thenReturn(Map.of("reports", List.of()));

        assertEquals(400, assertThrows(AnalyzerServiceException.class,
                () -> service.explain(3L, 11L, request())).getStatus());
        assertEquals(List.of(), service.explain(3L, 11L, request()).get("reports"));
    }

    @Test
    void explain_ThrowsWhenTheOrganizationHasNoSuchModel() {
        lenient().when(userLookupService.requireById(3L)).thenReturn(user());
        when(modelRepository.findRunnableModel(11L, 5L)).thenReturn(Optional.empty());

        assertThrows(ModelDoesNotExistsException.class, () -> service.explain(3L, 11L, request()));
        verifyNoInteractions(restTemplate);
    }

    @Test
    void explain_RequiresRunPredictionsPermission() {
        when(authorizationService.requireCurrent(3L, PermissionKey.RUN_PREDICTIONS))
                .thenThrow(new OrganizationAccessDeniedException(5L));

        assertThrows(OrganizationAccessDeniedException.class,
                () -> service.explain(3L, 11L, request()));
        verifyNoInteractions(modelRepository, restTemplate);
    }

    private AnalyzerServiceImpl service(WorkspaceRuntimeSlots slots) {
        AnalyzerClient analyzerClient = new AnalyzerClient(restTemplate, restTemplate, "http://py-analyzer:8000");
        ModelRuntimeClient modelRuntime = new ModelRuntimeClient(analyzerClient,
                new ModelArtifactContentReader(objectStorageService),
                mock(ModelPreparationLedger.class));
        return new AnalyzerServiceImpl(modelRuntime, slots, modelRepository,
                userLookupService, authorizationService, new ObjectMapper(), mock(AuditLogService.class));
    }

    @SuppressWarnings("unchecked")
    private List<MultiValueMap<String, HttpEntity<?>>> sent(int calls) {
        ArgumentCaptor<HttpEntity<?>> captor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate, times(calls)).postForObject(any(String.class), captor.capture(), eq(Map.class));
        return captor.getAllValues().stream()
                .map(entity -> (MultiValueMap<String, HttpEntity<?>>) entity.getBody())
                .toList();
    }

    private static ExplainRequest request() {
        return new ExplainRequest(Map.of("x", 1), List.of());
    }

    private RunnableModel artifact() {
        return new RunnableModel(new ModelArtifactReference(11L, "risk.mlbundle", "bucket", "key", null, 3L, "abc123"),
                "legacy", ModelRuntimeState.READY);
    }

    private User user() {
        User user = new User();
        user.setId(3L);
        user.setUsername("alice");
        return user;
    }

    private Organization organization() {
        Organization organization = new Organization();
        organization.setId(5L);
        return organization;
    }

    private RestClientResponseException restError(int status, String body) {
        return new RestClientResponseException(
                "bad",
                status,
                "Bad Request",
                HttpHeaders.EMPTY,
                body.getBytes(StandardCharsets.UTF_8),
                StandardCharsets.UTF_8);
    }
}
