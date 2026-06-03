package dev.ulloasp.mlsuite.schema.application.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaRepository;
import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaRequest;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaCatalogUseCase;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import jakarta.transaction.Transactional;

@Service
@Transactional
public class SchemaServiceImpl implements SchemaCatalogUseCase {

    private final UserLookupService userLookupService;
    private final SchemaRepository schemaRepository;
    private final WorkspaceAccessService workspaceAccessService;
    private final WorkspaceAuthorizationService authorizationService;

    public SchemaServiceImpl(UserLookupService userLookupService, SchemaRepository schemaRepository,
            WorkspaceAccessService workspaceAccessService, WorkspaceAuthorizationService authorizationService) {
        this.userLookupService = userLookupService;
        this.schemaRepository = schemaRepository;
        this.workspaceAccessService = workspaceAccessService;
        this.authorizationService = authorizationService;
    }

    @Override
    public Schema createSchema(Long userId, CreateSchemaRequest request) {
        userLookupService.requireById(userId);
        Organization organization = workspaceAccessService.requireCurrentOrganization(userId);
        authorizationService.requireOrganizationOperate(userId, organization.getId());
        if (schemaRepository.existsByNameAndOrganizationId(request.name(), organization.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Schema name already exists");
        }
        return schemaRepository.save(new Schema(organization, request.name(), request.description()));
    }

    @Override
    public List<Schema> listSchemas(Long userId) {
        userLookupService.requireById(userId);
        Long organizationId = workspaceAccessService.requireCurrentOrganization(userId).getId();
        authorizationService.requireOrganizationRead(userId, organizationId);
        return schemaRepository.findByOrganizationIdOrderByCreatedAtDesc(organizationId);
    }

    @Override
    public Schema getSchema(Long userId, Long schemaId) {
        userLookupService.requireById(userId);
        Long organizationId = workspaceAccessService.requireCurrentOrganization(userId).getId();
        authorizationService.requireOrganizationRead(userId, organizationId);
        return schemaRepository.findByIdAndOrganizationId(schemaId, organizationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Schema not found"));
    }
}
