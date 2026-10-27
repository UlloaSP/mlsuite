package dev.ulloasp.mlsuite.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
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
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.ObjectMapper;

import dev.ulloasp.mlsuite.model.adapter.out.analyzer.AnalyzerClient;
import dev.ulloasp.mlsuite.model.adapter.out.analyzer.ModelRuntimeClient;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.model.application.dto.ExplainRequest;
import dev.ulloasp.mlsuite.model.application.service.AnalyzerServiceImpl;
import dev.ulloasp.mlsuite.model.application.service.WorkspaceRuntimeSlots;
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

    @Mock
    private MultipartFile artifactFile;

    private AnalyzerServiceImpl service;

    @BeforeEach
    void setUp() {
        service = service(new WorkspaceRuntimeSlots(4));
        lenient().when(authorizationService.requireCurrent(3L, PermissionKey.RUN_PREDICTIONS)).thenReturn(organization());
    }

    @Test
    void inspectArtifact_ForwardsUploadToAnalyzer() {
        lenient().when(userLookupService.requireById(3L)).thenReturn(user());
        when(artifactFile.getResource()).thenReturn(new org.springframework.core.io.ByteArrayResource("x".getBytes()));
        when(restTemplate.postForObject(eq("http://py-analyzer:8000/metadata"), any(), eq(Map.class)))
                .thenReturn(Map.of("type", "classifier"));

        Map<String, Object> result = service.inspectArtifact(3L, artifactFile);

        assertEquals("classifier", result.get("type"));
        verify(restTemplate).postForObject(eq("http://py-analyzer:8000/metadata"), any(), eq(Map.class));
    }

    @Test
    void inspectArtifact_KeepsAKeyTheAnalyzerAnswersWithNull() {
        Map<String, Object> answer = new HashMap<>(Map.of("type", "classifier"));
        answer.put("featureImportances", null);
        lenient().when(userLookupService.requireById(3L)).thenReturn(user());
        when(artifactFile.getResource()).thenReturn(new org.springframework.core.io.ByteArrayResource("x".getBytes()));
        when(restTemplate.postForObject(eq("http://py-analyzer:8000/metadata"), any(), eq(Map.class)))
                .thenReturn(answer);

        Map<String, Object> result = service.inspectArtifact(3L, artifactFile);

        assertEquals(answer, result);
    }

    @Test
    void inspectArtifact_PropagatesAnalyzerValidationError() {
        lenient().when(userLookupService.requireById(3L)).thenReturn(user());
        when(artifactFile.getResource()).thenReturn(new org.springframework.core.io.ByteArrayResource("x".getBytes()));
        when(restTemplate.postForObject(eq("http://py-analyzer:8000/metadata"), any(), eq(Map.class)))
                .thenThrow(restError(400, "{\"detail\":\"File must be .mlbundle\"}"));

        AnalyzerServiceException ex = assertThrows(
                AnalyzerServiceException.class,
                () -> service.inspectArtifact(3L, artifactFile));

        assertEquals(400, ex.getStatus());
        assertEquals("File must be .mlbundle", ex.getDetail());
    }

    @Test
    void inspectArtifact_PropagatesAnalyzerNetworkError() {
        lenient().when(userLookupService.requireById(3L)).thenReturn(user());
        when(artifactFile.getResource()).thenReturn(new org.springframework.core.io.ByteArrayResource("x".getBytes()));
        when(restTemplate.postForObject(eq("http://py-analyzer:8000/metadata"), any(), eq(Map.class)))
                .thenThrow(new ResourceAccessException("down"));

        AnalyzerServiceException ex = assertThrows(
                AnalyzerServiceException.class,
                () -> service.inspectArtifact(3L, artifactFile));

        assertEquals(0, ex.getStatus());
        assertEquals("Analyzer service unreachable", ex.getDetail());
    }

    @Test
    void explain_SendsTheInstanceAndTracesForTheModelsArtifact() {
        when(modelRepository.findArtifactReference(11L, 5L)).thenReturn(Optional.of(artifact()));
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
        service = service(new WorkspaceRuntimeSlots(0));
        when(modelRepository.findArtifactReference(11L, 5L)).thenReturn(Optional.of(artifact()));

        ResponseStatusException busy = assertThrows(ResponseStatusException.class, () -> service.explain(3L, 11L, request()));

        assertEquals(503, busy.getStatusCode().value());
        assertEquals("Too many workspace runs are in progress. Try again in a moment.", busy.getReason());
        verifyNoInteractions(restTemplate);
    }

    @Test
    void explain_ReturnsTheSlotHoweverTheRunEnds() {
        service = service(new WorkspaceRuntimeSlots(1));
        when(modelRepository.findArtifactReference(11L, 5L)).thenReturn(Optional.of(artifact()));
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
        when(modelRepository.findArtifactReference(11L, 5L)).thenReturn(Optional.empty());

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
                new ModelArtifactContentReader(objectStorageService, modelRepository));
        return new AnalyzerServiceImpl(analyzerClient, modelRuntime, slots, modelRepository,
                userLookupService, authorizationService, new ObjectMapper());
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

    private ModelArtifactReference artifact() {
        return new ModelArtifactReference(11L, "risk.mlbundle", "bucket", "key", null, 3L, "abc123");
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
