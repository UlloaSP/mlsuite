package dev.ulloasp.mlsuite.schema.application.service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaModelBindingRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaDraftRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaVersionRepository;
import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaRequest;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaCatalogItemDto;
import dev.ulloasp.mlsuite.util.PageDto;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaCatalogUseCase;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaModelBinding;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewRepository;
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
    private final PredictionRunRepository runRepository;
    private final SchemaReviewRepository reviewRepository;
    private final WorkspaceAuthorizationService authorizationService;
    private final SchemaDraftRepository draftRepository;
    private final SchemaBookmarkRepository bookmarkRepository;

    @Override
    public Schema createSchema(Long userId, CreateSchemaRequest request) {
        User user = userLookupService.requireById(userId);
        Organization organization = authorizationService.requireCurrent(userId, PermissionKey.CREATE_MODELS);
        String name = normalizeName(request.name());
        if (schemaRepository.existsByNameAndOrganizationId(name, organization.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Schema name already exists");
        }
        Schema schema = new Schema(organization, name, normalizeDescription(request.description()));
        schema.setCreatedBy(user);
        schema.setUpdatedBy(user);
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
        if (schemaRepository.existsByNameAndOrganizationIdAndIdNot(nextName, organization.getId(), schemaId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Schema name already exists");
        }
        schema.setName(nextName);
        schema.setUpdatedBy(user);
        return schemaRepository.save(schema);
    }

    @Override
    public Schema archiveSchema(Long userId, Long schemaId) {
        User user = userLookupService.requireById(userId);
        Organization organization = authorizationService.requireCurrent(userId, PermissionKey.EDIT_MODELS);
        Schema schema = requireSchema(schemaId, organization.getId());
        if (schema.getArchivedAt() == null) {
            schema.setArchivedAt(OffsetDateTime.now(ZoneOffset.UTC));
        }
        schema.setUpdatedBy(user);
        return schemaRepository.save(schema);
    }

    @Override
    public Schema duplicateSchema(Long userId, Long schemaId, Long sourceVersionId, String name) {
        User user = userLookupService.requireById(userId);
        Organization organization = authorizationService.requireCurrent(userId, PermissionKey.CREATE_MODELS);
        Schema source = requireSchema(schemaId, organization.getId());
        String nextName = normalizeName(name);
        if (schemaRepository.existsByNameAndOrganizationId(nextName, organization.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Schema name already exists");
        }
        Schema copy = new Schema(organization, nextName, source.getDescription());
        copy.setCreatedBy(user);
        copy.setUpdatedBy(user);
        SchemaVersion sourceVersion = resolveSourceVersion(schemaId, organization.getId(), sourceVersionId);
        Schema savedCopy = schemaRepository.save(copy);
        if (sourceVersion != null) copyVersion(savedCopy, sourceVersion);
        return savedCopy;
    }

    @Override
    public void deleteSchema(Long userId, Long schemaId) {
        Organization organization = authorizationService.requireCurrent(userId, PermissionKey.DELETE_MODELS);
        Schema schema = requireSchema(schemaId, organization.getId());
        if (runRepository.existsBySchemaId(schemaId) || reviewRepository.existsBySchemaId(schemaId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Schema is used by prediction runs or reviews. Archive it instead.");
        }
        draftRepository.deleteBySchemaId(schemaId);
        bookmarkRepository.deleteBySchemaId(schemaId);
        versionRepository.findBySchemaIdOrderByVersionDesc(schemaId).forEach(version -> {
            bindingRepository.findBySchemaVersionId(version.getId()).forEach(bindingRepository::delete);
            versionRepository.delete(version);
        });
        schemaRepository.delete(schema);
    }

    private void copyVersion(Schema copy, SchemaVersion source) {
        SchemaVersion version = versionRepository.save(
                new SchemaVersion(copy, 1, source.getName(), source.getFormSchema()));
        for (SchemaModelBinding binding : bindingRepository.findBySchemaVersionId(source.getId())) {
            Map<String, Object> policy = binding.getPluginPolicy() == null ? Map.of() : binding.getPluginPolicy();
            bindingRepository.save(new SchemaModelBinding(version, binding.getModel(), policy));
        }
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
        if ("name".equals(mode)) {
            return Sort.by(Sort.Order.asc("name").ignoreCase(), Sort.Order.desc("updatedAt"), byId);
        }
        if ("created".equals(mode)) {
            return Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("name").ignoreCase(), byId);
        }
        return Sort.by(Sort.Order.desc("updatedAt"), Sort.Order.asc("name").ignoreCase(), byId);
    }
}
