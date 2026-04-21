package dev.ulloasp.mlsuite.customexplanation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
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

import dev.ulloasp.mlsuite.customexplanation.dtos.CustomExplanationDto;
import dev.ulloasp.mlsuite.customexplanation.services.CustomExplanationServiceImpl;
import dev.ulloasp.mlsuite.storage.ObjectStorageService;
import dev.ulloasp.mlsuite.storage.StorageProperties;
import dev.ulloasp.mlsuite.storage.StoredObject;
import dev.ulloasp.mlsuite.storage.StoredObjectItem;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;
import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.service.UserLookupService;

@ExtendWith(MockitoExtension.class)
class CustomExplanationServiceTest {

    private static final String BUCKET = "mlsuite-models";
    private static final String NEW_PREFIX = "users/7/custom-explanations";
    private static final String LEGACY_PREFIX = "custom-explanations/github/user-1";

    @Mock
    private ObjectStorageService objectStorageService;

    @Mock
    private StorageProperties storageProperties;

    @Mock
    private UserLookupService userLookupService;

    private CustomExplanationServiceImpl service;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper().findAndRegisterModules();
        service = new CustomExplanationServiceImpl(objectStorageService, storageProperties, objectMapper,
                userLookupService);
        when(storageProperties.getBucket()).thenReturn(BUCKET);
        when(userLookupService.requireById(7L)).thenReturn(user());
    }

    @Test
    void upload_WritesUsingInternalUserPrefix() {
        MockMultipartFile file = new MockMultipartFile("file", "explain.ts", "application/typescript",
                "export default {}".getBytes(StandardCharsets.UTF_8));
        when(objectStorageService.store(anyString(), anyString(), anyString(), any(byte[].class)))
                .thenReturn(new StoredObject(BUCKET, "custom", file.getSize(), "etag-1"));
        when(objectStorageService.loadOptional(anyString(), anyString())).thenReturn(Optional.empty());

        CustomExplanationDto result = service.upload(7L, file);

        assertEquals("explain.ts", result.fileName());
        assertFalse(result.active());
        verify(objectStorageService).store(anyString(), anyString(), anyString(), any(byte[].class));
    }

    @Test
    void list_FallsBackToLegacyPrefixWhenNewStateMissing() throws Exception {
        OffsetDateTime now = OffsetDateTime.of(2026, 4, 17, 12, 0, 0, 0, ZoneOffset.UTC);
        byte[] legacyActiveBytes = objectMapper.writeValueAsBytes(new ActivePointer("item-1", now));
        byte[] itemBytes = objectMapper.writeValueAsBytes(new StoredExplanation(
                "item-1", "one.ts", "application/typescript", 10, now, now, "src"));

        when(objectStorageService.loadOptional(BUCKET, NEW_PREFIX + "/state.json")).thenReturn(Optional.empty());
        when(objectStorageService.loadOptional(BUCKET, LEGACY_PREFIX + "/active.json"))
                .thenReturn(Optional.of(legacyActiveBytes));
        when(objectStorageService.list(NEW_PREFIX + "/items/")).thenReturn(List.of());
        when(objectStorageService.list(LEGACY_PREFIX + "/items/"))
                .thenReturn(List.of(new StoredObjectItem(BUCKET, LEGACY_PREFIX + "/items/item-1.json", 10L, "etag",
                        now)));
        when(objectStorageService.loadOptional(BUCKET, LEGACY_PREFIX + "/items/item-1.json"))
                .thenReturn(Optional.of(itemBytes));

        List<CustomExplanationDto> result = service.list(7L);

        assertEquals(1, result.size());
        assertTrue(result.get(0).active());
    }

    @Test
    void activateAndDelete_MigrateToNewPrefix() throws Exception {
        OffsetDateTime now = OffsetDateTime.of(2026, 4, 17, 12, 0, 0, 0, ZoneOffset.UTC);
        byte[] itemBytes = objectMapper.writeValueAsBytes(new StoredExplanation(
                "item-7", "active.ts", "application/typescript", 20, now, now, "src"));
        when(objectStorageService.loadOptional(BUCKET, NEW_PREFIX + "/items/item-7.json")).thenReturn(Optional.empty());
        when(objectStorageService.loadOptional(BUCKET, LEGACY_PREFIX + "/items/item-7.json"))
                .thenReturn(Optional.of(itemBytes));
        when(objectStorageService.loadOptional(BUCKET, NEW_PREFIX + "/state.json")).thenReturn(Optional.empty());
        when(objectStorageService.loadOptional(BUCKET, LEGACY_PREFIX + "/active.json")).thenReturn(Optional.empty());

        CustomExplanationDto active = service.activate(7L, "item-7");
        service.delete(7L, "item-7");

        assertTrue(active.active());
        verify(objectStorageService).delete(BUCKET, NEW_PREFIX + "/items/item-7.json");
        verify(objectStorageService).delete(BUCKET, LEGACY_PREFIX + "/items/item-7.json");
    }

    private User user() {
        User user = new User();
        user.setId(7L);
        user.setOauthProvider(OAuthProvider.GITHUB);
        user.setOauthId("user-1");
        return user;
    }

    private record StoredExplanation(
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
