package dev.ulloasp.mlsuite.customfield.services;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.databind.ObjectMapper;

import dev.ulloasp.mlsuite.custom.shared.ActiveArtifactPointer;
import dev.ulloasp.mlsuite.custom.shared.CustomArtifactState;
import dev.ulloasp.mlsuite.custom.shared.CustomArtifactStoragePaths;
import dev.ulloasp.mlsuite.custom.shared.StoredCustomArtifact;
import dev.ulloasp.mlsuite.customfield.dtos.CustomFieldDto;
import dev.ulloasp.mlsuite.customfield.exceptions.CustomFieldNotFoundException;
import dev.ulloasp.mlsuite.storage.ObjectStorageService;
import dev.ulloasp.mlsuite.storage.StorageProperties;
import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.service.UserLookupService;

@Service
public class CustomFieldServiceImpl implements CustomFieldService {

    private static final String ROOT_PREFIX = "custom-fields";
    private static final String STATE_FILE = "state.json";
    private static final String LEGACY_ACTIVE_FILE = "active.json";

    private final ObjectStorageService objectStorageService;
    private final StorageProperties storageProperties;
    private final ObjectMapper objectMapper;
    private final UserLookupService userLookupService;

    public CustomFieldServiceImpl(
            ObjectStorageService objectStorageService,
            StorageProperties storageProperties,
            ObjectMapper objectMapper,
            UserLookupService userLookupService) {
        this.objectStorageService = objectStorageService;
        this.storageProperties = storageProperties;
        this.objectMapper = objectMapper;
        this.userLookupService = userLookupService;
    }

    @Override
    public CustomFieldDto upload(Long userId, MultipartFile file) {
        try {
            String id = UUID.randomUUID().toString();
            OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
            StoredCustomArtifact stored = new StoredCustomArtifact(
                    id,
                    sanitizeFileName(file.getOriginalFilename()),
                    normalizeContentType(file.getContentType()),
                    file.getSize(),
                    now,
                    now,
                    new String(file.getBytes(), StandardCharsets.UTF_8));

            objectStorageService.store(
                    itemObjectKey(userId, id),
                    stored.fileName(),
                    "application/json",
                    objectMapper.writeValueAsBytes(stored));

            return toDto(stored, readState(userLookupService.requireById(userId)).activeIds().contains(id));
        } catch (IOException ex) {
            throw new IllegalStateException("Could not serialize custom field.", ex);
        }
    }

    @Override
    public List<CustomFieldDto> list(Long userId) {
        User user = userLookupService.requireById(userId);
        CustomArtifactState state = readState(user);
        Set<String> activeIds = Set.copyOf(state.activeIds());
        List<CustomFieldDto> catalog = new ArrayList<>();
        LinkedHashMap<String, StoredCustomArtifact> storedItems = new LinkedHashMap<>();

        readItems(itemsPrefix(userId)).forEach(item -> storedItems.put(item.id(), item));
        readItems(legacyItemsPrefix(user)).forEach(item -> storedItems.putIfAbsent(item.id(), item));
        storedItems.values().stream()
                .map(item -> toDto(item, activeIds.contains(item.id())))
                .forEach(catalog::add);

        catalog.sort(Comparator
                .comparing(CustomFieldDto::active).reversed()
                .thenComparing(CustomFieldDto::updatedAt, Comparator.reverseOrder())
                .thenComparing(CustomFieldDto::fileName, String.CASE_INSENSITIVE_ORDER));

        return catalog;
    }

    @Override
    public List<CustomFieldDto> getActive(Long userId) {
        return list(userId).stream()
                .filter(CustomFieldDto::active)
                .toList();
    }

    @Override
    public CustomFieldDto activate(Long userId, String id) {
        User user = userLookupService.requireById(userId);
        StoredCustomArtifact stored = readStored(user, id);
        CustomArtifactState state = readState(user);
        LinkedHashSet<String> activeIds = new LinkedHashSet<>(state.activeIds());
        activeIds.add(id);
        writeState(userId, activeIds);
        return toDto(stored, true);
    }

    @Override
    public void deactivate(Long userId, String id) {
        User user = userLookupService.requireById(userId);
        CustomArtifactState state = readState(user);
        LinkedHashSet<String> activeIds = new LinkedHashSet<>(state.activeIds());
        activeIds.remove(id);
        writeState(userId, activeIds);
    }

    @Override
    public void deactivateAll(Long userId) {
        userLookupService.requireById(userId);
        writeState(userId, new LinkedHashSet<>());
    }

    @Override
    public void delete(Long userId, String id) {
        User user = userLookupService.requireById(userId);
        CustomArtifactState state = readState(user);
        LinkedHashSet<String> activeIds = new LinkedHashSet<>(state.activeIds());
        activeIds.remove(id);

        readStored(user, id);
        objectStorageService.delete(storageProperties.getBucket(), itemObjectKey(userId, id));
        objectStorageService.delete(storageProperties.getBucket(), legacyItemObjectKey(user, id));
        writeState(userId, activeIds);
    }

    private CustomArtifactState readState(User user) {
        String bucket = storageProperties.getBucket();

        Optional<byte[]> stateBytes = objectStorageService.loadOptional(bucket, stateObjectKey(user.getId()));
        if (stateBytes.isPresent()) {
            try {
                CustomArtifactState state = objectMapper.readValue(stateBytes.get(), CustomArtifactState.class);
                return normalizeState(state);
            } catch (IOException ex) {
                throw new IllegalStateException("Could not deserialize custom field state.", ex);
            }
        }

        Optional<byte[]> legacyActiveBytes = objectStorageService.loadOptional(bucket,
                legacyActiveObjectKey(user));
        if (legacyActiveBytes.isPresent()) {
            try {
                ActiveArtifactPointer pointer = objectMapper.readValue(legacyActiveBytes.get(), ActiveArtifactPointer.class);
                if (pointer.id() == null || pointer.id().isBlank()) {
                    return emptyState();
                }
                return new CustomArtifactState(List.of(pointer.id()), pointer.updatedAt());
            } catch (IOException ex) {
                throw new IllegalStateException("Could not deserialize legacy custom field pointer.", ex);
            }
        }

        return emptyState();
    }

    private CustomArtifactState normalizeState(CustomArtifactState state) {
        return new CustomArtifactState(
                List.copyOf(new LinkedHashSet<>(state.activeIds() == null ? List.of() : state.activeIds())),
                state.updatedAt());
    }

    private CustomArtifactState emptyState() {
        return new CustomArtifactState(List.of(), null);
    }

    private void writeState(Long userId, Set<String> activeIds) {
        if (activeIds.isEmpty()) {
            objectStorageService.delete(storageProperties.getBucket(), stateObjectKey(userId));
            return;
        }

        try {
            CustomArtifactState state = new CustomArtifactState(
                    List.copyOf(activeIds),
                    OffsetDateTime.now(ZoneOffset.UTC));
            objectStorageService.store(
                    stateObjectKey(userId),
                    STATE_FILE,
                    "application/json",
                    objectMapper.writeValueAsBytes(state));
        } catch (IOException ex) {
            throw new IllegalStateException("Could not serialize custom field state.", ex);
        }
    }

    private StoredCustomArtifact readStored(User user, String id) {
        try {
            byte[] bytes = objectStorageService
                    .loadOptional(storageProperties.getBucket(), itemObjectKey(user.getId(), id))
                    .or(() -> objectStorageService.loadOptional(storageProperties.getBucket(), legacyItemObjectKey(user, id)))
                    .orElseThrow(() -> new CustomFieldNotFoundException(id));
            return objectMapper.readValue(bytes, StoredCustomArtifact.class);
        } catch (IOException ex) {
            throw new IllegalStateException("Could not deserialize custom field.", ex);
        }
    }

    private List<StoredCustomArtifact> readItems(String prefix) {
        return objectStorageService.list(prefix).stream()
                .filter(item -> item.objectKey().endsWith(".json"))
                .map(item -> readStoredObject(item.objectKey()))
                .toList();
    }

    private StoredCustomArtifact readStoredObject(String objectKey) {
        try {
            byte[] bytes = objectStorageService
                    .loadOptional(storageProperties.getBucket(), objectKey)
                    .orElseThrow(() -> new IllegalStateException("Could not load custom field object."));
            return objectMapper.readValue(bytes, StoredCustomArtifact.class);
        } catch (IOException ex) {
            throw new IllegalStateException("Could not deserialize custom field.", ex);
        }
    }

    private CustomFieldDto toDto(StoredCustomArtifact stored, boolean active) {
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

    private String itemsPrefix(Long userId) {
        return CustomArtifactStoragePaths.itemsPrefix(ROOT_PREFIX, userId);
    }

    private String itemObjectKey(Long userId, String id) {
        return CustomArtifactStoragePaths.itemObjectKey(ROOT_PREFIX, userId, id);
    }

    private String stateObjectKey(Long userId) {
        return CustomArtifactStoragePaths.stateObjectKey(ROOT_PREFIX, userId, STATE_FILE);
    }

    private String legacyActiveObjectKey(User user) {
        return CustomArtifactStoragePaths.legacyActiveObjectKey(ROOT_PREFIX, user, LEGACY_ACTIVE_FILE);
    }

    private String legacyItemsPrefix(User user) {
        return CustomArtifactStoragePaths.legacyItemsPrefix(ROOT_PREFIX, user);
    }

    private String legacyItemObjectKey(User user, String id) {
        return CustomArtifactStoragePaths.legacyItemObjectKey(ROOT_PREFIX, user, id);
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

}
