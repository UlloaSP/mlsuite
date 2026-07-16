package dev.ulloasp.mlsuite.plugin.application.service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.databind.ObjectMapper;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.plugin.adapter.out.persistence.repository.PluginMetadataRepository;
import dev.ulloasp.mlsuite.plugin.application.dto.PluginDto;
import dev.ulloasp.mlsuite.plugin.application.dto.PluginPageDto;
import dev.ulloasp.mlsuite.plugin.application.dto.PluginStatsDto;
import dev.ulloasp.mlsuite.plugin.application.port.in.DeletePluginUseCase;
import dev.ulloasp.mlsuite.plugin.application.port.in.GetPluginStatsUseCase;
import dev.ulloasp.mlsuite.plugin.application.port.in.ListPluginsUseCase;
import dev.ulloasp.mlsuite.plugin.application.port.in.PluginCatalogUseCase;
import dev.ulloasp.mlsuite.plugin.application.port.in.UploadPluginUseCase;
import dev.ulloasp.mlsuite.plugin.domain.exception.PluginNotFoundException;
import dev.ulloasp.mlsuite.plugin.domain.model.PluginMetadata;
import dev.ulloasp.mlsuite.plugin.domain.model.PluginStoragePaths;
import dev.ulloasp.mlsuite.plugin.domain.model.StoredPlugin;
import dev.ulloasp.mlsuite.storage.ObjectStorageService;
import dev.ulloasp.mlsuite.storage.StorageProperties;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@Service
public class PluginServiceImpl implements
        UploadPluginUseCase,
        ListPluginsUseCase,
        GetPluginStatsUseCase,
        DeletePluginUseCase,
        PluginCatalogUseCase {

    private static final String ROOT_PREFIX = "plugins";
    private static final int DEFAULT_PAGE_SIZE = 24;
    private static final int MAX_PAGE_SIZE = 100;
    private static final Pattern FIELD_KIND = Pattern.compile(
            "defineField(?:Kind|Definition)\\s*\\([^)]*kind\\s*:\\s*['\"]([^'\"]+)['\"]",
            Pattern.DOTALL);
    private static final Pattern REPORT_KIND = Pattern.compile(
            "defineReport(?:Kind|Definition)\\s*\\([^)]*kind\\s*:\\s*['\"]([^'\"]+)['\"]",
            Pattern.DOTALL);

    private final ObjectStorageService objectStorageService;
    private final StorageProperties storageProperties;
    private final ObjectMapper objectMapper;
    private final UserLookupService userLookupService;
    private final WorkspaceAccessService workspaceAccessService;
    private final WorkspaceAuthorizationService workspaceAuthorizationService;
    private final PluginMetadataRepository pluginMetadataRepository;

    public PluginServiceImpl(
            ObjectStorageService objectStorageService,
            StorageProperties storageProperties,
            ObjectMapper objectMapper,
            UserLookupService userLookupService,
            WorkspaceAccessService workspaceAccessService,
            WorkspaceAuthorizationService workspaceAuthorizationService,
            PluginMetadataRepository pluginMetadataRepository) {
        this.objectStorageService = objectStorageService;
        this.storageProperties = storageProperties;
        this.objectMapper = objectMapper;
        this.userLookupService = userLookupService;
        this.workspaceAccessService = workspaceAccessService;
        this.workspaceAuthorizationService = workspaceAuthorizationService;
        this.pluginMetadataRepository = pluginMetadataRepository;
    }

    @Override
    public PluginDto upload(Long userId, MultipartFile file) {
        User user = userLookupService.requireById(userId);
        Organization organization = workspaceAccessService.requireCurrentOrganization(userId);
        workspaceAuthorizationService.requirePluginManage(userId, organization.getId());
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
                    user.getFullName(),
                    user.getEmail(),
                    user.getAvatarUrl(),
                    new String(file.getBytes(), StandardCharsets.UTF_8));
            objectStorageService.store(
                    itemObjectKey(organization.getId(), id),
                    stored.fileName(),
                    "application/json",
                    objectMapper.writeValueAsBytes(stored));
            persistMetadata(organization, stored, user);
            return toDto(stored);
        } catch (IOException ex) {
            throw new IllegalStateException("Could not serialize plugin.", ex);
        }
    }

    @Override
    public PluginPageDto list(Long userId, int page, int size, String type, String search, String sort) {
        List<PluginDto> allItems = listAll(userId);
        List<PluginDto> visibleItems = allItems.stream()
                .filter(item -> matchesType(item, type))
                .filter(item -> matchesSearch(item, search))
                .sorted(sortComparator(sort))
                .toList();
        int safePage = Math.max(page, 0);
        int safeSize = normalizePageSize(size);
        int fromIndex = Math.min(safePage * safeSize, visibleItems.size());
        int toIndex = Math.min(fromIndex + safeSize, visibleItems.size());
        return new PluginPageDto(
                visibleItems.subList(fromIndex, toIndex),
                safePage,
                safeSize,
                visibleItems.size(),
                toIndex < visibleItems.size());
    }

    @Override
    public PluginStatsDto stats(Long userId) {
        List<PluginDto> allItems = listAll(userId);
        return new PluginStatsDto(
                allItems.stream().filter(item -> "field".equals(item.pluginType())).count(),
                allItems.stream().filter(item -> "report".equals(item.pluginType())).count());
    }

    @Override
    public List<PluginDto> listAll(Long userId) {
        Organization organization = workspaceAccessService.requireCurrentOrganization(userId);
        workspaceAuthorizationService.requirePluginView(userId, organization.getId());
        Map<String, StoredPlugin> storedItems = new LinkedHashMap<>();
        Map<String, String> origins = new LinkedHashMap<>();
        readItems(itemsPrefix(organization.getId()))
                .forEach(item -> putStored(storedItems, origins, item, ROOT_PREFIX, true));
        List<PluginDto> catalog = new ArrayList<>();
        storedItems.values().forEach(item -> {
            persistMetadata(organization, item, null);
            catalog.add(toDto(item));
        });
        catalog.sort(Comparator
                .comparing(PluginDto::updatedAt, Comparator.reverseOrder())
                .thenComparing(PluginDto::fileName, String.CASE_INSENSITIVE_ORDER));
        return catalog;
    }

    @Override
    public void delete(Long userId, String id) {
        User user = userLookupService.requireById(userId);
        Organization organization = workspaceAccessService.requireCurrentOrganization(userId);
        workspaceAuthorizationService.requirePluginManage(userId, organization.getId());
        readStored(user, id);
        objectStorageService.delete(storageProperties.getBucket(), itemObjectKey(organization.getId(), id));
        pluginMetadataRepository.findByIdAndOrganizationId(id, organization.getId())
                .ifPresent(pluginMetadataRepository::delete);
    }

    private void persistMetadata(Organization organization, StoredPlugin stored, User updatedBy) {
        PluginDescriptor descriptor = describe(stored.source());
        pluginMetadataRepository.save(new PluginMetadata(
                stored.id(),
                organization,
                itemObjectKey(organization.getId(), stored.id()),
                stored.fileName(),
                stored.contentType(),
                stored.sizeBytes(),
                stored.createdAt(),
                stored.updatedAt(),
                updatedBy,
                descriptor.type(),
                descriptor.kind()));
    }

    private StoredPlugin readStored(User user, String id) {
        Long organizationId = workspaceAccessService.requireCurrentOrganization(user.getId()).getId();
        Optional<byte[]> bytes =
                objectStorageService.loadOptional(storageProperties.getBucket(), itemObjectKey(organizationId, id));
        if (bytes.isPresent()) {
            return readStored(bytes.get());
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
        if (existingOrigin == null || replaceExisting) {
            storedItems.put(item.id(), item);
            origins.put(item.id(), origin);
            return;
        }
        if (!ROOT_PREFIX.equals(existingOrigin) && !existingOrigin.equals(origin)) {
            throw new IllegalStateException("Duplicate legacy plugin id '" + item.id() + "' detected across storage roots.");
        }
    }

    private PluginDto toDto(StoredPlugin stored) {
        PluginDescriptor descriptor = describe(stored.source());
        return new PluginDto(
                stored.id(),
                stored.fileName(),
                stored.contentType(),
                stored.sizeBytes(),
                stored.createdAt(),
                stored.updatedAt(),
                stored.updatedByName(),
                stored.updatedByEmail(),
                stored.updatedByAvatarUrl(),
                stored.source(),
                descriptor.type(),
                descriptor.kind());
    }

    private PluginDescriptor describe(String source) {
        PluginDescriptor field = matchDescriptor(source, "field", FIELD_KIND);
        if (field != null) {
            return field;
        }
        PluginDescriptor report = matchDescriptor(source, "report", REPORT_KIND);
        if (report != null) {
            return report;
        }
        return new PluginDescriptor("invalid", null);
    }

    private PluginDescriptor matchDescriptor(String source, String type, Pattern pattern) {
        Matcher matcher = pattern.matcher(source);
        return matcher.find() ? new PluginDescriptor(type, matcher.group(1)) : null;
    }

    private boolean matchesType(PluginDto item, String type) {
        if ("field".equals(type) || "report".equals(type)) {
            return type.equals(item.pluginType());
        }
        return true;
    }

    private boolean matchesSearch(PluginDto item, String search) {
        String needle = search == null ? "" : search.strip().toLowerCase();
        if (needle.isEmpty()) {
            return true;
        }
        return item.fileName().toLowerCase().contains(needle)
                || (item.kind() != null && item.kind().toLowerCase().contains(needle));
    }

    private Comparator<PluginDto> sortComparator(String sort) {
        if ("name".equals(sort)) {
            return Comparator
                    .comparing((PluginDto item) -> displayName(item), String.CASE_INSENSITIVE_ORDER)
                    .thenComparing(PluginDto::updatedAt, Comparator.reverseOrder());
        }
        return Comparator
                .comparing(PluginDto::updatedAt, Comparator.reverseOrder())
                .thenComparing(PluginDto::fileName, String.CASE_INSENSITIVE_ORDER);
    }

    private String displayName(PluginDto item) {
        return item.kind() == null ? item.fileName() : item.kind();
    }

    private String itemsPrefix(Long organizationId) {
        return PluginStoragePaths.organizationItemsPrefix(ROOT_PREFIX, organizationId);
    }

    private String itemObjectKey(Long organizationId, String id) {
        return PluginStoragePaths.organizationItemObjectKey(ROOT_PREFIX, organizationId, id);
    }

    private int normalizePageSize(int size) {
        if (size <= 0) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(size, MAX_PAGE_SIZE);
    }

    private String sanitizeFileName(String value) {
        return value == null || value.isBlank() ? "plugin.ts" : value.strip();
    }

    private String normalizeContentType(String value) {
        return value == null || value.isBlank() ? "application/typescript" : value;
    }

    private record PluginDescriptor(String type, String kind) {
    }
}
