package dev.ulloasp.mlsuite.customreport.services;

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

import dev.ulloasp.mlsuite.customreport.dtos.CustomReportDto;
import dev.ulloasp.mlsuite.customreport.exceptions.CustomReportNotFoundException;
import dev.ulloasp.mlsuite.storage.ObjectStorageService;
import dev.ulloasp.mlsuite.storage.StorageProperties;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;

@Service
public class CustomReportServiceImpl implements CustomReportService {

    private static final String ROOT_PREFIX = "custom-reports";
    private static final String STATE_FILE = "state.json";
    private static final String LEGACY_ACTIVE_FILE = "active.json";

    private final ObjectStorageService objectStorageService;
    private final StorageProperties storageProperties;
    private final ObjectMapper objectMapper;

    public CustomReportServiceImpl(
            ObjectStorageService objectStorageService,
            StorageProperties storageProperties,
            ObjectMapper objectMapper) {
        this.objectStorageService = objectStorageService;
        this.storageProperties = storageProperties;
        this.objectMapper = objectMapper;
    }

    @Override
    public CustomReportDto upload(OAuthProvider provider, String oauthId, MultipartFile file) {
        try {
            String id = UUID.randomUUID().toString();
            OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
            StoredCustomReport stored = new StoredCustomReport(
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
            throw new IllegalStateException("Could not serialize custom report.", ex);
        }
    }

    @Override
    public List<CustomReportDto> list(OAuthProvider provider, String oauthId) {
        CustomReportState state = readState(provider, oauthId);
        Set<String> activeIds = Set.copyOf(state.activeIds());
        List<CustomReportDto> catalog = new ArrayList<>();

        objectStorageService.list(itemsPrefix(provider, oauthId)).stream()
                .filter(item -> item.objectKey().endsWith(".json"))
                .map(item -> readStored(provider, oauthId, extractId(item.objectKey())))
                .map(item -> toDto(item, activeIds.contains(item.id())))
                .forEach(catalog::add);

        catalog.sort(Comparator
                .comparing(CustomReportDto::active).reversed()
                .thenComparing(CustomReportDto::updatedAt, Comparator.reverseOrder())
                .thenComparing(CustomReportDto::fileName, String.CASE_INSENSITIVE_ORDER));

        return catalog;
    }

    @Override
    public List<CustomReportDto> getActive(OAuthProvider provider, String oauthId) {
        return list(provider, oauthId).stream()
                .filter(CustomReportDto::active)
                .toList();
    }

    @Override
    public CustomReportDto activate(OAuthProvider provider, String oauthId, String id) {
        StoredCustomReport stored = readStored(provider, oauthId, id);
        CustomReportState state = readState(provider, oauthId);
        LinkedHashSet<String> activeIds = new LinkedHashSet<>(state.activeIds());
        activeIds.add(id);
        writeState(provider, oauthId, activeIds);
        return toDto(stored, true);
    }

    @Override
    public void deactivate(OAuthProvider provider, String oauthId, String id) {
        CustomReportState state = readState(provider, oauthId);
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
        CustomReportState state = readState(provider, oauthId);
        LinkedHashSet<String> activeIds = new LinkedHashSet<>(state.activeIds());
        activeIds.remove(id);

        readStored(provider, oauthId, id);
        objectStorageService.delete(storageProperties.getBucket(), itemObjectKey(provider, oauthId, id));
        writeState(provider, oauthId, activeIds);
    }

    private CustomReportState readState(OAuthProvider provider, String oauthId) {
        String bucket = storageProperties.getBucket();

        Optional<byte[]> stateBytes = objectStorageService.loadOptional(bucket, stateObjectKey(provider, oauthId));
        if (stateBytes.isPresent()) {
            try {
                CustomReportState state = objectMapper.readValue(stateBytes.get(), CustomReportState.class);
                return normalizeState(state);
            } catch (IOException ex) {
                throw new IllegalStateException("Could not deserialize custom report state.", ex);
            }
        }

        Optional<byte[]> legacyActiveBytes = objectStorageService.loadOptional(bucket,
                legacyActiveObjectKey(provider, oauthId));
        if (legacyActiveBytes.isPresent()) {
            try {
                ActiveReportPointer pointer = objectMapper.readValue(legacyActiveBytes.get(), ActiveReportPointer.class);
                if (pointer.id() == null || pointer.id().isBlank()) {
                    return emptyState();
                }
                return new CustomReportState(List.of(pointer.id()), pointer.updatedAt());
            } catch (IOException ex) {
                throw new IllegalStateException("Could not deserialize legacy custom report pointer.", ex);
            }
        }

        return emptyState();
    }

    private CustomReportState normalizeState(CustomReportState state) {
        return new CustomReportState(
                List.copyOf(new LinkedHashSet<>(state.activeIds() == null ? List.of() : state.activeIds())),
                state.updatedAt());
    }

    private CustomReportState emptyState() {
        return new CustomReportState(List.of(), null);
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
            CustomReportState state = new CustomReportState(
                    List.copyOf(activeIds),
                    OffsetDateTime.now(ZoneOffset.UTC));
            objectStorageService.store(
                    stateObjectKey(provider, oauthId),
                    STATE_FILE,
                    "application/json",
                    objectMapper.writeValueAsBytes(state));
            objectStorageService.delete(storageProperties.getBucket(), legacyActiveObjectKey(provider, oauthId));
        } catch (IOException ex) {
            throw new IllegalStateException("Could not serialize custom report state.", ex);
        }
    }

    private StoredCustomReport readStored(OAuthProvider provider, String oauthId, String id) {
        try {
            byte[] bytes = objectStorageService
                    .loadOptional(storageProperties.getBucket(), itemObjectKey(provider, oauthId, id))
                    .orElseThrow(() -> new CustomReportNotFoundException(id));
            return objectMapper.readValue(bytes, StoredCustomReport.class);
        } catch (IOException ex) {
            throw new IllegalStateException("Could not deserialize custom report.", ex);
        }
    }

    private CustomReportDto toDto(StoredCustomReport stored, boolean active) {
        return new CustomReportDto(
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
            return "custom-report.ts";
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
    private record StoredCustomReport(
            String id,
            String fileName,
            String contentType,
            long sizeBytes,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt,
            String source) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record ActiveReportPointer(String id, OffsetDateTime updatedAt) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record CustomReportState(
            List<String> activeIds,
            OffsetDateTime updatedAt) {
    }
}
