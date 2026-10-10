package dev.ulloasp.mlsuite.plugin;

import static org.mockito.Mockito.lenient;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.plugin.adapter.out.persistence.repository.PluginMetadataRepository;
import dev.ulloasp.mlsuite.plugin.application.dto.PluginDto;
import dev.ulloasp.mlsuite.util.PageDto;
import dev.ulloasp.mlsuite.plugin.application.service.PluginServiceImpl;
import dev.ulloasp.mlsuite.plugin.application.service.PluginObjectReader;
import dev.ulloasp.mlsuite.plugin.domain.model.PluginMetadata;
import dev.ulloasp.mlsuite.plugin.domain.model.StoredPlugin;
import dev.ulloasp.mlsuite.storage.ArtifactHash;
import dev.ulloasp.mlsuite.storage.ObjectStorageService;
import dev.ulloasp.mlsuite.storage.StorageProperties;
import dev.ulloasp.mlsuite.storage.StoredObjectItem;
import dev.ulloasp.mlsuite.storage.StoredObject;
import dev.ulloasp.mlsuite.storage.StoredObjectMetadata;
import dev.ulloasp.mlsuite.storage.StorageDeletionQueue;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@ExtendWith(MockitoExtension.class)
class PluginServiceImplTest {

    @Mock
    private ObjectStorageService objectStorageService;
    @Mock
    private UserLookupService userLookupService;
    @Mock
    private WorkspaceAuthorizationService workspaceAuthorizationService;
    @Mock
    private PluginMetadataRepository pluginMetadataRepository;
    @Mock
    private StorageDeletionQueue deletionQueue;
    @Mock
    private OrganizationRepository organizations;

    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    private PluginServiceImpl service;
    private Map<String, byte[]> objects;

    @BeforeEach
    void setUp() throws Exception {
        StorageProperties storageProperties = new StorageProperties();
        storageProperties.setBucket("bucket");
        PluginObjectReader reader = new PluginObjectReader(
                objectStorageService, storageProperties, objectMapper, pluginMetadataRepository, deletionQueue,
                organizations);
        service = new PluginServiceImpl(
                objectStorageService,
                storageProperties,
                objectMapper,
                userLookupService,
                workspaceAuthorizationService,
                pluginMetadataRepository,
                deletionQueue,
                reader,
                organizations);
        objects = Map.of(
                "organizations/41/plugins/items/field.json", bytes(plugin(
                        "field", "alpha.ts", "export default defineFieldKind({ kind: \"alpha-field\" });")),
                "organizations/41/plugins/items/report.json", bytes(plugin(
                        "report", "zeta.ts", "export default defineReportKind<Config, Payload>({ kind: \"zeta-report\" });")),
                "organizations/41/plugins/items/invalid.json", bytes(plugin(
                        "invalid", "invalid.ts", "not a plugin")));
        Organization organization = new Organization();
        organization.setId(41L);
        lenient().when(workspaceAuthorizationService.requireCurrent(eq(7L), any(PermissionKey[].class))).thenReturn(organization);
        lenient().when(organizations.lockById(41L)).thenReturn(Optional.of(organization));
    }

    private void prepareStoredObjects() {
        when(objectStorageService.list("organizations/41/plugins/items/"))
                .thenReturn(objects.keySet().stream()
                        .map(key -> new StoredObjectItem("bucket", key, objects.get(key).length, "etag", now()))
                        .toList());
        when(objectStorageService.inspectOptional(eq("bucket"), anyString(), any()))
                .thenAnswer(invocation -> {
                    String key = invocation.getArgument(1);
                    byte[] bytes = objects.get(key);
                    return bytes == null ? Optional.empty() : Optional.of(
                            new StoredObjectMetadata("bucket", key, bytes.length, "etag", "v1", null));
                });
        when(objectStorageService.loadOptional(eq("bucket"), anyString(), any()))
                .thenAnswer(invocation -> Optional.ofNullable(objects.get(invocation.getArgument(1))));
    }

    /** The page the database answers with: these rows, in this order, out of {@code total} matching ones. */
    private void catalogAnswers(long total, String... ids) {
        List<PluginMetadata> rows = Arrays.stream(ids).map(id -> {
            PluginMetadata row = new PluginMetadata();
            row.setId(id);
            return row;
        }).toList();
        when(pluginMetadataRepository.findCatalogPage(eq(41L), anyString(), anyString(), anyString(), any()))
                .thenAnswer(invocation -> new PageImpl<>(rows, invocation.getArgument(4), total));
    }

    @Test
    void list_FiltersSearchesAndPaginatesPlugins() {
        prepareStoredObjects();
        catalogAnswers(21, "report");
        PageDto<PluginDto> page = service.list(7L, 2, 10, "report", " Zeta_ ", "updated");

        assertEquals(1, page.items().size());
        assertEquals("zeta-report", page.items().getFirst().kind());
        assertEquals("report", page.items().getFirst().pluginType());
        assertEquals("Alice", page.items().getFirst().updatedByName());
        assertEquals(21, page.totalItems());
        assertEquals(2, page.page());
        assertEquals(10, page.size());
        // The search reaches the query as a lower-case literal pattern, and the page as it was asked.
        verify(pluginMetadataRepository).findCatalogPage(41L, "report", "%zeta!_%", "updated", PageRequest.of(2, 10));
    }

    @Test
    void indexesLegacyObjectsOnceAndLoadsOnlyTheRequestedPageAfterwards() {
        prepareStoredObjects();
        catalogAnswers(30, "field");

        assertEquals(1, service.list(7L, 0, 1, "all", "", "updated").items().size());
        assertEquals(1, service.list(7L, 1, 1, "all", "", "updated").items().size());

        verify(objectStorageService).list("organizations/41/plugins/items/");
        verify(organizations).save(any());
        verify(objectStorageService, times(5)).loadOptional(eq("bucket"), anyString(), eq("v1"));
    }

    @Test
    void stats_CountsPluginTypesSeparatelyFromPagedList() {
        prepareStoredObjects();
        when(pluginMetadataRepository.countByOrganizationIdAndPluginType(41L, "field")).thenReturn(1L);
        when(pluginMetadataRepository.countByOrganizationIdAndPluginType(41L, "report")).thenReturn(1L);
        var stats = service.stats(7L);

        assertEquals(1, stats.fieldPlugins());
        assertEquals(1, stats.reportPlugins());
    }

    @Test
    void list_SortsByBackendDisplayName() {
        prepareStoredObjects();
        catalogAnswers(3, "report", "field", "invalid");
        PageDto<PluginDto> page = service.list(7L, 0, 10, "unknown", null, "name");

        // The database orders the page; the service keeps that order and asks for it by name.
        assertEquals(List.of("zeta-report", "alpha-field", "invalid.ts"),
                page.items().stream().map(item -> item.kind() == null ? item.fileName() : item.kind()).toList());
        verify(pluginMetadataRepository).findCatalogPage(41L, "all", "%%", "name", PageRequest.of(0, 10));
    }

    @Test
    void list_SkipsARowWithoutAStoredObjectInsteadOfFailingThePage() {
        prepareStoredObjects();
        catalogAnswers(2, "orphan", "field");
        PageDto<PluginDto> page = service.list(7L, 0, 10, "all", "", "updated");

        assertEquals(List.of("field"), page.items().stream().map(PluginDto::id).toList());
    }

    @Test
    void listEstablishesStoredJsonIdentityWhenMetadataIsMissing() {
        prepareStoredObjects();
        catalogAnswers(0);
        service.list(7L, 0, 10, "all", "", "name");

        ArgumentCaptor<PluginMetadata> captor = ArgumentCaptor.forClass(PluginMetadata.class);
        verify(pluginMetadataRepository, atLeastOnce()).save(captor.capture());
        PluginMetadata field = captor.getAllValues().stream()
                .filter(item -> "field".equals(item.getId()))
                .findFirst()
                .orElseThrow();
        byte[] content = objects.get("organizations/41/plugins/items/field.json");
        assertEquals(content.length, field.getSizeBytes());
        assertEquals(ArtifactHash.sha256(content), field.getSha256());
        assertEquals("v1", field.getStorageVersionId());
    }

    @Test
    void deletedPluginStaysAbsentWhileObjectDeletionIsQueued() {
        prepareStoredObjects();
        // The page was read before the deletion removed the plugin's row.
        catalogAnswers(3, "field", "invalid", "report");
        User user = new User();
        user.setId(7L);
        lenient().when(userLookupService.requireById(7L)).thenReturn(user);
        when(deletionQueue.isDeletionRequested(
                "bucket", "organizations/41/plugins/items/field.json")).thenReturn(false, true);

        service.delete(7L, "field");
        PageDto<PluginDto> page = service.list(7L, 0, 10, "all", "", "name");

        assertEquals(List.of("invalid", "report"), page.items().stream().map(PluginDto::id).toList());
        verify(deletionQueue).enqueue("bucket", "organizations/41/plugins/items/field.json", null);
    }

    @Test
    void failedUploadCommitDeletesTheExactStoredVersion() {
        User user = new User();
        user.setId(7L);
        lenient().when(userLookupService.requireById(7L)).thenReturn(user);
        when(objectStorageService.store(anyString(), anyString(), eq("application/json"), any(byte[].class)))
                .thenAnswer(invocation -> new StoredObject(
                        "bucket", invocation.getArgument(0), 10, "etag", "version-1", "sha"));
        MockMultipartFile file = new MockMultipartFile(
                "file", "field.ts", "application/typescript",
                "export default defineFieldKind({ kind: \"field\" });".getBytes());

        TransactionSynchronizationManager.initSynchronization();
        try {
            var uploaded = service.upload(7L, file);
            TransactionSynchronizationManager.getSynchronizations().forEach(
                    synchronization -> synchronization.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK));

            verify(objectStorageService).delete(
                    "bucket", "organizations/41/plugins/items/" + uploaded.id() + ".json", "version-1");
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    private byte[] bytes(StoredPlugin plugin) throws Exception {
        return objectMapper.writeValueAsBytes(plugin);
    }

    private StoredPlugin plugin(String id, String fileName, String source) {
        return new StoredPlugin(id, fileName, "application/typescript", source.length(), now(), now(),
                "Alice", "alice@example.com", null, source);
    }

    private OffsetDateTime now() {
        return OffsetDateTime.parse("2026-06-14T12:00:00Z");
    }
}
