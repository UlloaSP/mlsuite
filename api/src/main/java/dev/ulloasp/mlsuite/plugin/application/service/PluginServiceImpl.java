package dev.ulloasp.mlsuite.plugin.application.service;

import static dev.ulloasp.mlsuite.plugin.application.service.PluginCatalogValues.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.databind.ObjectMapper;

import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.plugin.adapter.out.persistence.repository.PluginMetadataRepository;
import dev.ulloasp.mlsuite.plugin.application.dto.PluginDto;
import dev.ulloasp.mlsuite.util.PageDto;
import dev.ulloasp.mlsuite.plugin.application.dto.PluginStatsDto;
import dev.ulloasp.mlsuite.plugin.application.port.in.PluginCatalogUseCase;
import dev.ulloasp.mlsuite.plugin.domain.model.PluginMetadata;
import dev.ulloasp.mlsuite.plugin.domain.model.PluginStoragePaths;
import dev.ulloasp.mlsuite.plugin.domain.model.StoredPlugin;
import dev.ulloasp.mlsuite.storage.ObjectStorageService;
import dev.ulloasp.mlsuite.storage.StorageProperties;
import dev.ulloasp.mlsuite.storage.StoredObject;
import dev.ulloasp.mlsuite.storage.StorageDeletionQueue;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PluginServiceImpl implements PluginCatalogUseCase {

    private static final String ROOT_PREFIX = "plugins";
    private final ObjectStorageService objectStorageService;
    private final StorageProperties storageProperties;
    private final ObjectMapper objectMapper;
    private final UserLookupService userLookupService;
    private final WorkspaceAuthorizationService workspaceAuthorizationService;
    private final PluginMetadataRepository pluginMetadataRepository;
    private final StorageDeletionQueue deletionQueue;
    private final PluginObjectReader pluginObjects;
    private final OrganizationRepository organizations;

    @Override
    @Transactional
    public PluginDto upload(Long userId, MultipartFile file) {
        User user = userLookupService.requireById(userId);
        Organization organization = workspaceAuthorizationService.requireCurrent(userId, PermissionKey.MANAGE_PLUGINS);
        organizations.lockById(organization.getId()).orElseThrow();
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
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCompletion(int status) {
                    if (status != STATUS_COMMITTED) {
                        objectStorageService.delete(uploaded.bucket(), uploaded.objectKey(), uploaded.versionId());
                    }
                }
            });
            persistMetadata(organization, stored, user, uploaded, null);
            return toDto(stored);
        } catch (IOException ex) {
            throw new IllegalStateException("Could not serialize plugin.", ex);
        }
    }

    @Override
    @Transactional
    public PageDto<PluginDto> list(Long userId, int page, int size, String type, String search, String sort) {
        List<PluginDto> allItems = listAll(userId);
        List<PluginDto> visibleItems = allItems.stream()
                .filter(item -> matchesType(item, type))
                .filter(item -> matchesSearch(item, search))
                .sorted(sortComparator(sort))
                .toList();
        int safePage = Math.max(page, 0);
        int safeSize = PageDto.clampSize(size);
        int fromIndex = Math.min(safePage * safeSize, visibleItems.size());
        int toIndex = Math.min(fromIndex + safeSize, visibleItems.size());
        return new PageDto<>(
                visibleItems.subList(fromIndex, toIndex),
                safePage,
                safeSize,
                visibleItems.size(),
                toIndex < visibleItems.size());
    }

    @Override
    @Transactional
    public PluginStatsDto stats(Long userId) {
        List<PluginDto> allItems = listAll(userId);
        return new PluginStatsDto(
                allItems.stream().filter(item -> "field".equals(item.pluginType())).count(),
                allItems.stream().filter(item -> "report".equals(item.pluginType())).count());
    }

    private List<PluginDto> listAll(Long userId) {
        Organization organization = workspaceAuthorizationService.requireCurrent(userId, PermissionKey.VIEW_PLUGINS);
        // Catalog backfill and deletion must agree on one visible plugin state.
        organizations.lockById(organization.getId()).orElseThrow();
        List<PluginDto> catalog = new ArrayList<>();
        pluginObjects.listWithIdentity(organization.getId()).forEach(item -> {
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
        Organization organization = workspaceAuthorizationService.requireCurrent(userId, PermissionKey.MANAGE_PLUGINS);
        organizations.lockById(organization.getId()).orElseThrow();
        // Loading proves the plugin exists and is intact before deletion is queued.
        pluginObjects.load(organization.getId(), id);
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

    private String itemObjectKey(Long organizationId, String id) {
        return PluginStoragePaths.organizationItemObjectKey(ROOT_PREFIX, organizationId, id);
    }

    private String sanitizeFileName(String value) {
        return value == null || value.isBlank() ? "plugin.ts" : value.strip();
    }

    private String normalizeContentType(String value) {
        return value == null || value.isBlank() ? "application/typescript" : value;
    }

}
