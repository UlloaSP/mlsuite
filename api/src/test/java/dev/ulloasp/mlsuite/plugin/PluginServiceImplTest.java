package dev.ulloasp.mlsuite.plugin;

import dev.ulloasp.mlsuite.support.TestFixtures;
import static org.mockito.Mockito.never;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.lenient;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.mock;

import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

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
import dev.ulloasp.mlsuite.storage.StoredObject;
import dev.ulloasp.mlsuite.storage.StorageDeletionQueue;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.principal.domain.model.Principal;
import dev.ulloasp.mlsuite.principal.domain.model.PrincipalKind;
import org.springframework.test.util.ReflectionTestUtils;
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

    private final ObjectMapper objectMapper = new JsonMapper();
    private PluginServiceImpl service;
    private Map<String, byte[]> objects;

    @BeforeEach
    void setUp() throws Exception {
        StorageProperties storageProperties = new StorageProperties();
        storageProperties.setBucket("bucket");
        PluginObjectReader reader = new PluginObjectReader(
                objectStorageService, storageProperties, objectMapper, pluginMetadataRepository);
        service = new PluginServiceImpl(
                objectStorageService,
                storageProperties,
                objectMapper,
                userLookupService,
                workspaceAuthorizationService,
                pluginMetadataRepository,
                deletionQueue,
                reader,
                organizations, mock(AuditLogService.class), TestFixtures.principals());
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

    /** Each plugin's row pins version v1 of its object and that object's SHA-256. */
    private void prepareStoredObjects() {
        lenient().when(pluginMetadataRepository.findByPublicIdAndOrganizationId(anyString(), eq(41L)))
                .thenAnswer(invocation -> Optional.of(row(invocation.getArgument(0))));
        when(objectStorageService.loadOptional(eq("bucket"), anyString(), eq("v1")))
                .thenAnswer(invocation -> Optional.ofNullable(objects.get(invocation.getArgument(1))));
    }

    private PluginMetadata row(String id) {
        String key = "organizations/41/plugins/items/" + id + ".json";
        PluginMetadata row = new PluginMetadata();
        row.setPublicId(id);
        row.setObjectKey(key);
        row.setStorageVersionId("v1");
        row.setStorageBucket("bucket");
        byte[] stored = objects.getOrDefault(key, new byte[0]);
        row.setSizeBytes(stored.length);
        row.setSha256(ArtifactHash.sha256(stored));
        row.setUpdatedBy(TestFixtures.principal(new User("alice", "alice@example.com", "x", "Alice", SystemRole.USER)));
        return row;
    }

    /** The page the database answers with: these rows, in this order, out of {@code total} matching ones. */
    private void catalogAnswers(long total, String... ids) {
        List<PluginMetadata> rows = Arrays.stream(ids).map(this::row).toList();
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
    void list_NamesAnAuthorWhoseAccountIsGoneAsTheirPrincipalDoes() {
        prepareStoredObjects();
        PluginMetadata row = row("report");
        Principal gone = new Principal();
        ReflectionTestUtils.setField(gone, "kind", PrincipalKind.USER);
        ReflectionTestUtils.setField(gone, "formerLabel", "Deleted user");
        row.setUpdatedBy(gone);
        when(pluginMetadataRepository.findCatalogPage(eq(41L), anyString(), anyString(), anyString(), any()))
                .thenAnswer(invocation -> new PageImpl<>(List.of(row), invocation.getArgument(4), 1));

        PluginDto listed = service.list(7L, 0, 10, "all", "", "updated").items().getFirst();

        assertEquals("Deleted user", listed.updatedByName());
        assertNull(listed.updatedByEmail());
    }

    @Test
    void stats_CountsPluginTypesSeparatelyFromPagedList() {
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
        PageDto<PluginDto> page = service.list(7L, 0, 10, "all", null, "name");

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

    @Test
    void aFileThatDefinesNoFieldOrReportIsNotStored() {
        User user = new User();
        user.setId(7L);
        lenient().when(userLookupService.requireById(7L)).thenReturn(user);
        MockMultipartFile program = new MockMultipartFile("file", "x.exe", "application/octet-stream", "MZ".getBytes());

        IllegalArgumentException refused = assertThrows(IllegalArgumentException.class, () -> service.upload(7L, program));

        assertTrue(refused.getMessage().startsWith("This file is not a plugin"));
        verify(objectStorageService, never()).store(anyString(), anyString(), anyString(), any(byte[].class));
    }

    private byte[] bytes(StoredPlugin plugin) throws Exception {
        return objectMapper.writeValueAsBytes(plugin);
    }

    private StoredPlugin plugin(String id, String fileName, String source) {
        return new StoredPlugin(id, fileName, "application/typescript", source.length(), now(), now(), source);
    }

    private OffsetDateTime now() {
        return OffsetDateTime.parse("2026-06-14T12:00:00Z");
    }
}
