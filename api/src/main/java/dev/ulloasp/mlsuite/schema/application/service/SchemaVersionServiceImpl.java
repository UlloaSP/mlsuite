package dev.ulloasp.mlsuite.schema.application.service;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaModelBindingRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaVersionRepository;
import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaModelBindingRequest;
import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaVersionRequest;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaVersionUseCase;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaModelBinding;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import jakarta.transaction.Transactional;

@Service
@Transactional
public class SchemaVersionServiceImpl implements SchemaVersionUseCase {

    private final UserLookupService userLookupService;
    private final SchemaRepository schemaRepository;
    private final SchemaVersionRepository versionRepository;
    private final SchemaModelBindingRepository bindingRepository;
    private final ModelRepository modelRepository;
    private final WorkspaceAccessService workspaceAccessService;
    private final WorkspaceAuthorizationService authorizationService;

    public SchemaVersionServiceImpl(UserLookupService userLookupService, SchemaRepository schemaRepository,
            SchemaVersionRepository versionRepository, SchemaModelBindingRepository bindingRepository,
            ModelRepository modelRepository,
            WorkspaceAccessService workspaceAccessService, WorkspaceAuthorizationService authorizationService) {
        this.userLookupService = userLookupService;
        this.schemaRepository = schemaRepository;
        this.versionRepository = versionRepository;
        this.bindingRepository = bindingRepository;
        this.modelRepository = modelRepository;
        this.workspaceAccessService = workspaceAccessService;
        this.authorizationService = authorizationService;
    }

    @Override
    public SchemaVersion createVersion(Long userId, Long schemaId, CreateSchemaVersionRequest request) {
        Long organizationId = requireOperate(userId);
        validateFormSchema(request.formSchema());
        Schema schema = requireSchema(schemaId, organizationId);
        assertUniqueBindings(request.bindings());
        int nextVersion = versionRepository.findMaxVersionBySchemaId(schemaId) + 1;
        SchemaVersion version = versionRepository.save(
                new SchemaVersion(schema, nextVersion, request.name(), request.formSchema()));
        request.bindings().forEach(binding -> saveBinding(organizationId, version, binding));
        return version;
    }

    @Override
    public List<SchemaVersion> listVersions(Long userId, Long schemaId) {
        Long organizationId = requireRead(userId);
        requireSchema(schemaId, organizationId);
        return versionRepository.findBySchemaIdOrderByVersionDesc(schemaId);
    }

    @Override
    public SchemaVersion getVersion(Long userId, Long versionId) {
        Long organizationId = requireRead(userId);
        return requireVersion(versionId, organizationId);
    }

    @Override
    public SchemaModelBinding addBinding(Long userId, Long versionId, CreateSchemaModelBindingRequest request) {
        Long organizationId = requireOperate(userId);
        SchemaVersion version = requireVersion(versionId, organizationId);
        if (bindingRepository.findBinding(versionId, request.modelId()).isPresent()) {
            throw badRequest("Binding already exists");
        }
        return saveBinding(organizationId, version, request);
    }

    @Override
    public List<SchemaModelBinding> listBindings(Long userId, Long versionId) {
        Long organizationId = requireRead(userId);
        requireVersion(versionId, organizationId);
        return bindingRepository.findBySchemaVersionId(versionId);
    }

    private Long requireRead(Long userId) {
        userLookupService.requireById(userId);
        Long organizationId = workspaceAccessService.requireCurrentOrganization(userId).getId();
        authorizationService.requireOrganizationRead(userId, organizationId);
        return organizationId;
    }

    private Long requireOperate(Long userId) {
        userLookupService.requireById(userId);
        Long organizationId = workspaceAccessService.requireCurrentOrganization(userId).getId();
        authorizationService.requireOrganizationOperate(userId, organizationId);
        return organizationId;
    }

    private Schema requireSchema(Long schemaId, Long organizationId) {
        return schemaRepository.findByIdAndOrganizationId(schemaId, organizationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Schema not found"));
    }

    private SchemaVersion requireVersion(Long versionId, Long organizationId) {
        return versionRepository.findByIdAndOrganizationId(versionId, organizationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Schema version not found"));
    }

    private SchemaModelBinding saveBinding(Long orgId, SchemaVersion version, CreateSchemaModelBindingRequest req) {
        Model model = modelRepository.findByIdAndOrganizationId(req.modelId(), orgId)
                .orElseThrow(() -> badRequest("Model unavailable"));
        return bindingRepository.save(new SchemaModelBinding(version, model,
                req.pluginPolicy() == null ? Map.of() : req.pluginPolicy()));
    }

    private void validateFormSchema(Map<String, Object> formSchema) {
        if (!(formSchema.get("fields") instanceof List<?>)) {
            throw badRequest("Schema version formSchema must include fields");
        }
    }

    private void assertUniqueBindings(List<CreateSchemaModelBindingRequest> bindings) {
        if (bindings.isEmpty()) {
            throw badRequest("Schema version must bind at least one model");
        }
        Set<String> seen = new HashSet<>();
        for (CreateSchemaModelBindingRequest binding : bindings) {
            String key = binding.modelId().toString();
            if (!seen.add(key)) {
                throw badRequest("Duplicate model binding");
            }
        }
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
