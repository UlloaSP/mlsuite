package dev.ulloasp.mlsuite.schema.application.service;

import dev.ulloasp.mlsuite.plugin.application.port.in.SnapshotPluginsUseCase;
import dev.ulloasp.mlsuite.principal.application.service.Principals;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.audit.domain.model.AuditDetails;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaModelBindingRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaDraftRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaVersionRepository;
import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaRequest;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaCatalogItemDto;
import dev.ulloasp.mlsuite.util.CatalogValues;
import dev.ulloasp.mlsuite.util.PageDto;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaCatalogUseCase;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaModelBinding;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@Transactional
@RequiredArgsConstructor
public class SchemaServiceImpl implements SchemaCatalogUseCase {

    private final UserLookupService userLookupService;
    private final SchemaRepository schemaRepository;
    private final SchemaVersionRepository versionRepository;
    private final SchemaModelBindingRepository bindingRepository;
    private final WorkspaceAuthorizationService authorizationService;
    private final SchemaDraftRepository draftRepository;
    private final SchemaBookmarkRepository bookmarkRepository;
    private final AuditLogService auditLog;
    private final Principals principals;
    private final SnapshotPluginsUseCase snapshotPlugins;

    @Override
    public Schema createSchema(Long userId, CreateSchemaRequest request) {
        User user = userLookupService.requireById(userId);
        Organization organization = authorizationService.requireCurrent(userId, PermissionKey.CREATE_MODELS);
        String name = normalizeName(request.name());
        Schema schema = new Schema(organization, name, normalizeDescription(request.description()), principals.of(user));
        Schema saved = schemaRepository.save(schema);
        auditLog.record(AuditActor.user(userId), organization.getId(), AuditAction.SCHEMA_CREATE, saved.getId(),
                AuditDetails.of("name", name));
        return saved;
    }

    /** Returns an archived schema to the active catalog, where it runs and may be published again. */
    @Override
    public Schema restoreSchema(Long userId, Long schemaId) {
        User user = userLookupService.requireById(userId);
        Organization organization = authorizationService.requireCurrent(userId, PermissionKey.EDIT_MODELS);
        Schema schema = requireSchema(schemaId, organization.getId());
        if (schema.getArchivedAt() != null) {
            auditLog.record(AuditActor.user(userId), organization.getId(), AuditAction.SCHEMA_RESTORE, schemaId,
                    AuditDetails.of("name", schema.getName()));
        }
        schema.setArchivedAt(null);
        schema.setUpdatedBy(principals.of(user));
        return schemaRepository.save(schema);
    }

    @Override
    public List<Schema> listSchemas(Long userId) {
        Long organizationId = authorizationService.requireCurrent(userId, PermissionKey.VIEW_MODELS).getId();
        return schemaRepository.findByOrganizationIdAndArchivedAtIsNullOrderByCreatedAtDesc(organizationId);
    }

    @Override
    public PageDto<SchemaCatalogItemDto> getSchemaPage(Long userId, int page, int size, String search, String sort, String status) {
        Long organizationId = authorizationService.requireCurrent(userId, PermissionKey.VIEW_MODELS).getId();
        CatalogValues.require("status", status, List.of("active", "archived", "all"));
        Page<Schema> schemas = schemaRepository.findCatalogPage(
                organizationId,
                normalizeSearch(search),
                "all".equals(status) || "archived".equals(status),
                "archived".equals(status),
                PageDto.request(page, size, sort(sort)));
        return PageDto.of(schemas, schemas.getContent().stream().map(this::catalogItem).toList());
    }

    @Override
    public Schema getSchema(Long userId, Long schemaId) {
        Long organizationId = authorizationService.requireCurrent(userId, PermissionKey.VIEW_MODELS).getId();
        return requireSchema(schemaId, organizationId);
    }

    @Override
    public Schema renameSchema(Long userId, Long schemaId, String name) {
        User user = userLookupService.requireById(userId);
        Organization organization = authorizationService.requireCurrent(userId, PermissionKey.EDIT_MODELS);
        Schema schema = requireSchema(schemaId, organization.getId());
        String nextName = normalizeName(name);
        auditLog.record(AuditActor.user(userId), organization.getId(), AuditAction.SCHEMA_RENAME, schemaId,
                AuditDetails.of("name", AuditDetails.changed(schema.getName(), nextName)));
        schema.setName(nextName);
        schema.setUpdatedBy(principals.of(user));
        return schemaRepository.save(schema);
    }

    @Override
    public Schema archiveSchema(Long userId, Long schemaId) {
        User user = userLookupService.requireById(userId);
        Organization organization = authorizationService.requireCurrent(userId, PermissionKey.EDIT_MODELS);
        Schema schema = requireSchema(schemaId, organization.getId());
        if (schema.getArchivedAt() == null) {
            schema.setArchivedAt(OffsetDateTime.now(ZoneOffset.UTC));
            bookmarkRepository.findBySchemaIdOrderByNameAsc(schemaId).forEach(SchemaBookmark::unpin);
            auditLog.record(AuditActor.user(userId), organization.getId(), AuditAction.SCHEMA_ARCHIVE, schemaId,
                    AuditDetails.of("name", schema.getName()));
        }
        schema.setUpdatedBy(principals.of(user));
        return schemaRepository.save(schema);
    }

    @Override
    public Schema duplicateSchema(Long userId, Long schemaId, Long sourceVersionId, String name) {
        User user = userLookupService.requireById(userId);
        Organization organization = authorizationService.requireCurrent(userId, PermissionKey.CREATE_MODELS);
        Schema source = requireSchema(schemaId, organization.getId());
        String nextName = normalizeName(name);
        Schema copy = new Schema(organization, nextName, source.getDescription(), principals.of(user));
        SchemaVersion sourceVersion = resolveSourceVersion(schemaId, organization.getId(), sourceVersionId);
        Schema savedCopy = schemaRepository.save(copy);
        if (sourceVersion != null) copyVersion(savedCopy, sourceVersion);
        auditLog.record(AuditActor.user(userId), organization.getId(), AuditAction.SCHEMA_DUPLICATE, savedCopy.getId(),
                AuditDetails.of("name", nextName, "source", source.getName(), "sourceSchemaId", schemaId));
        return savedCopy;
    }

    @Override
    public void deleteSchema(Long userId, Long schemaId) {
        Organization organization = authorizationService.requireCurrent(userId, PermissionKey.DELETE_MODELS);
        Schema schema = requireSchema(schemaId, organization.getId());
        // The database keeps a schema with runs (its snapshots' bindings refuse to go) or reviews (their keys).
        draftRepository.deleteBySchemaId(schemaId);
        bookmarkRepository.deleteBySchemaId(schemaId);
        versionRepository.findBySchemaIdOrderByVersionDesc(schemaId).forEach(version -> {
            bindingRepository.findBySchemaVersionId(version.getId()).forEach(bindingRepository::delete);
            versionRepository.delete(version);
        });
        schemaRepository.delete(schema);
        auditLog.record(AuditActor.user(userId), organization.getId(), AuditAction.SCHEMA_DELETE, schemaId,
                AuditDetails.of("name", schema.getName()));
    }

    private void copyVersion(Schema copy, SchemaVersion source) {
        SchemaVersion version = versionRepository.save(
                new SchemaVersion(copy, 1, source.getName(), source.getFormSchema(), copy.getCreatedBy()));
        for (SchemaModelBinding binding : bindingRepository.findBySchemaVersionId(source.getId())) {
            bindingRepository.save(new SchemaModelBinding(version, binding.getModel(), binding.getPluginPolicy()));
        }
        bindingRepository.flush();
        snapshotPlugins.copy(source.getId(), version.getId());
    }

    private SchemaVersion resolveSourceVersion(Long schemaId, Long organizationId, Long sourceVersionId) {
        if (sourceVersionId == null) {
            return versionRepository.findTopBySchemaIdOrderByVersionDesc(schemaId).orElse(null);
        }
        SchemaVersion version = versionRepository.findByIdAndOrganizationId(sourceVersionId, organizationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Schema snapshot not found"));
        if (!version.getSchema().getId().equals(schemaId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Snapshot outside schema");
        }
        return version;
    }

    private SchemaCatalogItemDto catalogItem(Schema schema) {
        return versionRepository.findTopBySchemaIdOrderByVersionDesc(schema.getId())
                .map(version -> SchemaCatalogItemDto.from(
                        schema,
                        version,
                        bindingRepository.countBySchemaVersionId(version.getId())))
                .orElseGet(() -> SchemaCatalogItemDto.from(schema, null, 0));
    }

    private Schema requireSchema(Long schemaId, Long organizationId) {
        return schemaRepository.findByIdAndOrganizationId(schemaId, organizationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Schema not found"));
    }

    private String normalizeName(String name) {
        if (name == null || name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Schema name is required");
        }
        return name.strip();
    }

    private String normalizeDescription(String description) {
        if (description == null || description.isBlank()) {
            return null;
        }
        return description.strip();
    }

    private String normalizeSearch(String search) {
        return search == null ? "" : search.strip();
    }

    private Sort sort(String mode) {
        Sort.Order byId = Sort.Order.asc("id");
        return switch (mode) {
            case "updated" -> Sort.by(Sort.Order.desc("updatedAt"), Sort.Order.asc("name").ignoreCase(), byId);
            case "created" -> Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("name").ignoreCase(), byId);
            case "name" -> Sort.by(Sort.Order.asc("name").ignoreCase(), Sort.Order.desc("updatedAt"), byId);
            default -> throw CatalogValues.unknown("sort", mode, List.of("updated", "created", "name"));
        };
    }
}
