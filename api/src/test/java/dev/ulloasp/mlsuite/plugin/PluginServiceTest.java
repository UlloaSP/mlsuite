package dev.ulloasp.mlsuite.plugin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import com.fasterxml.jackson.databind.ObjectMapper;

import dev.ulloasp.mlsuite.plugin.dtos.PluginDto;
import dev.ulloasp.mlsuite.plugin.exceptions.PluginNotFoundException;
import dev.ulloasp.mlsuite.plugin.services.PluginServiceImpl;
import dev.ulloasp.mlsuite.storage.ObjectStorageService;
import dev.ulloasp.mlsuite.storage.StorageProperties;
import dev.ulloasp.mlsuite.storage.StoredObject;
import dev.ulloasp.mlsuite.storage.StoredObjectItem;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;
import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.service.UserLookupService;

@ExtendWith(MockitoExtension.class)
class PluginServiceTest {

    private static final String BUCKET = "mlsuite-models";
    private static final String NEW_PREFIX = "users/7/plugins";
    private static final String FIELD_PREFIX = "custom-fields/github/user-1";
    private static final String REPORT_PREFIX = "custom-reports/github/user-1";
    private static final String EXPLANATION_PREFIX = "custom-explanations/github/user-1";

    @Mock
    private ObjectStorageService objectStorageService;

    @Mock
    private StorageProperties storageProperties;

    @Mock
    private UserLookupService userLookupService;

    private PluginServiceImpl service;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper().findAndRegisterModules();
        service = new PluginServiceImpl(objectStorageService, storageProperties, objectMapper, userLookupService);
        when(storageProperties.getBucket()).thenReturn(BUCKET);
        when(userLookupService.requireById(7L)).thenReturn(user());
    }

    @Test
    void upload_WritesUsingPluginPrefix() {
        MockMultipartFile file = new MockMultipartFile("file", "plugin.ts", "application/typescript",
                "export default {}".getBytes(StandardCharsets.UTF_8));
        when(objectStorageService.store(anyString(), anyString(), anyString(), any(byte[].class)))
                .thenReturn(new StoredObject(BUCKET, "plugins", file.getSize(), "etag-1"));
        when(objectStorageService.loadOptional(anyString(), anyString())).thenReturn(Optional.empty());

        PluginDto result = service.upload(7L, file);

        assertEquals("plugin.ts", result.fileName());
        assertFalse(result.active());
    }

    @Test
    void list_FallsBackToLegacyRootsAndCombinesActivePointers() throws Exception {
        OffsetDateTime now = OffsetDateTime.of(2026, 4, 17, 12, 0, 0, 0, ZoneOffset.UTC);
        byte[] fieldActive = objectMapper.writeValueAsBytes(new ActivePointer("field-1", now));
        byte[] reportActive = objectMapper.writeValueAsBytes(new ActivePointer("report-1", now));
        byte[] fieldItem = objectMapper.writeValueAsBytes(new StoredPluginRecord(
                "field-1", "field.ts", "application/typescript", 10, now, now, "field"));
        byte[] reportItem = objectMapper.writeValueAsBytes(new StoredPluginRecord(
                "report-1", "report.ts", "application/typescript", 10, now, now, "report"));
        byte[] explanationItem = objectMapper.writeValueAsBytes(new StoredPluginRecord(
                "exp-1", "exp.ts", "application/typescript", 10, now, now, "exp"));

        when(objectStorageService.loadOptional(BUCKET, NEW_PREFIX + "/state.json")).thenReturn(Optional.empty());
        when(objectStorageService.loadOptional(BUCKET, FIELD_PREFIX + "/active.json")).thenReturn(Optional.of(fieldActive));
        when(objectStorageService.loadOptional(BUCKET, REPORT_PREFIX + "/active.json")).thenReturn(Optional.of(reportActive));
        when(objectStorageService.loadOptional(BUCKET, EXPLANATION_PREFIX + "/active.json")).thenReturn(Optional.empty());
        when(objectStorageService.list(NEW_PREFIX + "/items/")).thenReturn(List.of());
        when(objectStorageService.list(FIELD_PREFIX + "/items/"))
                .thenReturn(List.of(new StoredObjectItem(BUCKET, FIELD_PREFIX + "/items/field-1.json", 10L, "etag", now)));
        when(objectStorageService.list(REPORT_PREFIX + "/items/"))
                .thenReturn(List.of(new StoredObjectItem(BUCKET, REPORT_PREFIX + "/items/report-1.json", 10L, "etag", now)));
        when(objectStorageService.list(EXPLANATION_PREFIX + "/items/"))
                .thenReturn(List.of(new StoredObjectItem(BUCKET, EXPLANATION_PREFIX + "/items/exp-1.json", 10L, "etag", now)));
        when(objectStorageService.loadOptional(BUCKET, FIELD_PREFIX + "/items/field-1.json")).thenReturn(Optional.of(fieldItem));
        when(objectStorageService.loadOptional(BUCKET, REPORT_PREFIX + "/items/report-1.json")).thenReturn(Optional.of(reportItem));
        when(objectStorageService.loadOptional(BUCKET, EXPLANATION_PREFIX + "/items/exp-1.json"))
                .thenReturn(Optional.of(explanationItem));

        List<PluginDto> result = service.list(7L);

        assertEquals(3, result.size());
        assertTrue(result.stream().anyMatch(item -> item.id().equals("field-1") && item.active()));
        assertTrue(result.stream().anyMatch(item -> item.id().equals("report-1") && item.active()));
        assertTrue(result.stream().anyMatch(item -> item.id().equals("exp-1") && !item.active()));
    }

    @Test
    void activateDeleteAndDeactivateAll_UseNewStateAndCleanLegacyObjects() throws Exception {
        OffsetDateTime now = OffsetDateTime.of(2026, 4, 17, 12, 0, 0, 0, ZoneOffset.UTC);
        byte[] pluginBytes = objectMapper.writeValueAsBytes(new StoredPluginRecord(
                "item-7", "plugin.ts", "application/typescript", 20, now, now, "src"));
        when(objectStorageService.loadOptional(BUCKET, NEW_PREFIX + "/items/item-7.json")).thenReturn(Optional.empty());
        when(objectStorageService.loadOptional(BUCKET, FIELD_PREFIX + "/items/item-7.json")).thenReturn(Optional.of(pluginBytes));
        when(objectStorageService.loadOptional(BUCKET, NEW_PREFIX + "/state.json")).thenReturn(Optional.empty());
        when(objectStorageService.loadOptional(BUCKET, FIELD_PREFIX + "/active.json")).thenReturn(Optional.empty());
        when(objectStorageService.loadOptional(BUCKET, REPORT_PREFIX + "/active.json")).thenReturn(Optional.empty());
        when(objectStorageService.loadOptional(BUCKET, EXPLANATION_PREFIX + "/active.json")).thenReturn(Optional.empty());

        PluginDto active = service.activate(7L, "item-7");
        service.delete(7L, "item-7");
        service.deactivateAll(7L);

        assertTrue(active.active());
        verify(objectStorageService).delete(BUCKET, NEW_PREFIX + "/items/item-7.json");
        verify(objectStorageService).delete(BUCKET, FIELD_PREFIX + "/items/item-7.json");
        verify(objectStorageService).delete(BUCKET, REPORT_PREFIX + "/items/item-7.json");
        verify(objectStorageService).delete(BUCKET, EXPLANATION_PREFIX + "/items/item-7.json");
        verify(objectStorageService, atLeastOnce()).delete(BUCKET, NEW_PREFIX + "/state.json");
    }

    @Test
    void activate_ThrowsWhenPluginMissing() {
        when(objectStorageService.loadOptional(BUCKET, NEW_PREFIX + "/items/missing.json")).thenReturn(Optional.empty());
        when(objectStorageService.loadOptional(BUCKET, FIELD_PREFIX + "/items/missing.json")).thenReturn(Optional.empty());
        when(objectStorageService.loadOptional(BUCKET, REPORT_PREFIX + "/items/missing.json")).thenReturn(Optional.empty());
        when(objectStorageService.loadOptional(BUCKET, EXPLANATION_PREFIX + "/items/missing.json")).thenReturn(Optional.empty());

        assertThrows(PluginNotFoundException.class, () -> service.activate(7L, "missing"));
    }

    private User user() {
        User user = new User();
        user.setId(7L);
        user.setOauthProvider(OAuthProvider.GITHUB);
        user.setOauthId("user-1");
        return user;
    }

    private record StoredPluginRecord(
            String id,
            String fileName,
            String contentType,
            long sizeBytes,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt,
            String source) {
    }

    private record ActivePointer(String id, OffsetDateTime updatedAt) {
    }
}
