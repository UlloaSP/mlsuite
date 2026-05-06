package dev.ulloasp.mlsuite.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.lenient;

import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.ObjectMapper;

import dev.ulloasp.mlsuite.model.domain.model.Model;
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
        ReflectionTestUtils.setField(service, "analyzerUrl", "https://py-analyzer:8000");
        lenient().when(workspaceAccessService.requireCurrentOrganization(3L)).thenReturn(organization());
    }

    @Test
    void predict_UsesOwnerScopedModelAndObjectStorage() {
        User user = user();
        Model model = model(user);
        lenient().when(userLookupService.requireById(3L)).thenReturn(user);
        when(modelRepository.findByIdAndOrganizationId(11L, 5L)).thenReturn(Optional.of(model));
        when(objectStorageService.load("bucket", "key")).thenReturn(new byte[] { 1, 2, 3 });
        when(restTemplate.postForObject(eq("https://py-analyzer:8000/predict"), any(), eq(Map.class)))
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
        when(restTemplate.postForObject(eq("https://py-analyzer:8000/predict"), any(), eq(Map.class)))
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
}

