package dev.ulloasp.mlsuite.schema.application.service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaDraftRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaVersionRepository;
import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaDraftRequest;
import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaModelBindingRequest;
import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaVersionRequest;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaDraftDiffDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaDraftDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaDraftPublishResultDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaModelBindingDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaVersionDto;
import dev.ulloasp.mlsuite.schema.application.dto.UpdateSchemaDraftRequest;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaDraftUseCase;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaVersionUseCase;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaDraft;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaDraftStatus;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import jakarta.transaction.Transactional;

@Service
@Transactional
public class SchemaDraftServiceImpl implements SchemaDraftUseCase {

    private final UserLookupService userLookupService;
    private final SchemaRepository schemaRepository;
    private final SchemaVersionRepository versionRepository;
    private final SchemaDraftRepository draftRepository;
    private final SchemaVersionUseCase versionUseCase;
    private final SchemaDraftDiffService diffService;
    private final WorkspaceAccessService workspaceAccessService;
    private final WorkspaceAuthorizationService authorizationService;

    public SchemaDraftServiceImpl(UserLookupService userLookupService, SchemaRepository schemaRepository,
            SchemaVersionRepository versionRepository, SchemaDraftRepository draftRepository,
            SchemaVersionUseCase versionUseCase, SchemaDraftDiffService diffService,
            WorkspaceAccessService workspaceAccessService, WorkspaceAuthorizationService authorizationService) {
        this.userLookupService = userLookupService;
        this.schemaRepository = schemaRepository;
        this.versionRepository = versionRepository;
        this.draftRepository = draftRepository;
        this.versionUseCase = versionUseCase;
        this.diffService = diffService;
        this.workspaceAccessService = workspaceAccessService;
        this.authorizationService = authorizationService;
    }

    @Override
    public List<SchemaDraft> listDrafts(Long userId, Long schemaId) {
        Long orgId = requireRead(userId);
        requireSchema(schemaId, orgId);
        return draftRepository.findBySchemaIdAndStatusNotOrderByUpdatedAtDesc(
                schemaId, SchemaDraftStatus.PUBLISHED);
    }

    @Override
    public SchemaDraft createDraft(Long userId, Long schemaId, CreateSchemaDraftRequest request) {
        User user = userLookupService.requireById(userId);
        Long orgId = requireOperate(userId);
        Schema schema = requireSchema(schemaId, orgId);
        SchemaVersion base = requireVersion(request.baseVersionId(), orgId);
        if (!base.getSchema().getId().equals(schemaId)) throw badRequest("Base version outside schema");
        SchemaDraft draft = new SchemaDraft(schema, base, request.name(), base.getFormSchema(),
                bindingJson(versionUseCase.listBindings(userId, base.getId())));
        touch(schema, draft, user);
        return draftRepository.save(draft);
    }

    @Override
    public SchemaDraft getDraft(Long userId, Long draftId) {
        Long orgId = requireRead(userId);
        return requireDraft(draftId, orgId);
    }

    @Override
    public SchemaDraft updateDraft(Long userId, Long draftId, UpdateSchemaDraftRequest request) {
        User user = userLookupService.requireById(userId);
        Long orgId = requireOperate(userId);
        SchemaDraft draft = requireDraft(draftId, orgId);
        if (draft.getStatus() == SchemaDraftStatus.PUBLISHED) throw badRequest("Draft already published");
        draft.setName(request.name());
        draft.setFormSchema(request.formSchema());
        draft.setBindings(request.bindings());
        draft.setStatus(SchemaDraftStatus.DRAFT);
        touch(draft.getSchema(), draft, user);
        return draft;
    }

    @Override
    public SchemaDraftDiffDto diffDraft(Long userId, Long draftId) {
        Long orgId = requireRead(userId);
        SchemaDraft draft = requireDraft(draftId, orgId);
        return diffService.diff(draft, currentVersion(draft.getSchema().getId()));
    }

    @Override
    public SchemaDraftPublishResultDto publishDraft(Long userId, Long draftId) {
        User user = userLookupService.requireById(userId);
        Long orgId = requireOperate(userId);
        SchemaDraft draft = requireDraft(draftId, orgId);
        SchemaVersion current = currentVersion(draft.getSchema().getId());
        SchemaDraftDiffDto diff = diffService.diff(draft, current);
        if (!draft.getBaseVersion().getId().equals(current.getId()) || diff.hasConflicts()) {
            draft.setStatus(SchemaDraftStatus.CONFLICT);
            touch(draft.getSchema(), draft, user);
            return new SchemaDraftPublishResultDto("conflict", SchemaDraftDto.from(draft), null, diff);
        }
        SchemaVersion version = versionUseCase.createVersion(userId, draft.getSchema().getId(),
                new CreateSchemaVersionRequest(draft.getName(), draft.getFormSchema(), requestBindings(draft)));
        draft.setStatus(SchemaDraftStatus.PUBLISHED);
        touch(draft.getSchema(), draft, user);
        SchemaVersionDto dto = SchemaVersionDto.from(version, versionUseCase.listBindings(userId, version.getId()));
        return new SchemaDraftPublishResultDto("published", SchemaDraftDto.from(draft), dto, diff);
    }

    private Long requireRead(Long userId) {
        userLookupService.requireById(userId);
        Long orgId = workspaceAccessService.requireCurrentOrganization(userId).getId();
        authorizationService.requireOrganizationRead(userId, orgId);
        return orgId;
    }

    private Long requireOperate(Long userId) {
        userLookupService.requireById(userId);
        Long orgId = workspaceAccessService.requireCurrentOrganization(userId).getId();
        authorizationService.requireOrganizationOperate(userId, orgId);
        return orgId;
    }

    private Schema requireSchema(Long schemaId, Long orgId) {
        return schemaRepository.findByIdAndOrganizationId(schemaId, orgId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Schema not found"));
    }

    private SchemaVersion requireVersion(Long versionId, Long orgId) {
        return versionRepository.findByIdAndOrganizationId(versionId, orgId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Schema version not found"));
    }

    private SchemaDraft requireDraft(Long draftId, Long orgId) {
        return draftRepository.findByIdAndOrganizationId(draftId, orgId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Schema draft not found"));
    }

    private SchemaVersion currentVersion(Long schemaId) {
        return versionRepository.findTopBySchemaIdOrderByVersionDesc(schemaId)
                .orElseThrow(() -> badRequest("Schema has no versions"));
    }

    private List<Map<String, Object>> bindingJson(List<dev.ulloasp.mlsuite.schema.domain.model.SchemaModelBinding> bindings) {
        return SchemaModelBindingDto.fromList(bindings).stream()
                .map(binding -> Map.<String, Object>of(
                        "modelId", binding.modelId(),
                        "modelName", binding.modelName(),
                        "pluginPolicy", binding.pluginPolicy() == null ? Map.of() : binding.pluginPolicy()))
                .toList();
    }

    private List<CreateSchemaModelBindingRequest> requestBindings(SchemaDraft draft) {
        return draft.getBindings().stream()
                .map(binding -> new CreateSchemaModelBindingRequest(modelId(binding.get("modelId")),
                        pluginPolicy(binding.get("pluginPolicy"))))
                .toList();
    }

    private Long modelId(Object value) {
        if (value instanceof Number number) return number.longValue();
        if (value instanceof String text) return Long.valueOf(text);
        throw badRequest("Draft binding modelId missing");
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> pluginPolicy(Object value) {
        return value instanceof Map<?, ?> ? (Map<String, Object>) value : Map.of();
    }

    private void touch(Schema schema, SchemaDraft draft, User user) {
        schema.setUpdatedBy(user);
        schema.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));
        draft.setUpdatedBy(user);
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
