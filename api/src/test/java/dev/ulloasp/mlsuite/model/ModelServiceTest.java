package dev.ulloasp.mlsuite.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.model.domain.exception.ModelAlreadyExistsException;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.model.application.service.ModelServiceImpl;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaModelBindingRepository;
import dev.ulloasp.mlsuite.storage.ObjectStorageService;
import dev.ulloasp.mlsuite.storage.StoredObject;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.workspace.application.dto.WorkspacePermissionsDto;
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
    private SchemaModelBindingRepository bindingRepository;

    @Mock
    private PredictionResultRepository resultRepository;

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
                bindingRepository,
                resultRepository,
                workspaceAccessService,
                workspaceAuthorizationService);
        ReflectionTestUtils.setField(service, "restTemplate", restTemplate);
        ReflectionTestUtils.setField(service, "analyzerUrl", "http://analyzer");
        when(workspaceAccessService.requireCurrentOrganization(3L)).thenReturn(organization());
    }

    @Test
    void getModels_UsesInternalUserId() {
        when(modelRepository.findByOrganizationIdAndArchivedAtIsNull(41L)).thenReturn(List.of(new Model()));

        assertEquals(1, service.getModels(3L).size());
    }

    @Test
    void getModelPage_FiltersAndPaginatesActiveModels() {
        Model model = model("demo");
        when(modelRepository.findCatalogPage(eq(41L), eq("rf"), eq(false), eq(false), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(model)));

        var page = service.getModelPage(3L, 0, 24, " rf ", "updated", "active");

        assertEquals(1, page.items().size());
        assertEquals("demo", page.items().getFirst().name());
    }

    @Test
    void createModel_ThrowsWhenNameExistsInOrganization() {
        when(userLookupService.requireById(3L)).thenReturn(user());
        when(modelRepository.existsByNameAndOrganizationId("demo", 41L)).thenReturn(true);

        assertThrows(ModelAlreadyExistsException.class, () -> service.createModel(3L, "demo", modelFile));
    }

    @Test
    void renameModel_UpdatesNameWhenUnique() {
        Model model = model("old");
        when(workspaceAuthorizationService.workspacePermissions(3L, 41L)).thenReturn(allPermissions());
        when(modelRepository.findByIdAndOrganizationId(9L, 41L)).thenReturn(java.util.Optional.of(model));
        when(modelRepository.existsByNameAndOrganizationIdAndIdNot("new", 41L, 9L)).thenReturn(false);
        when(modelRepository.save(model)).thenReturn(model);

        assertEquals("new", service.renameModel(3L, 9L, " new ").getName());
    }

    @Test
    void archiveModel_SetsArchivedAt() {
        Model model = model("demo");
        when(workspaceAuthorizationService.workspacePermissions(3L, 41L)).thenReturn(allPermissions());
        when(modelRepository.findByIdAndOrganizationId(9L, 41L)).thenReturn(java.util.Optional.of(model));
        when(modelRepository.save(model)).thenReturn(model);

        service.archiveModel(3L, 9L);

        org.junit.jupiter.api.Assertions.assertNotNull(model.getArchivedAt());
    }

    @Test
    void deleteModel_BlocksWhenModelIsReferenced() {
        when(workspaceAuthorizationService.workspacePermissions(3L, 41L)).thenReturn(allPermissions());
        when(modelRepository.findByIdAndOrganizationId(9L, 41L)).thenReturn(java.util.Optional.of(model("demo")));
        when(bindingRepository.existsByModelId(9L)).thenReturn(true);

        assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> service.deleteModel(3L, 9L));
        verify(modelRepository, never()).delete(any());
    }

    @Test
    void duplicateModel_CopiesStoredObject() {
        Model source = model("demo");
        source.setStorageBucket("bucket");
        source.setStorageObjectKey("old-key");
        when(userLookupService.requireById(3L)).thenReturn(user());
        when(workspaceAuthorizationService.workspacePermissions(3L, 41L)).thenReturn(allPermissions());
        when(modelRepository.findByIdAndOrganizationId(9L, 41L)).thenReturn(java.util.Optional.of(source));
        when(modelRepository.existsByNameAndOrganizationId("copy", 41L)).thenReturn(false);
        when(objectStorageService.load("bucket", "old-key")).thenReturn("bytes".getBytes());
        when(objectStorageService.store(any(), eq("model.pkl"), eq("application/octet-stream"), any(byte[].class)))
                .thenReturn(new StoredObject("bucket", "new-key", 5L, "etag"));
        when(modelRepository.save(any(Model.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Model copy = service.duplicateModel(3L, 9L, "copy");

        assertEquals("copy", copy.getName());
        assertEquals("new-key", copy.getStorageObjectKey());
    }

    @Test
    void createModel_StoresObjectAndPersistsModel() throws Exception {
        when(userLookupService.requireById(3L)).thenReturn(user());
        when(modelRepository.existsByNameAndOrganizationId("demo", 41L)).thenReturn(false);
        when(restTemplate.postForObject(anyString(), any(), eq(Map.class)))
                .thenReturn(Map.of("type", "clf", "specificType", "rf", "fileName", "model.pkl"));
        when(modelFile.getBytes()).thenReturn("x".getBytes());
        when(modelFile.getName()).thenReturn("modelFile");
        when(modelFile.getOriginalFilename()).thenReturn("model.pkl");
        when(modelFile.getContentType()).thenReturn("application/octet-stream");
        when(objectStorageService.store(any(), any(), any(), any(), anyLong()))
                .thenReturn(new StoredObject("bucket", "key", 1L, "etag"));
        when(modelRepository.save(any(Model.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Model result = service.createModel(3L, "demo", modelFile);

        assertEquals("demo", result.getName());
        verify(modelRepository).save(any(Model.class));
    }

    @Test
    void createModel_DeletesStoredObjectWhenPersistFails() throws Exception {
        RuntimeException failure = new RuntimeException("persist failed");
        when(userLookupService.requireById(3L)).thenReturn(user());
        when(modelRepository.existsByNameAndOrganizationId("demo", 41L)).thenReturn(false);
        when(restTemplate.postForObject(anyString(), any(), eq(Map.class)))
                .thenReturn(Map.of("type", "clf", "specificType", "rf", "fileName", "model.pkl"));
        when(modelFile.getBytes()).thenReturn("x".getBytes());
        when(modelFile.getName()).thenReturn("modelFile");
        when(modelFile.getOriginalFilename()).thenReturn("model.pkl");
        when(modelFile.getContentType()).thenReturn("application/octet-stream");
        when(objectStorageService.store(any(), any(), any(), any(), anyLong()))
                .thenReturn(new StoredObject("bucket", "key", 1L, "etag"));
        when(modelRepository.save(any(Model.class))).thenThrow(failure);

        assertEquals(failure, assertThrows(RuntimeException.class, () -> service.createModel(3L, "demo", modelFile)));
        verify(objectStorageService).delete("bucket", "key");
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

    private Model model(String name) {
        Model model = new Model();
        model.setId(9L);
        model.setName(name);
        model.setType("classifier");
        model.setSpecificType("random_forest");
        model.setFileName("model.pkl");
        model.setInputSchema(Map.of());
        model.setCreatedAt(OffsetDateTime.now());
        model.setUpdatedAt(OffsetDateTime.now());
        return model;
    }

    private WorkspacePermissionsDto allPermissions() {
        return new WorkspacePermissionsDto(true, true, true, true, true, true, true, true, true, true, true, true,
                true, true, true, true, true, true, true, true, true, true, true, true);
    }
}

