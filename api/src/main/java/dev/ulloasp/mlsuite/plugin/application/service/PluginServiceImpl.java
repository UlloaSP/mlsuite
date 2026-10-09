package dev.ulloasp.mlsuite.plugin.application.service;

import static dev.ulloasp.mlsuite.plugin.application.service.PluginCatalogValues.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.databind.ObjectMapper;

import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.plugin.adapter.out.persistence.repository.PluginMetadataRepository;
import dev.ulloasp.mlsuite.plugin.application.dto.PluginDto;
import dev.ulloasp.mlsuite.util.CatalogPages;
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

    private static final Logger log = LoggerFactory.getLogger(PluginServiceImpl.class);
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
        Organization organization = indexedCatalog(userId);
        String safeType = "field".equals(type) || "report".equals(type) ? type : "all";
        Page<PluginMetadata> result = pluginMetadataRepository.findCatalogPage(organization.getId(), safeType,
                CatalogPages.likeLiteral(search == null ? "" : search.strip()), sort == null ? "updated" : sort,
                PageDto.request(page, size, Sort.unsorted()));
        return PageDto.of(result, result.getContent().stream()
                .flatMap(item -> stored(organization.getId(), item.getId()).stream())
                .map(PluginCatalogValues::toDto)
                .toList());
    }

    /** A row whose object was deleted after the page was read, or never had one, is left out of the page. */
    private Optional<StoredPlugin> stored(Long organizationId, String id) {
        Optional<StoredPlugin> plugin = pluginObjects.find(organizationId, id);
        if (plugin.isEmpty()) {
            log.warn("Plugin {} of organization {} is listed without a stored object; skipping it", id,
                    organizationId);
        }
        return plugin;
    }

    @Override
    @Transactional
    public PluginStatsDto stats(Long userId) {
        Organization organization = indexedCatalog(userId);
        return new PluginStatsDto(
                pluginMetadataRepository.countByOrganizationIdAndPluginType(organization.getId(), "field"),
                pluginMetadataRepository.countByOrganizationIdAndPluginType(organization.getId(), "report"));
    }

    private Organization indexedCatalog(Long userId) {
        Organization organization = workspaceAuthorizationService.requireCurrent(userId, PermissionKey.VIEW_PLUGINS);
        if (!organization.isPluginCatalogIndexed()) {
            // Index legacy object-only plugins once, serialized with upload and deletion.
            organization = organizations.lockById(organization.getId()).orElseThrow();
            if (!organization.isPluginCatalogIndexed()) {
                Organization locked = organization;
                pluginObjects.listWithIdentity(organization.getId()).forEach(item ->
                        persistMetadata(locked, item.plugin(), null, null, item));
                organization.setPluginCatalogIndexed(true);
                organizations.save(organization);
            }
        }
        return organization;
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
