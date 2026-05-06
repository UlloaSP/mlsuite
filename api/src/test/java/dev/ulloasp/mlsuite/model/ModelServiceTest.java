package dev.ulloasp.mlsuite.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.model.domain.exception.ModelAlreadyExistsException;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.model.application.service.ModelServiceImpl;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.storage.ObjectStorageService;
import dev.ulloasp.mlsuite.storage.StoredObject;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@ExtendWith(MockitoExtension.class)
class ModelServiceTest {

    @Mock
    private UserLookupService userLookupService;

    @Mock
    private ModelRepository modelRepository;

    @Mock
    private ObjectStorageService objectStorageService;

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private MultipartFile modelFile;

    @Mock
    private WorkspaceAccessService workspaceAccessService;

    @Mock
    private WorkspaceAuthorizationService workspaceAuthorizationService;

    private ModelServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new ModelServiceImpl(
                userLookupService,
                modelRepository,
                objectStorageService,
                workspaceAccessService,
                workspaceAuthorizationService);
        ReflectionTestUtils.setField(service, "restTemplate", restTemplate);
        ReflectionTestUtils.setField(service, "analyzerUrl", "http://analyzer");
        when(workspaceAccessService.requireCurrentOrganization(3L)).thenReturn(organization());
    }

    @Test
    void getModels_UsesInternalUserId() {
        when(modelRepository.findByOrganizationId(41L)).thenReturn(List.of(new Model()));

        assertEquals(1, service.getModels(3L).size());
    }

    @Test
    void createModel_ThrowsWhenNameExistsInOrganization() {
        when(userLookupService.requireById(3L)).thenReturn(user());
        when(modelRepository.existsByNameAndOrganizationId("demo", 41L)).thenReturn(true);

        assertThrows(ModelAlreadyExistsException.class, () -> service.createModel(3L, "demo", modelFile));
    }

    @Test
    void createModel_StoresObjectAndPersistsModel() throws Exception {
        when(userLookupService.requireById(3L)).thenReturn(user());
        when(modelRepository.existsByNameAndOrganizationId("demo", 41L)).thenReturn(false);
        when(restTemplate.postForObject(anyString(), any(), eq(Map.class)))
                .thenReturn(Map.of("type", "clf", "specificType", "rf", "fileName", "model.pkl"));
        when(modelFile.getResource()).thenReturn(new org.springframework.core.io.ByteArrayResource("x".getBytes()));
        when(modelFile.getInputStream()).thenReturn(new java.io.ByteArrayInputStream("x".getBytes()));
        when(modelFile.getSize()).thenReturn(1L);
        when(modelFile.getContentType()).thenReturn("application/octet-stream");
        when(objectStorageService.store(any(), any(), any(), any(), anyLong()))
                .thenReturn(new StoredObject("bucket", "key", 1L, "etag"));
        when(modelRepository.save(any(Model.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Model result = service.createModel(3L, "demo", modelFile);

        assertEquals("demo", result.getName());
        verify(modelRepository).save(any(Model.class));
    }

    private User user() {
        User user = new User();
        user.setId(3L);
        user.setUsername("alice");
        return user;
    }

    private Organization organization() {
        Organization organization = new Organization();
        organization.setId(41L);
        organization.setName("Org");
        organization.setSlug("org");
        organization.setCreatedBy(user());
        return organization;
    }
}

