package dev.ulloasp.mlsuite.schema.application.service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.audit.domain.model.AuditDetails;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
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
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@Transactional
@RequiredArgsConstructor
public class SchemaVersionServiceImpl implements SchemaVersionUseCase {

    private final UserLookupService userLookupService;
    private final SchemaRepository schemaRepository;
    private final SchemaVersionRepository versionRepository;
    private final SchemaModelBindingRepository bindingRepository;
    private final ModelRepository modelRepository;
    private final WorkspaceAuthorizationService authorizationService;
    private final SchemaMappingCheck mappingCheck;
    private final AuditLogService auditLog;

    @Override
    public SchemaVersion createVersion(Long userId, Long schemaId, CreateSchemaVersionRequest request) {
        User user = userLookupService.requireById(userId);
        Long organizationId = requireOperate(userId);
        validateFormSchema(request.formSchema());
        Schema schema = requireSchemaForUpdate(schemaId, organizationId);
        assertUniqueBindings(request.bindings());
        mappingCheck.require(organizationId, request.formSchema(), request.bindings());
        touch(schema, user);
        int nextVersion = versionRepository.findMaxVersionBySchemaId(schemaId) + 1;
        SchemaVersion version = versionRepository.save(
                new SchemaVersion(schema, nextVersion, request.name(), request.formSchema()));
        request.bindings().forEach(binding -> saveBinding(organizationId, version, binding));
        auditLog.record(AuditActor.user(userId), organizationId, AuditAction.SCHEMA_VERSION_CREATE, version.getId(),
                AuditDetails.of("schema", schema.getName(), "version", nextVersion, "name", request.name()));
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
    public List<SchemaModelBinding> listBindings(Long userId, Long versionId) {
        Long organizationId = requireRead(userId);
        requireVersion(versionId, organizationId);
        return bindingRepository.findBySchemaVersionId(versionId);
    }

    private Long requireRead(Long userId) {
        return authorizationService.requireCurrent(userId, PermissionKey.VIEW_MODELS).getId();
    }

    private Long requireOperate(Long userId) {
        return authorizationService.requireCurrent(userId, PermissionKey.CREATE_MODELS).getId();
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

    private Schema requireSchemaForUpdate(Long schemaId, Long organizationId) {
        return schemaRepository.findForUpdate(schemaId, organizationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Schema not found"));
    }

    private void touch(Schema schema, User user) {
        schema.setUpdatedBy(user);
        schema.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));
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
