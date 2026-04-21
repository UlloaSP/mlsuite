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

@ExtendWith(MockitoExtension.class)
class CustomExplanationServiceTest {

    private static final String BUCKET = "mlsuite-models";
    private static final String USER_PREFIX = "custom-explanations/github/user-1";

    @Mock
    private ObjectStorageService objectStorageService;

    @Mock
    private StorageProperties storageProperties;

    private CustomExplanationServiceImpl customExplanationService;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper().findAndRegisterModules();
        customExplanationService = new CustomExplanationServiceImpl(objectStorageService, storageProperties, objectMapper);
        when(storageProperties.getBucket()).thenReturn(BUCKET);
    }

    @Test
    void upload_StoresExplanationInMinio() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "explain.ts",
                "application/typescript",
                "export default defineExplanationKind({ kind: 'x', schema: z.object({ kind: z.literal('x') }), fetch: () => ({ submit: async () => null }), render: { content: () => ({ type: 'json', value: null }) } })"
                        .getBytes(StandardCharsets.UTF_8));

        when(objectStorageService.store(anyString(), anyString(), anyString(), any(byte[].class)))
                .thenReturn(new StoredObject(BUCKET, "custom", file.getSize(), "etag-1"));
        when(objectStorageService.loadOptional(anyString(), anyString())).thenReturn(Optional.empty());

        CustomExplanationDto result = customExplanationService.upload(OAuthProvider.GITHUB, "user-1", file);

        assertEquals("explain.ts", result.fileName());
        assertEquals(file.getSize(), result.sizeBytes());
        assertFalse(result.active());
        assertTrue(result.source().contains("defineExplanationKind"));
        verify(objectStorageService).store(anyString(), anyString(), anyString(), any(byte[].class));
    }

    @Test
    void list_ReturnsStoredItemsAndMarksMultipleActive() throws Exception {
        OffsetDateTime now = OffsetDateTime.of(2026, 4, 17, 12, 0, 0, 0, ZoneOffset.UTC);
        String itemOneId = "item-1";
        String itemTwoId = "item-2";

        byte[] stateBytes = objectMapper.writeValueAsBytes(new StatePayload(
                List.of(itemTwoId),
                now));
        byte[] itemOneBytes = objectMapper.writeValueAsBytes(new StoredCustomExplanationTestPayload(
                itemOneId,
                "one.ts",
                "application/typescript",
                10,
                now.minusDays(1),
                now.minusDays(1),
                "export default defineExplanationKind({ kind: 'one', schema: z.object({ kind: z.literal('one') }), fetch: () => ({ submit: async () => ['one'] }), render: { content: () => ({ type: 'list', items: ['one'] }) } })"));
        byte[] itemTwoBytes = objectMapper.writeValueAsBytes(new StoredCustomExplanationTestPayload(
                itemTwoId,
                "two.ts",
                "application/typescript",
                20,
                now,
                now,
                "export default defineExplanationKind({ kind: 'two', schema: z.object({ kind: z.literal('two') }), fetch: () => ({ submit: async () => ['two'] }), render: { content: () => ({ type: 'list', items: ['two'] }) } })"));

        when(objectStorageService.list(USER_PREFIX + "/items/")).thenReturn(List.of(
                new StoredObjectItem(BUCKET, USER_PREFIX + "/items/item-1.json", 10L, "etag-1", now.minusDays(1)),
                new StoredObjectItem(BUCKET, USER_PREFIX + "/items/item-2.json", 20L, "etag-2", now)));
        when(objectStorageService.loadOptional(BUCKET, USER_PREFIX + "/state.json"))
                .thenReturn(Optional.of(stateBytes));
        when(objectStorageService.loadOptional(BUCKET, USER_PREFIX + "/items/item-1.json"))
                .thenReturn(Optional.of(itemOneBytes));
        when(objectStorageService.loadOptional(BUCKET, USER_PREFIX + "/items/item-2.json"))
                .thenReturn(Optional.of(itemTwoBytes));

        List<CustomExplanationDto> result = customExplanationService.list(OAuthProvider.GITHUB, "user-1");

        assertEquals(2, result.size());
        assertTrue(result.stream().anyMatch(item -> item.id().equals(itemTwoId) && item.active()));
        assertTrue(result.stream().anyMatch(item -> item.id().equals(itemOneId) && !item.active()));
    }

    @Test
    void activateDeactivateAndDelete_UpdateStateAndStorage() throws Exception {
        OffsetDateTime now = OffsetDateTime.of(2026, 4, 17, 12, 0, 0, 0, ZoneOffset.UTC);
        byte[] itemBytes = objectMapper.writeValueAsBytes(new StoredCustomExplanationTestPayload(
                "item-7",
                "active.ts",
                "application/typescript",
                20,
                now,
                now,
                "export default defineExplanationKind({ kind: 'ok', schema: z.object({ kind: z.literal('ok') }), fetch: () => ({ submit: async () => ['ok'] }), render: { content: () => ({ type: 'list', items: ['ok'] }) } })"));

        when(objectStorageService.loadOptional(BUCKET, USER_PREFIX + "/items/item-7.json"))
                .thenReturn(Optional.of(itemBytes));
        when(objectStorageService.loadOptional(BUCKET, USER_PREFIX + "/state.json"))
                .thenReturn(Optional.empty());
        when(objectStorageService.loadOptional(BUCKET, USER_PREFIX + "/active.json"))
                .thenReturn(Optional.empty());

        CustomExplanationDto active = customExplanationService.activate(OAuthProvider.GITHUB, "user-1", "item-7");

        assertTrue(active.active());
        assertEquals("item-7", active.id());
        verify(objectStorageService).store(anyString(), anyString(), anyString(), any(byte[].class));

        customExplanationService.deactivate(OAuthProvider.GITHUB, "user-1", "item-7");
        customExplanationService.delete(OAuthProvider.GITHUB, "user-1", "item-7");

        verify(objectStorageService).delete(BUCKET, USER_PREFIX + "/items/item-7.json");
    }

    @Test
    void deactivateAll_DeletesPersistedStateWhenNoIdsRemain() throws Exception {
        OffsetDateTime now = OffsetDateTime.of(2026, 4, 17, 12, 0, 0, 0, ZoneOffset.UTC);
        byte[] stateBytes = objectMapper.writeValueAsBytes(new StatePayload(
                List.of("item-2"),
                now));

        when(objectStorageService.loadOptional(BUCKET, USER_PREFIX + "/state.json"))
                .thenReturn(Optional.of(stateBytes));

        customExplanationService.deactivateAll(OAuthProvider.GITHUB, "user-1");

        verify(objectStorageService).delete(BUCKET, USER_PREFIX + "/state.json");
        verify(objectStorageService).delete(BUCKET, USER_PREFIX + "/active.json");
    }

    private record StoredCustomExplanationTestPayload(
            String id,
            String fileName,
            String contentType,
            long sizeBytes,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt,
            String source) {
    }

    private record StatePayload(
            List<String> activeIds,
            OffsetDateTime updatedAt) {
    }
}
