package dev.ulloasp.mlsuite.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.lenient;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.mockito.ArgumentCaptor;

import com.fasterxml.jackson.databind.ObjectMapper;

import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.model.domain.exception.AnalyzerServiceException;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.model.domain.exception.ModelDoesNotExistsException;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.model.application.service.AnalyzerServiceImpl;
import dev.ulloasp.mlsuite.storage.ObjectStorageException;
import dev.ulloasp.mlsuite.storage.ObjectStorageService;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;

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
    private WorkspaceAccessService workspaceAccessService;

    @Mock
    private MultipartFile artifactFile;

    private ObjectMapper objectMapper;
    private AnalyzerServiceImpl service;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        service = new AnalyzerServiceImpl(
                restTemplate,
                modelRepository,
                objectStorageService,
                userLookupService,
                workspaceAccessService,
                objectMapper);
        ReflectionTestUtils.setField(service, "analyzerUrl", "http://py-analyzer:8000");
        lenient().when(workspaceAccessService.requireCurrentOrganization(3L)).thenReturn(organization());
    }

    @Test
    void inspectArtifact_ForwardsUploadToAnalyzer() {
        lenient().when(userLookupService.requireById(3L)).thenReturn(user());
        when(artifactFile.getResource()).thenReturn(new org.springframework.core.io.ByteArrayResource("x".getBytes()));
        when(restTemplate.postForObject(eq("http://py-analyzer:8000/inspect_artifact"), any(), eq(Map.class)))
                .thenReturn(Map.of("kind", "dataframe"));

        Map<String, Object> result = service.inspectArtifact(3L, artifactFile);

        assertEquals("dataframe", result.get("kind"));
        verify(restTemplate).postForObject(eq("http://py-analyzer:8000/inspect_artifact"), any(), eq(Map.class));
    }

    @Test
    void inspectArtifact_PropagatesAnalyzerValidationError() {
        lenient().when(userLookupService.requireById(3L)).thenReturn(user());
        when(artifactFile.getResource()).thenReturn(new org.springframework.core.io.ByteArrayResource("x".getBytes()));
        when(restTemplate.postForObject(eq("http://py-analyzer:8000/inspect_artifact"), any(), eq(Map.class)))
                .thenThrow(restError(400, "{\"detail\":\"File must be .joblib\"}"));

        AnalyzerServiceException ex = assertThrows(
                AnalyzerServiceException.class,
                () -> service.inspectArtifact(3L, artifactFile));

        assertEquals(400, ex.getStatus());
        assertEquals("File must be .joblib", ex.getDetail());
    }

    @Test
    void inspectArtifact_PropagatesAnalyzerNetworkError() {
        lenient().when(userLookupService.requireById(3L)).thenReturn(user());
        when(artifactFile.getResource()).thenReturn(new org.springframework.core.io.ByteArrayResource("x".getBytes()));
        when(restTemplate.postForObject(eq("http://py-analyzer:8000/inspect_artifact"), any(), eq(Map.class)))
                .thenThrow(new ResourceAccessException("down"));

        AnalyzerServiceException ex = assertThrows(
                AnalyzerServiceException.class,
                () -> service.inspectArtifact(3L, artifactFile));

        assertEquals(0, ex.getStatus());
        assertEquals("Analyzer service unreachable", ex.getDetail());
    }

    @Test
    void matchArtifacts_ForwardsUploadsToAnalyzer() {
        lenient().when(userLookupService.requireById(3L)).thenReturn(user());
        when(artifactFile.getResource()).thenReturn(new org.springframework.core.io.ByteArrayResource("x".getBytes()));
        when(restTemplate.postForObject(eq("http://py-analyzer:8000/match_artifacts"), any(), eq(Map.class)))
                .thenReturn(Map.of("models", List.of()));

        Map<String, Object> result = service.matchArtifacts(3L, List.of(artifactFile), List.of(artifactFile));

        assertEquals(List.of(), result.get("models"));
        verify(restTemplate).postForObject(eq("http://py-analyzer:8000/match_artifacts"), any(), eq(Map.class));
    }

    @Test
    void generateInputSchema_ForwardsOneHotSeparator() {
        lenient().when(userLookupService.requireById(3L)).thenReturn(user());
        when(artifactFile.getResource()).thenReturn(new org.springframework.core.io.ByteArrayResource("x".getBytes()));
        when(restTemplate.postForObject(eq("http://py-analyzer:8000/build_schema"), any(), eq(Map.class)))
                .thenReturn(Map.of("fields", List.of()));

        service.generateInputSchema(3L, artifactFile, null, "_");

        ArgumentCaptor<Object> captor = ArgumentCaptor.forClass(Object.class);
        verify(restTemplate).postForObject(eq("http://py-analyzer:8000/build_schema"), captor.capture(), eq(Map.class));
        HttpEntity<?> entity = (HttpEntity<?>) captor.getValue();
        @SuppressWarnings("unchecked")
        MultiValueMap<String, Object> body = (MultiValueMap<String, Object>) entity.getBody();
        assertEquals("_", body.getFirst("onehot_separator"));
    }

    @Test
    void matchArtifacts_PropagatesAnalyzerValidationError() {
        lenient().when(userLookupService.requireById(3L)).thenReturn(user());
        when(artifactFile.getResource()).thenReturn(new org.springframework.core.io.ByteArrayResource("x".getBytes()));
        when(restTemplate.postForObject(eq("http://py-analyzer:8000/match_artifacts"), any(), eq(Map.class)))
                .thenThrow(restError(400, "{\"detail\":\"Dataframe files must contain pandas DataFrame objects.\"}"));

        AnalyzerServiceException ex = assertThrows(
                AnalyzerServiceException.class,
                () -> service.matchArtifacts(3L, List.of(artifactFile), List.of(artifactFile)));

        assertEquals(400, ex.getStatus());
        assertEquals("Dataframe files must contain pandas DataFrame objects.", ex.getDetail());
    }

    @Test
    void matchArtifacts_PropagatesAnalyzerNetworkError() {
        lenient().when(userLookupService.requireById(3L)).thenReturn(user());
        when(artifactFile.getResource()).thenReturn(new org.springframework.core.io.ByteArrayResource("x".getBytes()));
        when(restTemplate.postForObject(eq("http://py-analyzer:8000/match_artifacts"), any(), eq(Map.class)))
                .thenThrow(new ResourceAccessException("down"));

        AnalyzerServiceException ex = assertThrows(
                AnalyzerServiceException.class,
                () -> service.matchArtifacts(3L, List.of(artifactFile), List.of(artifactFile)));

        assertEquals(0, ex.getStatus());
        assertEquals("Analyzer service unreachable", ex.getDetail());
    }

    @Test
    void predict_UsesOwnerScopedModelAndObjectStorage() {
        User user = user();
        Model model = model(user);
        lenient().when(userLookupService.requireById(3L)).thenReturn(user);
        when(modelRepository.findByIdAndOrganizationId(11L, 5L)).thenReturn(Optional.of(model));
        when(objectStorageService.load("bucket", "key")).thenReturn(new byte[] { 1, 2, 3 });
        when(restTemplate.postForObject(eq("http://py-analyzer:8000/predict"), any(), eq(Map.class)))
                .thenReturn(Map.of("prediction", 1));

        Map<String, Object> result = service.predict(3L, 11L, Map.of("x", 1));

        assertEquals(1, result.get("prediction"));
        verify(modelRepository).findByIdAndOrganizationId(11L, 5L);
    }

    @Test
    void predict_FallsBackToInlineBytesWhenStorageFails() {
        User user = user();
        Model model = model(user);
        model.setModelFile(new byte[] { 9, 8, 7 });
        lenient().when(userLookupService.requireById(3L)).thenReturn(user);
        when(modelRepository.findByIdAndOrganizationId(11L, 5L)).thenReturn(Optional.of(model));
        when(objectStorageService.load("bucket", "key")).thenThrow(new ObjectStorageException("down"));
        when(restTemplate.postForObject(eq("http://py-analyzer:8000/predict"), any(), eq(Map.class)))
                .thenReturn(Map.of("prediction", 1));

        assertEquals(1, service.predict(3L, 11L, Map.of("x", 1)).get("prediction"));
    }

    @Test
    void predict_ThrowsWhenOwnerScopedModelMissing() {
        lenient().when(userLookupService.requireById(3L)).thenReturn(user());
        when(modelRepository.findByIdAndOrganizationId(11L, 5L)).thenReturn(Optional.empty());

        assertThrows(ModelDoesNotExistsException.class, () -> service.predict(3L, 11L, Map.of("x", 1)));
    }

    private User user() {
        User user = new User();
        user.setId(3L);
        user.setUsername("alice");
        return user;
    }

    private Model model(User user) {
        Model model = new Model();
        model.setId(11L);
        model.setUser(user);
        model.setStorageBucket("bucket");
        model.setStorageObjectKey("key");
        return model;
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

