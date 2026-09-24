package dev.ulloasp.mlsuite.plugin.application.service;

import static dev.ulloasp.mlsuite.plugin.application.service.PluginCatalogValues.*;

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
import dev.ulloasp.mlsuite.plugin.domain.model.PluginMetadata;
import dev.ulloasp.mlsuite.plugin.domain.model.PluginStoragePaths;
import dev.ulloasp.mlsuite.plugin.domain.model.StoredPlugin;
import dev.ulloasp.mlsuite.storage.ObjectStorageService;
import dev.ulloasp.mlsuite.storage.StorageProperties;
import dev.ulloasp.mlsuite.storage.StoredObject;
import dev.ulloasp.mlsuite.storage.StorageDeletionQueue;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import org.springframework.transaction.annotation.Transactional;

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
    private final PluginObjectReader pluginObjects;
    private final ObjectStorageService objectStorageService;
    private final StorageProperties storageProperties;
    private final ObjectMapper objectMapper;
    private final UserLookupService userLookupService;
    private final WorkspaceAccessService workspaceAccessService;
    private final WorkspaceAuthorizationService workspaceAuthorizationService;
    private final PluginMetadataRepository pluginMetadataRepository;
    private final StorageDeletionQueue deletionQueue;

    public PluginServiceImpl(
            ObjectStorageService objectStorageService,
            StorageProperties storageProperties,
            ObjectMapper objectMapper,
            UserLookupService userLookupService,
            WorkspaceAccessService workspaceAccessService,
            WorkspaceAuthorizationService workspaceAuthorizationService,
            PluginMetadataRepository pluginMetadataRepository,
            StorageDeletionQueue deletionQueue) {
        this.pluginObjects = new PluginObjectReader(
                objectStorageService, storageProperties, objectMapper, pluginMetadataRepository);
        this.objectStorageService = objectStorageService;
        this.storageProperties = storageProperties;
        this.objectMapper = objectMapper;
        this.userLookupService = userLookupService;
        this.workspaceAccessService = workspaceAccessService;
        this.workspaceAuthorizationService = workspaceAuthorizationService;
        this.pluginMetadataRepository = pluginMetadataRepository;
        this.deletionQueue = deletionQueue;
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
            StoredObject uploaded = objectStorageService.store(
                    itemObjectKey(organization.getId(), id),
                    stored.fileName(),
                    "application/json",
                    objectMapper.writeValueAsBytes(stored));
            try {
                persistMetadata(organization, stored, user, uploaded, null);
            } catch (RuntimeException ex) {
                objectStorageService.delete(uploaded.bucket(), uploaded.objectKey(), uploaded.versionId());
                throw ex;
            }
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
        Map<String, PluginObjectReader.ReadPlugin> storedItems = new LinkedHashMap<>();
        Map<String, String> origins = new LinkedHashMap<>();
        pluginObjects.listWithIdentity(organization.getId())
                .forEach(item -> putStored(storedItems, origins, item, ROOT_PREFIX, true));
        List<PluginDto> catalog = new ArrayList<>();
        storedItems.values().forEach(item -> {
            persistMetadata(organization, item.plugin(), null, null, item);
            catalog.add(toDto(item.plugin()));
        });
        catalog.sort(Comparator
                .comparing(PluginDto::updatedAt, Comparator.reverseOrder())
                .thenComparing(PluginDto::fileName, String.CASE_INSENSITIVE_ORDER));
        return catalog;
    }

    @Override
    @Transactional
    public void delete(Long userId, String id) {
        User user = userLookupService.requireById(userId);
        Organization organization = workspaceAccessService.requireCurrentOrganization(userId);
        workspaceAuthorizationService.requirePluginManage(userId, organization.getId());
        readStored(user, id);
        Optional<PluginMetadata> metadata = pluginMetadataRepository.findByIdAndOrganizationId(id, organization.getId());
        deletionQueue.enqueue(
                storageProperties.getBucket(),
                itemObjectKey(organization.getId(), id),
                metadata.map(PluginMetadata::getStorageVersionId).orElse(null));
        metadata.ifPresent(pluginMetadataRepository::delete);
    }

    private void persistMetadata(
            Organization organization,
            StoredPlugin stored,
            User updatedBy,
            StoredObject uploaded,
            PluginObjectReader.ReadPlugin read) {
        PluginDescriptor descriptor = describe(stored.source());
        Optional<PluginMetadata> existing = pluginMetadataRepository
                .findByIdAndOrganizationId(stored.id(), organization.getId());
        if (uploaded == null && existing.isPresent()) {
            return;
        }
        PluginMetadata metadata = existing.orElseGet(PluginMetadata::new);
        metadata.setId(stored.id());
        metadata.setOrganization(organization);
        metadata.setObjectKey(itemObjectKey(organization.getId(), stored.id()));
        metadata.setFileName(stored.fileName());
        metadata.setContentType(stored.contentType());
        metadata.setSizeBytes(stored.sizeBytes());
        metadata.setCreatedAt(stored.createdAt());
        metadata.setUpdatedAt(stored.updatedAt());
        if (updatedBy != null) {
            metadata.setUpdatedBy(updatedBy);
        }
        metadata.setPluginType(descriptor.type());
        metadata.setKind(descriptor.kind());
        if (uploaded != null) {
            metadata.setSizeBytes(uploaded.sizeBytes());
            metadata.setSha256(uploaded.sha256());
            metadata.setStorageVersionId(uploaded.versionId());
        } else if (read != null) {
            metadata.setSizeBytes(read.sizeBytes());
            metadata.setSha256(read.sha256());
            metadata.setStorageVersionId(read.versionId());
        }
        pluginMetadataRepository.save(metadata);
    }

    private StoredPlugin readStored(User user, String id) {
        Long organizationId = workspaceAccessService.requireCurrentOrganization(user.getId()).getId();
        return pluginObjects.load(organizationId, id);
    }

    private void putStored(
            Map<String, PluginObjectReader.ReadPlugin> storedItems,
            Map<String, String> origins,
            PluginObjectReader.ReadPlugin item,
            String origin,
            boolean replaceExisting) {
        String id = item.plugin().id();
        String existingOrigin = origins.get(id);
        if (existingOrigin == null || replaceExisting) {
            storedItems.put(id, item);
            origins.put(id, origin);
            return;
        }
        if (!ROOT_PREFIX.equals(existingOrigin) && !existingOrigin.equals(origin)) {
            throw new IllegalStateException("Duplicate legacy plugin id '" + id + "' detected across storage roots.");
        }
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

}
