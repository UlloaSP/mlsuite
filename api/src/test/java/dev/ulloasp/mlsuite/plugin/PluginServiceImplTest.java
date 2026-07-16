package dev.ulloasp.mlsuite.plugin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.plugin.adapter.out.persistence.repository.PluginMetadataRepository;
import dev.ulloasp.mlsuite.plugin.application.dto.PluginPageDto;
import dev.ulloasp.mlsuite.plugin.application.service.PluginServiceImpl;
import dev.ulloasp.mlsuite.plugin.domain.model.StoredPlugin;
import dev.ulloasp.mlsuite.storage.ObjectStorageService;
import dev.ulloasp.mlsuite.storage.StorageProperties;
import dev.ulloasp.mlsuite.storage.StoredObjectItem;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@ExtendWith(MockitoExtension.class)
class PluginServiceImplTest {

    @Mock
    private ObjectStorageService objectStorageService;
    @Mock
    private UserLookupService userLookupService;
    @Mock
    private WorkspaceAccessService workspaceAccessService;
    @Mock
    private WorkspaceAuthorizationService workspaceAuthorizationService;
    @Mock
    private PluginMetadataRepository pluginMetadataRepository;

    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    private PluginServiceImpl service;
    private Map<String, byte[]> objects;

    @BeforeEach
    void setUp() throws Exception {
        StorageProperties storageProperties = new StorageProperties();
        storageProperties.setBucket("bucket");
        service = new PluginServiceImpl(
                objectStorageService,
                storageProperties,
                objectMapper,
                userLookupService,
                workspaceAccessService,
                workspaceAuthorizationService,
                pluginMetadataRepository);
        objects = Map.of(
                "organizations/41/plugins/items/field.json", bytes(plugin(
                        "field", "alpha.ts", "export default defineFieldKind({ kind: \"alpha-field\" });")),
                "organizations/41/plugins/items/report.json", bytes(plugin(
                        "report", "zeta.ts", "export default defineReportKind({ kind: \"zeta-report\" });")),
                "organizations/41/plugins/items/invalid.json", bytes(plugin(
                        "invalid", "invalid.ts", "not a plugin")));
        Organization organization = new Organization();
        organization.setId(41L);
        when(workspaceAccessService.requireCurrentOrganization(7L)).thenReturn(organization);
        when(objectStorageService.list("organizations/41/plugins/items/"))
                .thenReturn(objects.keySet().stream()
                        .map(key -> new StoredObjectItem("bucket", key, objects.get(key).length, "etag", now()))
                        .toList());
        when(objectStorageService.loadOptional(eq("bucket"), anyString()))
                .thenAnswer(invocation -> Optional.ofNullable(objects.get(invocation.getArgument(1))));
    }

    @Test
    void list_FiltersSearchesAndPaginatesPlugins() {
        PluginPageDto page = service.list(7L, 0, 10, "report", "zeta", "updated");

        assertEquals(1, page.items().size());
        assertEquals("zeta-report", page.items().getFirst().kind());
        assertEquals("report", page.items().getFirst().pluginType());
        assertEquals("Alice", page.items().getFirst().updatedByName());
        assertEquals(1, page.totalItems());
    }

    @Test
    void stats_CountsPluginTypesSeparatelyFromPagedList() {
        var stats = service.stats(7L);

        assertEquals(1, stats.fieldPlugins());
        assertEquals(1, stats.reportPlugins());
    }

    @Test
    void list_SortsByBackendDisplayName() {
        PluginPageDto page = service.list(7L, 0, 10, "all", "", "name");

        assertEquals(List.of("alpha-field", "invalid.ts", "zeta-report"),
                page.items().stream().map(item -> item.kind() == null ? item.fileName() : item.kind()).toList());
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
