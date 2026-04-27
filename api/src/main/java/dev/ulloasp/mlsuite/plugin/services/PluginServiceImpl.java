package dev.ulloasp.mlsuite.plugin.services;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.databind.ObjectMapper;

import dev.ulloasp.mlsuite.plugin.dtos.PluginDto;
import dev.ulloasp.mlsuite.plugin.exceptions.PluginNotFoundException;
import dev.ulloasp.mlsuite.plugin.shared.LegacyActivePluginPointer;
import dev.ulloasp.mlsuite.plugin.shared.PluginState;
import dev.ulloasp.mlsuite.plugin.shared.PluginStoragePaths;
import dev.ulloasp.mlsuite.plugin.shared.StoredPlugin;
import dev.ulloasp.mlsuite.storage.ObjectStorageService;
import dev.ulloasp.mlsuite.storage.StorageProperties;
import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.service.UserLookupService;

@Service
public class PluginServiceImpl implements PluginService {

    private static final String ROOT_PREFIX = "plugins";
    private static final String STATE_FILE = "state.json";
    private static final String LEGACY_ACTIVE_FILE = "active.json";
    private static final List<String> LEGACY_ROOTS = List.of(
            "custom-fields",
            "custom-reports",
            "custom-explanations");

    private final ObjectStorageService objectStorageService;
    private final StorageProperties storageProperties;
    private final ObjectMapper objectMapper;
    private final UserLookupService userLookupService;

    public PluginServiceImpl(
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
    public PluginDto upload(Long userId, Long organizationId, MultipartFile file) {
        try {
            String id = UUID.randomUUID().toString();
            OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
            StoredPlugin stored = new StoredPlugin(
                    id,
                    sanitizeFileName(file.getOriginalFilename()),
                    normalizeContentType(file.getContentType()),
                    file.getSize(),
                    now,
                    now,
                    new String(file.getBytes(), StandardCharsets.UTF_8));
            objectStorageService.store(
                    PluginStoragePaths.organizationItemObjectKey(ROOT_PREFIX, organizationId, id),
                    stored.fileName(),
                    "application/json",
                    objectMapper.writeValueAsBytes(stored));
            return toDto(stored, readState(userLookupService.requireById(userId), organizationId).activeIds().contains(id));
        } catch (IOException ex) {
            throw new IllegalStateException("Could not serialize plugin.", ex);
        }
    }

    @Override
    public List<PluginDto> list(Long userId, Long organizationId) {
        User user = userLookupService.requireById(userId);
        Set<String> activeIds = Set.copyOf(readState(user, organizationId).activeIds());
        Map<String, StoredPlugin> storedItems = new LinkedHashMap<>();
        Map<String, String> origins = new LinkedHashMap<>();
        readItems(PluginStoragePaths.organizationItemsPrefix(ROOT_PREFIX, organizationId))
                .forEach(item -> putStored(storedItems, origins, item, ROOT_PREFIX, true));
        for (String legacyRoot : LEGACY_ROOTS) {
            readItems(legacyItemsPrefix(legacyRoot, user))
                    .forEach(item -> putStored(storedItems, origins, item, legacyRoot, false));
        }
        List<PluginDto> catalog = new ArrayList<>();
        storedItems.values().forEach(item -> catalog.add(toDto(item, activeIds.contains(item.id()))));
        catalog.sort(Comparator
                .comparing(PluginDto::active).reversed()
                .thenComparing(PluginDto::updatedAt, Comparator.reverseOrder())
                .thenComparing(PluginDto::fileName, String.CASE_INSENSITIVE_ORDER));
        return catalog;
    }

    @Override
    public List<PluginDto> getActive(Long userId, Long organizationId) {
        return list(userId, organizationId).stream().filter(PluginDto::active).toList();
    }

    @Override
    public PluginDto activate(Long userId, Long organizationId, String id) {
        User user = userLookupService.requireById(userId);
        StoredPlugin stored = readStored(user, organizationId, id);
        LinkedHashSet<String> activeIds = new LinkedHashSet<>(readState(user, organizationId).activeIds());
        activeIds.add(id);
        writeState(organizationId, activeIds);
        return toDto(stored, true);
    }

    @Override
    public void deactivate(Long userId, Long organizationId, String id) {
        User user = userLookupService.requireById(userId);
        LinkedHashSet<String> activeIds = new LinkedHashSet<>(readState(user, organizationId).activeIds());
        activeIds.remove(id);
        writeState(organizationId, activeIds);
    }

    @Override
    public void deactivateAll(Long userId, Long organizationId) {
        userLookupService.requireById(userId);
        writeState(organizationId, Set.of());
    }

    @Override
    public void delete(Long userId, Long organizationId, String id) {
        User user = userLookupService.requireById(userId);
        readStored(user, organizationId, id);
        LinkedHashSet<String> activeIds = new LinkedHashSet<>(readState(user, organizationId).activeIds());
        activeIds.remove(id);
        objectStorageService.delete(storageProperties.getBucket(),
                PluginStoragePaths.organizationItemObjectKey(ROOT_PREFIX, organizationId, id));
        for (String legacyRoot : LEGACY_ROOTS) {
            objectStorageService.delete(storageProperties.getBucket(), legacyItemObjectKey(legacyRoot, user, id));
        }
        writeState(organizationId, activeIds);
    }

    private PluginState readState(User user, Long organizationId) {
        Optional<byte[]> stateBytes = objectStorageService.loadOptional(
                storageProperties.getBucket(),
                PluginStoragePaths.organizationStateObjectKey(ROOT_PREFIX, organizationId, STATE_FILE));
        if (stateBytes.isPresent()) {
            try {
                return normalizeState(objectMapper.readValue(stateBytes.get(), PluginState.class));
            } catch (IOException ex) {
                throw new IllegalStateException("Could not deserialize plugin state.", ex);
            }
        }
        LinkedHashSet<String> activeIds = new LinkedHashSet<>();
        for (String legacyRoot : LEGACY_ROOTS) {
            objectStorageService.loadOptional(storageProperties.getBucket(), legacyActiveObjectKey(legacyRoot, user))
                    .ifPresent(bytes -> readLegacyPointer(bytes).ifPresent(activeIds::add));
        }
        return new PluginState(List.copyOf(activeIds), null);
    }

    private Optional<String> readLegacyPointer(byte[] bytes) {
        try {
            LegacyActivePluginPointer pointer = objectMapper.readValue(bytes, LegacyActivePluginPointer.class);
            return pointer.id() == null || pointer.id().isBlank() ? Optional.empty() : Optional.of(pointer.id());
        } catch (IOException ex) {
            throw new IllegalStateException("Could not deserialize legacy plugin pointer.", ex);
        }
    }

    private PluginState normalizeState(PluginState state) {
        List<String> activeIds = state.activeIds() == null ? List.of() : state.activeIds();
        return new PluginState(List.copyOf(new LinkedHashSet<>(activeIds)), state.updatedAt());
    }

    private void writeState(Long organizationId, Set<String> activeIds) {
        if (activeIds.isEmpty()) {
            objectStorageService.delete(
                    storageProperties.getBucket(),
                    PluginStoragePaths.organizationStateObjectKey(ROOT_PREFIX, organizationId, STATE_FILE));
            return;
        }
        try {
            PluginState state = new PluginState(List.copyOf(activeIds), OffsetDateTime.now(ZoneOffset.UTC));
            objectStorageService.store(
                    PluginStoragePaths.organizationStateObjectKey(ROOT_PREFIX, organizationId, STATE_FILE),
                    STATE_FILE,
                    "application/json",
                    objectMapper.writeValueAsBytes(state));
        } catch (IOException ex) {
            throw new IllegalStateException("Could not serialize plugin state.", ex);
        }
    }

    private StoredPlugin readStored(User user, Long organizationId, String id) {
        Optional<byte[]> bytes = objectStorageService.loadOptional(
                storageProperties.getBucket(),
                PluginStoragePaths.organizationItemObjectKey(ROOT_PREFIX, organizationId, id));
        if (bytes.isPresent()) {
            return readStored(bytes.get());
        }
        for (String legacyRoot : LEGACY_ROOTS) {
            bytes = objectStorageService.loadOptional(storageProperties.getBucket(), legacyItemObjectKey(legacyRoot, user, id));
            if (bytes.isPresent()) {
                return readStored(bytes.get());
            }
        }
        throw new PluginNotFoundException(id);
    }

    private StoredPlugin readStored(byte[] bytes) {
        try {
            return objectMapper.readValue(bytes, StoredPlugin.class);
        } catch (IOException ex) {
            throw new IllegalStateException("Could not deserialize plugin.", ex);
        }
    }

    private List<StoredPlugin> readItems(String prefix) {
        return objectStorageService.list(prefix).stream()
                .filter(item -> item.objectKey().endsWith(".json"))
                .map(item -> objectStorageService.loadOptional(storageProperties.getBucket(), item.objectKey())
                        .orElseThrow(() -> new IllegalStateException("Could not load plugin object.")))
                .map(this::readStored)
                .toList();
    }

    private void putStored(
            Map<String, StoredPlugin> storedItems,
            Map<String, String> origins,
            StoredPlugin item,
            String origin,
            boolean replaceExisting) {
        String existingOrigin = origins.get(item.id());
        if (existingOrigin == null) {
            storedItems.put(item.id(), item);
            origins.put(item.id(), origin);
            return;
        }
        if (replaceExisting) {
            storedItems.put(item.id(), item);
            origins.put(item.id(), origin);
            return;
        }
        if (!ROOT_PREFIX.equals(existingOrigin) && !existingOrigin.equals(origin)) {
            throw new IllegalStateException("Duplicate legacy plugin id '" + item.id() + "' detected across storage roots.");
        }
    }

    private PluginDto toDto(StoredPlugin stored, boolean active) {
        return new PluginDto(
                stored.id(),
                stored.fileName(),
                stored.contentType(),
                stored.sizeBytes(),
                stored.createdAt(),
                stored.updatedAt(),
                active,
                stored.source());
    }

    private String legacyActiveObjectKey(String rootPrefix, User user) {
        return PluginStoragePaths.legacyActiveObjectKey(rootPrefix, user, LEGACY_ACTIVE_FILE);
    }

    private String legacyItemsPrefix(String rootPrefix, User user) {
        return PluginStoragePaths.legacyItemsPrefix(rootPrefix, user);
    }

    private String legacyItemObjectKey(String rootPrefix, User user, String id) {
        return PluginStoragePaths.legacyItemObjectKey(rootPrefix, user, id);
    }

    private String sanitizeFileName(String value) {
        return value == null || value.isBlank() ? "plugin.ts" : value.strip();
    }

    private String normalizeContentType(String value) {
        return value == null || value.isBlank() ? "application/typescript" : value;
    }
}
