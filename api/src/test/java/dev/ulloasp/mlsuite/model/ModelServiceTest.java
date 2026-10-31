package dev.ulloasp.mlsuite.model;

import static org.mockito.Mockito.lenient;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import dev.ulloasp.mlsuite.model.application.runtime.RuntimeEnvironments;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.model.domain.model.ModelRuntimeState;
import dev.ulloasp.mlsuite.storage.ArtifactSource;
import dev.ulloasp.mlsuite.model.domain.exception.ModelAlreadyExistsException;
import dev.ulloasp.mlsuite.model.application.upload.BundleInspection;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.model.application.service.ModelServiceImpl;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaModelBindingRepository;
import dev.ulloasp.mlsuite.storage.ObjectStorageService;
import dev.ulloasp.mlsuite.storage.ModelArtifactContentReader;
import dev.ulloasp.mlsuite.storage.ModelArtifactWriter;
import dev.ulloasp.mlsuite.storage.ObjectStorageException;
import dev.ulloasp.mlsuite.storage.StorageDeletionQueue;
import dev.ulloasp.mlsuite.support.TestFixtures;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@ExtendWith(MockitoExtension.class)
class ModelServiceTest {

    @Mock private UserLookupService userLookupService;
    @Mock private ModelRepository modelRepository;
    @Mock private ObjectStorageService objectStorageService;
    @Mock private SchemaModelBindingRepository bindingRepository;
    @Mock private PredictionResultRepository resultRepository;
    @Mock private WorkspaceAuthorizationService workspaceAuthorizationService;
    @Mock private ModelArtifactWriter artifactWriter;
    @Mock private ModelArtifactContentReader artifactReader;
    @Mock private StorageDeletionQueue deletionQueue;
    @Mock private RuntimeEnvironments environments;

    private ModelServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new ModelServiceImpl(
                userLookupService,
                modelRepository,
                objectStorageService,
                bindingRepository,
                resultRepository,
                workspaceAuthorizationService,
                artifactWriter,
                artifactReader,
                deletionQueue,
                environments,
                false);
        lenient().when(environments.register(any())).thenAnswer(call -> call.<BundleInspection.Environment>getArgument(0).key());
        lenient().when(workspaceAuthorizationService.requireCurrent(eq(3L), any(PermissionKey[].class))).thenReturn(organization());
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
        assertEquals(1L, page.items().getFirst().fieldCount());
        assertEquals(1L, page.items().getFirst().reportCount());
    }

    @Test
    void createModel_ThrowsWhenNameExistsInOrganization() {
        lenient().when(userLookupService.requireById(3L)).thenReturn(user());
        when(modelRepository.existsByNameAndOrganizationId("demo", 41L)).thenReturn(true);

        assertThrows(ModelAlreadyExistsException.class, () -> service.requireCreatable(3L, "demo"));
        assertThrows(ModelAlreadyExistsException.class,
                () -> service.createModel(3L, "demo", inspection(List.of()), TestFixtures.artifact("x".getBytes()), "sha-x", "application/octet-stream"));
    }

    @Test
    void renameModel_UpdatesNameWhenUnique() {
        Model model = model("old");
        when(modelRepository.findByIdAndOrganizationId(9L, 41L)).thenReturn(java.util.Optional.of(model));
        when(modelRepository.existsByNameAndOrganizationIdAndIdNot("new", 41L, 9L)).thenReturn(false);
        lenient().when(userLookupService.requireById(3L)).thenReturn(user());
        when(modelRepository.save(model)).thenReturn(model);

        assertEquals("new", service.renameModel(3L, 9L, " new ", 0L).getName());
        assertEquals("Alice", model.getUpdatedBy().getFullName());
    }

    @Test
    void archiveModel_SetsArchivedAt() {
        Model model = model("demo");
        when(modelRepository.findByIdAndOrganizationId(9L, 41L)).thenReturn(java.util.Optional.of(model));
        lenient().when(userLookupService.requireById(3L)).thenReturn(user());
        when(modelRepository.save(model)).thenReturn(model);

        service.archiveModel(3L, 9L, 0L);

        org.junit.jupiter.api.Assertions.assertNotNull(model.getArchivedAt());
    }

    @Test
    void deleteModel_BlocksWhenModelIsReferenced() {
        when(modelRepository.findByIdAndOrganizationId(9L, 41L)).thenReturn(java.util.Optional.of(model("demo")));
        when(bindingRepository.existsByModelId(9L)).thenReturn(true);

        assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> service.deleteModel(3L, 9L, 0L));
        verify(modelRepository, never()).delete(any());
    }

    @Test
    void deleteModel_QueuesStoredObjectBeforeDeletingDatabaseRecord() {
        Model model = model("demo");
        model.setStorageBucket("models");
        model.setStorageObjectKey("organizations/41/models/9/artifacts/hash/model.pkl");
        model.setStorageVersionId("version-7");
        when(modelRepository.findByIdAndOrganizationId(9L, 41L)).thenReturn(java.util.Optional.of(model));

        service.deleteModel(3L, 9L, 0L);

        verify(deletionQueue).enqueue("models", model.getStorageObjectKey(), "version-7");
        verify(modelRepository).delete(model);
        verify(objectStorageService, never()).delete(anyString(), anyString(), any());
        verify(environments).releaseWhenUnused(model.getEnvironmentKey());
    }

    @Test
    void renameModelRejectsASequentiallyStaleClientVersion() {
        Model model = model("current");
        model.setVersion(4L);
        when(modelRepository.findByIdAndOrganizationId(9L, 41L)).thenReturn(java.util.Optional.of(model));

        var error = assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> service.renameModel(3L, 9L, "stale", 3L));

        assertEquals(org.springframework.http.HttpStatus.CONFLICT, error.getStatusCode());
        verify(modelRepository, never()).save(any());
    }

    @Test
    void duplicateModel_CopiesStoredObject() {
        Model source = model("demo");
        source.setStorageBucket("bucket");
        source.setStorageObjectKey("old-key");
        lenient().when(userLookupService.requireById(3L)).thenReturn(user());
        when(modelRepository.findByIdAndOrganizationId(9L, 41L)).thenReturn(java.util.Optional.of(source));
        when(modelRepository.existsByNameAndOrganizationId("copy", 41L)).thenReturn(false);
        source.setArtifactSha256("sha-source");
        source.setModelSizeBytes(5L);
        when(artifactReader.source(dev.ulloasp.mlsuite.storage.ModelArtifactReference.of(source)))
                .thenReturn(TestFixtures.artifact("bytes".getBytes()));
        org.mockito.Mockito.doAnswer(invocation -> {
            Model copy = invocation.getArgument(0);
            copy.setStorageBucket("bucket");
            copy.setStorageObjectKey("new-key");
            return null;
        }).when(artifactWriter).storeAndAttach(any(Model.class), any(ArtifactSource.class), eq("sha-source"),
                eq("application/octet-stream"));
        when(modelRepository.saveAndFlush(any(Model.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Model copy = service.duplicateModel(3L, 9L, "copy");

        assertEquals("copy", copy.getName());
        assertEquals("new-key", copy.getStorageObjectKey());
        assertEquals("Alice", copy.getUpdatedBy().getFullName());
    }

    @Test
    void createModel_StoresObjectAndPersistsModel() throws Exception {
        lenient().when(userLookupService.requireById(3L)).thenReturn(user());
        when(modelRepository.existsByNameAndOrganizationId("demo", 41L)).thenReturn(false);
        when(modelRepository.saveAndFlush(any(Model.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Model result = service.createModel(3L, "demo",
                inspection(List.of(Map.of("feature", "age", "importance", 62.5))), TestFixtures.artifact("x".getBytes()), "sha-x", "application/octet-stream");

        assertEquals("demo", result.getName());
        assertEquals("model.mlbundle", result.getFileName());
        assertEquals("rf", result.getSpecificType());
        assertEquals(Map.of("fields", List.of(), "reports", List.of()), result.getInputSchema());
        assertEquals(Map.of("writer_version", "0.1.0a3"), result.getBundleManifest());
        assertEquals(List.of(Map.of("feature", "age", "importance", 62.5)), result.getFeatureImportances());
        // The row is written once, naming the object already stored.
        var order = inOrder(modelRepository, artifactWriter);
        order.verify(artifactWriter).storeAndAttach(any(), any(), eq("sha-x"), eq("application/octet-stream"));
        order.verify(modelRepository).saveAndFlush(any(Model.class));
    }

    @Test
    void createModel_StoresAModelWhoseBundleHasNoImportances() throws Exception {
        lenient().when(userLookupService.requireById(3L)).thenReturn(user());
        when(modelRepository.existsByNameAndOrganizationId("demo", 41L)).thenReturn(false);
        when(modelRepository.saveAndFlush(any(Model.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Model result = service.createModel(3L, "demo", inspection(null), TestFixtures.artifact("x".getBytes()), "sha-x", "application/octet-stream");

        assertNull(result.getFeatureImportances());
        assertEquals(Map.of("writer_version", "0.1.0a3"), result.getBundleManifest());
    }

    @Test
    void createModel_RunsABundleWithoutALockAtOnceInTheLegacyEnvironment() {
        lenient().when(userLookupService.requireById(3L)).thenReturn(user());
        when(modelRepository.saveAndFlush(any(Model.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Model result = service.createModel(3L, "demo", inspection(null), TestFixtures.artifact("x".getBytes()), "sha-x",
                "application/octet-stream");

        assertEquals("legacy", result.getEnvironmentKey());
        assertEquals(ModelRuntimeState.READY, result.getRuntimeState());
    }

    @Test
    void createModel_PreparesTheEnvironmentABundleWithALockNeeds() {
        lenient().when(userLookupService.requireById(3L)).thenReturn(user());
        when(modelRepository.saveAndFlush(any(Model.class))).thenAnswer(invocation -> invocation.getArgument(0));
        BundleInspection.Environment locked = new BundleInspection.Environment("e".repeat(64), "i".repeat(64), "0.3.0",
                "3.14.7", List.of(Map.of("name", "scikit-learn", "version", "1.9.1")), "lock-version = \"1.0\"");
        BundleInspection inspection = new BundleInspection("clf", "rf", "model.mlbundle",
                Map.of("fields", List.of(), "reports", List.of()), Map.of("writer_version", "0.3.0"), null, locked);

        Model result = service.createModel(3L, "demo", inspection, TestFixtures.artifact("x".getBytes()), "sha-x",
                "application/octet-stream");

        verify(environments).register(locked);
        assertEquals("e".repeat(64), result.getEnvironmentKey());
        assertEquals(ModelRuntimeState.PREPARING, result.getRuntimeState());
    }

    @Test
    void createModel_DeletesStoredObjectWhenPersistFails() throws Exception {
        RuntimeException failure = new RuntimeException("persist failed");
        lenient().when(userLookupService.requireById(3L)).thenReturn(user());
        when(modelRepository.existsByNameAndOrganizationId("demo", 41L)).thenReturn(false);
        when(modelRepository.saveAndFlush(any(Model.class))).thenThrow(failure);
        org.mockito.Mockito.doAnswer(invocation -> {
            Model model = invocation.getArgument(0);
            model.setStorageBucket("bucket");
            model.setStorageObjectKey("key");
            model.setStorageVersionId("v1");
            return null;
        }).when(artifactWriter).storeAndAttach(any(Model.class), any(ArtifactSource.class), eq("sha-x"),
                eq("application/octet-stream"));

        assertEquals(failure, assertThrows(RuntimeException.class, () -> service.createModel(3L, "demo",
                inspection(List.of()), TestFixtures.artifact("x".getBytes()), "sha-x", "application/octet-stream")));
        verify(objectStorageService).delete("bucket", "key", "v1");
    }

    @Test
    void createModel_WritesNoRowWhenTheArtifactCannotBeStored() {
        ObjectStorageException failure = new ObjectStorageException("store failed");
        lenient().when(userLookupService.requireById(3L)).thenReturn(user());
        when(artifactWriter.storeAndAttach(any(Model.class), any(ArtifactSource.class), eq("sha-x"),
                eq("application/octet-stream"))).thenThrow(failure);

        assertEquals(failure, assertThrows(ObjectStorageException.class, () -> service.createModel(3L, "demo",
                inspection(List.of()), TestFixtures.artifact("x".getBytes()), "sha-x", "application/octet-stream")));
        verify(modelRepository, never()).saveAndFlush(any());
        verify(objectStorageService, never()).delete(any(), any(), any());
    }

    private static BundleInspection inspection(List<Map<String, Object>> importances) {
        return new BundleInspection("clf", "rf", "model.mlbundle", Map.of("fields", List.of(), "reports", List.of()),
                Map.of("writer_version", "0.1.0a3"), importances, LEGACY);
    }

    private static final BundleInspection.Environment LEGACY =
            new BundleInspection.Environment("legacy", null, null, null, List.of(), null);

    private User user() {
        User user = new User();
        user.setId(3L);
        user.setUsername("alice");
        user.setFullName("Alice");
        user.setEmail("alice@example.com");
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
        model.setVersion(0L);
        model.setType("classifier");
        model.setSpecificType("random_forest");
        model.setFileName("model.pkl");
        model.setUser(user());
        model.setInputSchema(Map.of(
                "fields", List.of(Map.of("id", "age")),
                "reports", List.of(Map.of("id", "prediction"))));
        model.setCreatedAt(OffsetDateTime.now());
        model.setUpdatedAt(OffsetDateTime.now());
        return model;
    }
}
