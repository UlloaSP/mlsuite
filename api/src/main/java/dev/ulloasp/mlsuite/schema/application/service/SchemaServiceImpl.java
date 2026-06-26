package dev.ulloasp.mlsuite.schema.application.service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaModelBindingRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaVersionRepository;
import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaRequest;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaCatalogItemDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaPageDto;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaCatalogUseCase;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaModelBinding;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewLinkRepository;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import jakarta.transaction.Transactional;

@Service
@Transactional
public class SchemaServiceImpl implements SchemaCatalogUseCase {

    private final UserLookupService userLookupService;
    private final SchemaRepository schemaRepository;
    private final SchemaVersionRepository versionRepository;
    private final SchemaModelBindingRepository bindingRepository;
    private final PredictionRunRepository runRepository;
    private final SchemaReviewLinkRepository reviewLinkRepository;
    private final WorkspaceAccessService workspaceAccessService;
    private final WorkspaceAuthorizationService authorizationService;

    public SchemaServiceImpl(UserLookupService userLookupService, SchemaRepository schemaRepository,
            SchemaVersionRepository versionRepository, SchemaModelBindingRepository bindingRepository,
            PredictionRunRepository runRepository, SchemaReviewLinkRepository reviewLinkRepository,
            WorkspaceAccessService workspaceAccessService, WorkspaceAuthorizationService authorizationService) {
        this.userLookupService = userLookupService;
        this.schemaRepository = schemaRepository;
        this.versionRepository = versionRepository;
        this.bindingRepository = bindingRepository;
        this.runRepository = runRepository;
        this.reviewLinkRepository = reviewLinkRepository;
        this.workspaceAccessService = workspaceAccessService;
        this.authorizationService = authorizationService;
    }

    @Override
    public Schema createSchema(Long userId, CreateSchemaRequest request) {
        User user = userLookupService.requireById(userId);
        Organization organization = workspaceAccessService.requireCurrentOrganization(userId);
        authorizationService.requireOrganizationOperate(userId, organization.getId());
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
        userLookupService.requireById(userId);
        Long organizationId = workspaceAccessService.requireCurrentOrganization(userId).getId();
        authorizationService.requireOrganizationRead(userId, organizationId);
        return schemaRepository.findByOrganizationIdAndArchivedAtIsNullOrderByCreatedAtDesc(organizationId);
    }

    @Override
    public SchemaPageDto getSchemaPage(Long userId, int page, int size, String search, String sort, String status) {
        userLookupService.requireById(userId);
        Long organizationId = workspaceAccessService.requireCurrentOrganization(userId).getId();
        authorizationService.requireOrganizationRead(userId, organizationId);
        Page<Schema> schemas = schemaRepository.findCatalogPage(
                organizationId,
                normalizeSearch(search),
                "all".equals(status) || "archived".equals(status),
                "archived".equals(status),
                PageRequest.of(Math.max(page, 0), normalizePageSize(size), sort(sort)));
        return new SchemaPageDto(
                schemas.getContent().stream().map(this::catalogItem).toList(),
                schemas.getNumber(),
                schemas.getSize(),
                schemas.getTotalElements(),
                schemas.hasNext());
    }

    @Override
    public Schema getSchema(Long userId, Long schemaId) {
        userLookupService.requireById(userId);
        Long organizationId = workspaceAccessService.requireCurrentOrganization(userId).getId();
        authorizationService.requireOrganizationRead(userId, organizationId);
        return requireSchema(schemaId, organizationId);
    }

    @Override
    public Schema renameSchema(Long userId, Long schemaId, String name) {
        User user = userLookupService.requireById(userId);
        Organization organization = workspaceAccessService.requireCurrentOrganization(userId);
        requireEdit(userId, organization.getId());
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
        Organization organization = workspaceAccessService.requireCurrentOrganization(userId);
        requireEdit(userId, organization.getId());
        Schema schema = requireSchema(schemaId, organization.getId());
        if (schema.getArchivedAt() == null) {
            schema.setArchivedAt(OffsetDateTime.now(ZoneOffset.UTC));
        }
        schema.setUpdatedBy(user);
        return schemaRepository.save(schema);
    }

    @Override
    public Schema duplicateSchema(Long userId, Long schemaId, String name) {
        User user = userLookupService.requireById(userId);
        Organization organization = workspaceAccessService.requireCurrentOrganization(userId);
        requireCreate(userId, organization.getId());
        Schema source = requireSchema(schemaId, organization.getId());
        String nextName = normalizeName(name);
        if (schemaRepository.existsByNameAndOrganizationId(nextName, organization.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Schema name already exists");
        }
        Schema copy = new Schema(organization, nextName, source.getDescription());
        copy.setCreatedBy(user);
        copy.setUpdatedBy(user);
        Schema savedCopy = schemaRepository.save(copy);
        versionRepository.findTopBySchemaIdOrderByVersionDesc(schemaId)
                .ifPresent(version -> copyVersion(savedCopy, version));
        return savedCopy;
    }

    @Override
    public void deleteSchema(Long userId, Long schemaId) {
        userLookupService.requireById(userId);
        Organization organization = workspaceAccessService.requireCurrentOrganization(userId);
        requireDelete(userId, organization.getId());
        Schema schema = requireSchema(schemaId, organization.getId());
        if (runRepository.existsBySchemaId(schemaId) || reviewLinkRepository.existsBySchemaId(schemaId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Schema is used by prediction runs or review links. Archive it instead.");
        }
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

    private void requireCreate(Long userId, Long organizationId) {
        if (!authorizationService.workspacePermissions(userId, organizationId).canEditModels()) {
            throw new OrganizationAccessDeniedException(organizationId);
        }
    }

    private void requireEdit(Long userId, Long organizationId) {
        if (!authorizationService.workspacePermissions(userId, organizationId).canEditModels()) {
            throw new OrganizationAccessDeniedException(organizationId);
        }
    }

    private void requireDelete(Long userId, Long organizationId) {
        if (!authorizationService.workspacePermissions(userId, organizationId).canDeleteModels()) {
            throw new OrganizationAccessDeniedException(organizationId);
        }
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

    private int normalizePageSize(int size) {
        if (size <= 0) {
            return 24;
        }
        return Math.min(size, 100);
    }

    private Sort sort(String mode) {
        if ("name".equals(mode)) {
            return Sort.by(Sort.Order.asc("name").ignoreCase(), Sort.Order.desc("updatedAt"));
        }
        if ("created".equals(mode)) {
            return Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("name").ignoreCase());
        }
        return Sort.by(Sort.Order.desc("updatedAt"), Sort.Order.asc("name").ignoreCase());
    }
}
