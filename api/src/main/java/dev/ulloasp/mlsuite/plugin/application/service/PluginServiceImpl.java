package dev.ulloasp.mlsuite.plugin.application.service;

import dev.ulloasp.mlsuite.plugin.domain.exception.PluginNotFoundException;
import dev.ulloasp.mlsuite.principal.application.service.Principals;
import dev.ulloasp.mlsuite.principal.domain.model.Principal;
import static dev.ulloasp.mlsuite.plugin.application.service.PluginCatalogValues.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import tools.jackson.databind.ObjectMapper;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.audit.domain.model.AuditDetails;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.plugin.adapter.out.persistence.repository.PluginMetadataRepository;
import dev.ulloasp.mlsuite.plugin.application.dto.PluginDto;
import dev.ulloasp.mlsuite.util.CatalogPages;
import dev.ulloasp.mlsuite.util.CatalogValues;
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
    private final AuditLogService auditLog;
    private final Principals principals;

    @Override
    @Transactional
    public PluginDto upload(Long userId, MultipartFile file) {
        User user = userLookupService.requireById(userId);
        Organization organization = workspaceAuthorizationService.requireCurrent(userId, PermissionKey.MANAGE_PLUGINS);
        organizations.lockById(organization.getId()).orElseThrow();
        try {
            String source = new String(file.getBytes(), StandardCharsets.UTF_8);
            if ("invalid".equals(PluginCatalogValues.describe(source).type())) {
                throw new IllegalArgumentException(
                        "This file is not a plugin: it must define an MLForm field or report renderer.");
            }
            String id = UUID.randomUUID().toString();
            OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
            StoredPlugin stored = new StoredPlugin(
                    id,
                    sanitizeFileName(file.getOriginalFilename()),
                    normalizeContentType(file.getContentType()),
                    file.getSize(),
                    now,
                    now,
                    source);
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
            PluginMetadata row = persistMetadata(organization, stored, principals.of(user), uploaded);
            auditLog.record(AuditActor.user(userId), organization.getId(), AuditAction.PLUGIN_UPLOAD, id,
                    AuditDetails.of("file", stored.fileName(), "sizeBytes", stored.sizeBytes()));
            return toDto(stored, row);
        } catch (IOException ex) {
            throw new IllegalStateException("Could not serialize plugin.", ex);
        }
    }

    @Override
    @Transactional
    public PageDto<PluginDto> list(Long userId, int page, int size, String type, String search, String sort) {
        Organization organization = workspaceAuthorizationService.requireCurrent(userId, PermissionKey.VIEW_PLUGINS);
        CatalogValues.require("type", type, List.of("all", "field", "report"));
        CatalogValues.require("sort", sort, List.of("updated", "name"));
        Page<PluginMetadata> result = pluginMetadataRepository.findCatalogPage(organization.getId(), type,
                CatalogPages.likeLiteral(search == null ? "" : search.strip()), sort,
                PageDto.request(page, size, Sort.unsorted()));
        return PageDto.of(result, result.getContent().stream()
                .flatMap(item -> stored(organization.getId(), item.getPublicId()).stream()
                        .map(stored -> toDto(stored, item)))
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
        Organization organization = workspaceAuthorizationService.requireCurrent(userId, PermissionKey.VIEW_PLUGINS);
        return new PluginStatsDto(
                pluginMetadataRepository.countByOrganizationIdAndPluginType(organization.getId(), "field"),
                pluginMetadataRepository.countByOrganizationIdAndPluginType(organization.getId(), "report"));
    }

    @Override
    @Transactional
    public void delete(Long userId, String id) {
        Organization organization = workspaceAuthorizationService.requireCurrent(userId, PermissionKey.MANAGE_PLUGINS);
        organizations.lockById(organization.getId()).orElseThrow();
        PluginMetadata plugin = pluginMetadataRepository.findByPublicIdAndOrganizationId(id, organization.getId())
                .orElseThrow(() -> new PluginNotFoundException(id));
        // Every revision of the key: a plugin's id is never used again.
        deletionQueue.enqueue(organization.getId(), plugin.getStorageBucket(), plugin.getObjectKey(), null);
        pluginMetadataRepository.delete(plugin);
        pluginMetadataRepository.flush();
        auditLog.record(AuditActor.user(userId), organization.getId(), AuditAction.PLUGIN_DELETE, id,
                AuditDetails.of("file", plugin.getFileName()));
    }

    /** The row that pins the stored object: its exact version, size and SHA-256. */
    private PluginMetadata persistMetadata(Organization organization, StoredPlugin stored, Principal author,
            StoredObject uploaded) {
        PluginDescriptor descriptor = describe(stored.source());
        PluginMetadata metadata = new PluginMetadata(stored.id(), organization,
                itemObjectKey(organization.getId(), stored.id()), stored.fileName(), stored.contentType(),
                uploaded.sizeBytes(), stored.createdAt(), stored.updatedAt(), author, descriptor.type(),
                descriptor.kind());
        metadata.setStorageBucket(uploaded.bucket());
        metadata.setSha256(uploaded.sha256());
        metadata.setStorageVersionId(uploaded.versionId());
        pluginMetadataRepository.save(metadata);
        return metadata;
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
