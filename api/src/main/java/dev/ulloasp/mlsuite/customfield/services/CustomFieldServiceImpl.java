package dev.ulloasp.mlsuite.customfield.services;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;

import dev.ulloasp.mlsuite.customfield.dtos.CustomFieldDto;
import dev.ulloasp.mlsuite.customfield.exceptions.CustomFieldNotFoundException;
import dev.ulloasp.mlsuite.storage.ObjectStorageService;
import dev.ulloasp.mlsuite.storage.StorageProperties;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;

@Service
public class CustomFieldServiceImpl implements CustomFieldService {

    private static final String ROOT_PREFIX = "custom-fields";
    private static final String STATE_FILE = "state.json";
    private static final String LEGACY_ACTIVE_FILE = "active.json";

    private final ObjectStorageService objectStorageService;
    private final StorageProperties storageProperties;
    private final ObjectMapper objectMapper;

    public CustomFieldServiceImpl(
            ObjectStorageService objectStorageService,
            StorageProperties storageProperties,
            ObjectMapper objectMapper) {
        this.objectStorageService = objectStorageService;
        this.storageProperties = storageProperties;
        this.objectMapper = objectMapper;
    }

    @Override
    public CustomFieldDto upload(OAuthProvider provider, String oauthId, MultipartFile file) {
        try {
            String id = UUID.randomUUID().toString();
            OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
            StoredCustomField stored = new StoredCustomField(
                    id,
                    sanitizeFileName(file.getOriginalFilename()),
                    normalizeContentType(file.getContentType()),
                    file.getSize(),
                    now,
                    now,
                    new String(file.getBytes(), StandardCharsets.UTF_8));

            objectStorageService.store(
                    itemObjectKey(provider, oauthId, id),
                    stored.fileName(),
                    "application/json",
                    objectMapper.writeValueAsBytes(stored));

            return toDto(stored, readState(provider, oauthId).activeIds().contains(id));
        } catch (IOException ex) {
            throw new IllegalStateException("Could not serialize custom field.", ex);
        }
    }

    @Override
    public List<CustomFieldDto> list(OAuthProvider provider, String oauthId) {
        CustomFieldState state = readState(provider, oauthId);
        Set<String> activeIds = Set.copyOf(state.activeIds());
        List<CustomFieldDto> catalog = new ArrayList<>();

        objectStorageService.list(itemsPrefix(provider, oauthId)).stream()
                .filter(item -> item.objectKey().endsWith(".json"))
                .map(item -> readStored(provider, oauthId, extractId(item.objectKey())))
                .map(item -> toDto(item, activeIds.contains(item.id())))
                .forEach(catalog::add);

        catalog.sort(Comparator
                .comparing(CustomFieldDto::active).reversed()
                .thenComparing(CustomFieldDto::updatedAt, Comparator.reverseOrder())
                .thenComparing(CustomFieldDto::fileName, String.CASE_INSENSITIVE_ORDER));

        return catalog;
    }

    @Override
    public List<CustomFieldDto> getActive(OAuthProvider provider, String oauthId) {
        return list(provider, oauthId).stream()
                .filter(CustomFieldDto::active)
                .toList();
    }

    @Override
    public CustomFieldDto activate(OAuthProvider provider, String oauthId, String id) {
        StoredCustomField stored = readStored(provider, oauthId, id);
        CustomFieldState state = readState(provider, oauthId);
        LinkedHashSet<String> activeIds = new LinkedHashSet<>(state.activeIds());
        activeIds.add(id);
        writeState(provider, oauthId, activeIds);
        return toDto(stored, true);
    }

    @Override
    public void deactivate(OAuthProvider provider, String oauthId, String id) {
        CustomFieldState state = readState(provider, oauthId);
        LinkedHashSet<String> activeIds = new LinkedHashSet<>(state.activeIds());
        activeIds.remove(id);
        writeState(provider, oauthId, activeIds);
    }

    @Override
    public void deactivateAll(OAuthProvider provider, String oauthId) {
        writeState(provider, oauthId, new LinkedHashSet<>());
    }

    @Override
    public void delete(OAuthProvider provider, String oauthId, String id) {
        CustomFieldState state = readState(provider, oauthId);
        LinkedHashSet<String> activeIds = new LinkedHashSet<>(state.activeIds());
        activeIds.remove(id);

        readStored(provider, oauthId, id);
        objectStorageService.delete(storageProperties.getBucket(), itemObjectKey(provider, oauthId, id));
        writeState(provider, oauthId, activeIds);
    }

    private CustomFieldState readState(OAuthProvider provider, String oauthId) {
        String bucket = storageProperties.getBucket();

        Optional<byte[]> stateBytes = objectStorageService.loadOptional(bucket, stateObjectKey(provider, oauthId));
        if (stateBytes.isPresent()) {
            try {
                CustomFieldState state = objectMapper.readValue(stateBytes.get(), CustomFieldState.class);
                return normalizeState(state);
            } catch (IOException ex) {
                throw new IllegalStateException("Could not deserialize custom field state.", ex);
            }
        }

        Optional<byte[]> legacyActiveBytes = objectStorageService.loadOptional(bucket,
                legacyActiveObjectKey(provider, oauthId));
        if (legacyActiveBytes.isPresent()) {
            try {
                ActiveFieldPointer pointer = objectMapper.readValue(legacyActiveBytes.get(), ActiveFieldPointer.class);
                if (pointer.id() == null || pointer.id().isBlank()) {
                    return emptyState();
                }
                return new CustomFieldState(List.of(pointer.id()), pointer.updatedAt());
            } catch (IOException ex) {
                throw new IllegalStateException("Could not deserialize legacy custom field pointer.", ex);
            }
        }

        return emptyState();
    }

    private CustomFieldState normalizeState(CustomFieldState state) {
        return new CustomFieldState(
                List.copyOf(new LinkedHashSet<>(state.activeIds() == null ? List.of() : state.activeIds())),
                state.updatedAt());
    }

    private CustomFieldState emptyState() {
        return new CustomFieldState(List.of(), null);
    }

    private void writeState(
            OAuthProvider provider,
            String oauthId,
            Set<String> activeIds) {
        if (activeIds.isEmpty()) {
            objectStorageService.delete(storageProperties.getBucket(), stateObjectKey(provider, oauthId));
            objectStorageService.delete(storageProperties.getBucket(), legacyActiveObjectKey(provider, oauthId));
            return;
        }

        try {
            CustomFieldState state = new CustomFieldState(
                    List.copyOf(activeIds),
                    OffsetDateTime.now(ZoneOffset.UTC));
            objectStorageService.store(
                    stateObjectKey(provider, oauthId),
                    STATE_FILE,
                    "application/json",
                    objectMapper.writeValueAsBytes(state));
            objectStorageService.delete(storageProperties.getBucket(), legacyActiveObjectKey(provider, oauthId));
        } catch (IOException ex) {
            throw new IllegalStateException("Could not serialize custom field state.", ex);
        }
    }

    private StoredCustomField readStored(OAuthProvider provider, String oauthId, String id) {
        try {
            byte[] bytes = objectStorageService
                    .loadOptional(storageProperties.getBucket(), itemObjectKey(provider, oauthId, id))
                    .orElseThrow(() -> new CustomFieldNotFoundException(id));
            return objectMapper.readValue(bytes, StoredCustomField.class);
        } catch (IOException ex) {
            throw new IllegalStateException("Could not deserialize custom field.", ex);
        }
    }

    private CustomFieldDto toDto(StoredCustomField stored, boolean active) {
        return new CustomFieldDto(
                stored.id(),
                stored.fileName(),
                stored.contentType(),
                stored.sizeBytes(),
                stored.createdAt(),
                stored.updatedAt(),
                active,
                stored.source());
    }

    private String itemsPrefix(OAuthProvider provider, String oauthId) {
        return userPrefix(provider, oauthId) + "/items/";
    }

    private String itemObjectKey(OAuthProvider provider, String oauthId, String id) {
        return itemsPrefix(provider, oauthId) + id + ".json";
    }

    private String stateObjectKey(OAuthProvider provider, String oauthId) {
        return userPrefix(provider, oauthId) + "/" + STATE_FILE;
    }

    private String legacyActiveObjectKey(OAuthProvider provider, String oauthId) {
        return userPrefix(provider, oauthId) + "/" + LEGACY_ACTIVE_FILE;
    }

    private String userPrefix(OAuthProvider provider, String oauthId) {
        return ROOT_PREFIX + "/"
                + provider.name().toLowerCase()
                + "/"
                + URLEncoder.encode(oauthId, StandardCharsets.UTF_8);
    }

    private String extractId(String objectKey) {
        int slashIndex = objectKey.lastIndexOf('/');
        String fileName = slashIndex >= 0 ? objectKey.substring(slashIndex + 1) : objectKey;
        return fileName.endsWith(".json") ? fileName.substring(0, fileName.length() - 5) : fileName;
    }

    private String sanitizeFileName(String value) {
        if (value == null || value.isBlank()) {
            return "custom-field.ts";
        }

        return value.strip();
    }

    private String normalizeContentType(String value) {
        if (value == null || value.isBlank()) {
            return "application/typescript";
        }

        return value;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record StoredCustomField(
            String id,
            String fileName,
            String contentType,
            long sizeBytes,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt,
            String source) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record ActiveFieldPointer(String id, OffsetDateTime updatedAt) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record CustomFieldState(
            List<String> activeIds,
            OffsetDateTime updatedAt) {
    }
}
