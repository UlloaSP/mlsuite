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
    private static final String BUILTIN_DEFAULT_ID = "builtin-default-plugin";
    private static final OffsetDateTime BUILTIN_DEFAULT_TIMESTAMP = OffsetDateTime.of(2026, 4, 21, 0, 0, 0, 0,
            ZoneOffset.UTC);
    private static final StoredCustomReport BUILTIN_DEFAULT_PLUGIN = new StoredCustomReport(
            BUILTIN_DEFAULT_ID,
            "default-report.ts",
            "application/typescript",
            0L,
            BUILTIN_DEFAULT_TIMESTAMP,
            BUILTIN_DEFAULT_TIMESTAMP,
            """
                    export default defineReportDefinition({
                      kind: "custom-summary-report",
                      schema: z
                        .object({
                          kind: z.literal("custom-summary-report"),
                          id: z.string().optional(),
                          label: z.string().optional(),
                          description: z.string().optional(),
                        })
                        .passthrough(),
                      resolvePayload: (_config, context) => context.result.raw,
                      describe: (config, context) => ({
                        component: "mlsuite-custom-report",
                        props: {
                          label: config.label ?? "Custom Summary",
                          description: config.description,
                          result: {
                            title: config.label ?? "Custom Summary",
                            blocks: [
                              `status=${context.state.status}`,
                              JSON.stringify(context.payload ?? {}, null, 2),
                            ],
                          },
                        },
                      }),
                    });
                    """);

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

        if (!state.deletedBuiltinIds().contains(BUILTIN_DEFAULT_ID)) {
            catalog.add(toDto(BUILTIN_DEFAULT_PLUGIN, activeIds.contains(BUILTIN_DEFAULT_ID)));
        }

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
        StoredCustomReport stored = resolveStored(provider, oauthId, id);
        CustomReportState state = readState(provider, oauthId);
        LinkedHashSet<String> activeIds = new LinkedHashSet<>(state.activeIds());
        activeIds.add(id);
        writeState(provider, oauthId, activeIds, new LinkedHashSet<>(state.deletedBuiltinIds()));
        return toDto(stored, true);
    }

    @Override
    public void deactivate(OAuthProvider provider, String oauthId, String id) {
        CustomReportState state = readState(provider, oauthId);
        LinkedHashSet<String> activeIds = new LinkedHashSet<>(state.activeIds());
        activeIds.remove(id);
        writeState(provider, oauthId, activeIds, new LinkedHashSet<>(state.deletedBuiltinIds()));
    }

    @Override
    public void deactivateAll(OAuthProvider provider, String oauthId) {
        CustomReportState state = readState(provider, oauthId);
        writeState(provider, oauthId, new LinkedHashSet<>(), new LinkedHashSet<>(state.deletedBuiltinIds()));
    }

    @Override
    public void delete(OAuthProvider provider, String oauthId, String id) {
        CustomReportState state = readState(provider, oauthId);
        LinkedHashSet<String> activeIds = new LinkedHashSet<>(state.activeIds());
        LinkedHashSet<String> deletedBuiltinIds = new LinkedHashSet<>(state.deletedBuiltinIds());
        activeIds.remove(id);

        if (BUILTIN_DEFAULT_ID.equals(id)) {
            deletedBuiltinIds.add(id);
            writeState(provider, oauthId, activeIds, deletedBuiltinIds);
            return;
        }

        resolveStored(provider, oauthId, id);
        objectStorageService.delete(storageProperties.getBucket(), itemObjectKey(provider, oauthId, id));
        writeState(provider, oauthId, activeIds, deletedBuiltinIds);
    }

    private StoredCustomReport resolveStored(OAuthProvider provider, String oauthId, String id) {
        if (BUILTIN_DEFAULT_ID.equals(id)) {
            CustomReportState state = readState(provider, oauthId);
            if (state.deletedBuiltinIds().contains(id)) {
                throw new CustomReportNotFoundException(id);
            }
            return BUILTIN_DEFAULT_PLUGIN;
        }

        return readStored(provider, oauthId, id);
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
                return new CustomReportState(List.of(pointer.id()), List.of(), pointer.updatedAt());
            } catch (IOException ex) {
                throw new IllegalStateException("Could not deserialize legacy custom report pointer.", ex);
            }
        }

        return emptyState();
    }

    private CustomReportState normalizeState(CustomReportState state) {
        return new CustomReportState(
                List.copyOf(new LinkedHashSet<>(state.activeIds() == null ? List.of() : state.activeIds())),
                List.copyOf(new LinkedHashSet<>(
                        state.deletedBuiltinIds() == null ? List.of() : state.deletedBuiltinIds())),
                state.updatedAt());
    }

    private CustomReportState emptyState() {
        return new CustomReportState(List.of(), List.of(), null);
    }

    private void writeState(
            OAuthProvider provider,
            String oauthId,
            Set<String> activeIds,
            Set<String> deletedBuiltinIds) {
        if (activeIds.isEmpty() && deletedBuiltinIds.isEmpty()) {
            objectStorageService.delete(storageProperties.getBucket(), stateObjectKey(provider, oauthId));
            objectStorageService.delete(storageProperties.getBucket(), legacyActiveObjectKey(provider, oauthId));
            return;
        }

        try {
            CustomReportState state = new CustomReportState(
                    List.copyOf(activeIds),
                    List.copyOf(deletedBuiltinIds),
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
            List<String> deletedBuiltinIds,
            OffsetDateTime updatedAt) {
    }
}
