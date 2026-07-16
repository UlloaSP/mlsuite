package dev.ulloasp.mlsuite.schema.application.service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaDraftRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaVersionRepository;
import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaDraftRequest;
import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaModelBindingRequest;
import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaVersionRequest;
import dev.ulloasp.mlsuite.schema.application.dto.PublishSchemaDraftRequest;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaDraftDiffDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaDraftDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaDraftMergeRequest;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaDraftMergeResolutionDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaDraftMergeSide;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaDraftMergeResultDto;
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
    private final UserLookupService users;
    private final SchemaRepository schemas;
    private final SchemaVersionRepository versions;
    private final SchemaDraftRepository drafts;
    private final SchemaVersionUseCase versionUseCase;
    private final SchemaDraftDiffService merger;
    private final SchemaDraftPublishedVersionResolver publishedVersions;
    private final WorkspaceAccessService workspaces;
    private final WorkspaceAuthorizationService authorization;
    public SchemaDraftServiceImpl(UserLookupService users, SchemaRepository schemas,
            SchemaVersionRepository versions, SchemaDraftRepository drafts,
            SchemaVersionUseCase versionUseCase, SchemaDraftDiffService merger,
            SchemaDraftPublishedVersionResolver publishedVersions,
            WorkspaceAccessService workspaces, WorkspaceAuthorizationService authorization) {
        this.users = users;
        this.schemas = schemas;
        this.versions = versions;
        this.drafts = drafts;
        this.versionUseCase = versionUseCase;
        this.merger = merger;
        this.publishedVersions = publishedVersions;
        this.workspaces = workspaces;
        this.authorization = authorization;
    }
    @Override
    public List<SchemaDraft> listDrafts(Long userId, Long schemaId) {
        Long orgId = requireRead(userId);
        requireSchema(schemaId, orgId);
        return drafts.findBySchemaIdAndStatusNotOrderByUpdatedAtDesc(schemaId, SchemaDraftStatus.PUBLISHED);
    }
    @Override
    public SchemaDraft createDraft(Long userId, Long schemaId, CreateSchemaDraftRequest request) {
        User user = users.requireById(userId);
        Long orgId = requireOperate(userId);
        Schema schema = requireSchema(schemaId, orgId);
        SchemaVersion base = requireVersion(request.baseVersionId(), orgId);
        if (!base.getSchema().getId().equals(schemaId)) throw badRequest("Base version outside schema");
        List<Map<String, Object>> bindings = bindingJson(versionUseCase.listBindings(userId, base.getId()));
        SchemaDraft draft = new SchemaDraft(schema, base, request.name(), base.getFormSchema(), bindings);
        touch(schema, draft, user);
        return drafts.save(draft);
    }
    @Override
    public SchemaDraft getDraft(Long userId, Long draftId) {
        return requireDraft(draftId, requireRead(userId));
    }
    @Override
    public SchemaDraft updateDraft(Long userId, Long draftId, UpdateSchemaDraftRequest request) {
        User user = users.requireById(userId);
        Long orgId = requireOperate(userId);
        SchemaDraft draft = requireDraftForUpdate(draftId, orgId);
        requireEditable(draft);
        requireRevision(draft, request.expectedDraftRevision());
        draft.setName(request.name());
        draft.setFormSchema(request.formSchema());
        draft.setBindings(request.bindings());
        draft.setStatus(SchemaDraftStatus.DRAFT);
        changed(draft, user);
        return draft;
    }
    @Override
    public SchemaDraftDiffDto diffDraft(Long userId, Long draftId) {
        Long orgId = requireRead(userId);
        SchemaDraft draft = requireDraft(draftId, orgId);
        SchemaVersion current = currentVersion(draft.getSchema().getId());
        return diff(userId, draft, current);
    }
    @Override
    public SchemaDraftMergeResultDto mergeDraft(Long userId, Long draftId, SchemaDraftMergeRequest request) {
        User user = users.requireById(userId);
        Long orgId = requireOperate(userId);
        SchemaDraft draft = requireDraftForUpdate(draftId, orgId);
        requireEditable(draft);
        requireRevision(draft, request.expectedDraftRevision());
        lockSchema(draft.getSchema().getId(), orgId);
        SchemaVersion current = currentVersion(draft.getSchema().getId());
        if (!current.getId().equals(request.expectedCurrentVersionId())) throw conflict("Current version changed");

        SchemaDraftDiffDto diff = diff(userId, draft, current);
        if (!diff.currentDocumentHash().equals(request.expectedCurrentDocumentHash()))
            throw conflict("Current schema document changed");
        Map<String, SchemaDraftMergeSide> resolutions = resolutions(request.resolutions());
        Set<String> conflicts = diff.changes().stream()
                .filter(change -> change.conflict())
                .map(change -> change.path()).collect(Collectors.toSet());
        if (!resolutions.keySet().equals(conflicts)) throw badRequest("Resolutions must exactly match conflicts");

        List<Map<String, Object>> currentBindings = bindingJson(versionUseCase.listBindings(userId, current.getId()));
        Map<String, Object> merged = merger.merge(document(current.getFormSchema(), currentBindings), diff, resolutions);
        draft.setFormSchema(map(merged.get("formSchema"), "Merged formSchema invalid"));
        draft.setBindings(bindings(merged.get("bindings")));
        draft.setBaseBindings(currentBindings);
        draft.setBaseVersion(current);
        draft.setStatus(SchemaDraftStatus.DRAFT);
        changed(draft, user);
        return new SchemaDraftMergeResultDto(SchemaDraftDto.from(draft), diff(userId, draft, current));
    }
    @Override
    public SchemaDraftPublishResultDto publishDraft(Long userId, Long draftId, PublishSchemaDraftRequest request) {
        User user = users.requireById(userId);
        Long orgId = requireOperate(userId);
        SchemaDraft draft = requireDraftForUpdate(draftId, orgId);
        if (draft.getStatus() == SchemaDraftStatus.PUBLISHED) {
            if (draft.getPublishedVersion() == null) {
                lockSchema(draft.getSchema().getId(), orgId);
                draft.setPublishedVersion(publishedVersions.resolve(userId, draft));
            }
            return publishedResult(userId, draft);
        }
        requireRevision(draft, request.expectedDraftRevision());
        lockSchema(draft.getSchema().getId(), orgId);
        SchemaVersion current = currentVersion(draft.getSchema().getId());
        SchemaDraftDiffDto diff = diff(userId, draft, current);
        if (!draft.getBaseVersion().getId().equals(current.getId()) || diff.hasConflicts()) {
            draft.setStatus(SchemaDraftStatus.CONFLICT);
            changed(draft, user);
            return new SchemaDraftPublishResultDto("conflict", SchemaDraftDto.from(draft), null, diff);
        }
        SchemaVersion version = versionUseCase.createVersion(userId, draft.getSchema().getId(),
                new CreateSchemaVersionRequest(draft.getName(), draft.getFormSchema(), requestBindings(draft)));
        draft.setPublishedVersion(version);
        draft.setStatus(SchemaDraftStatus.PUBLISHED);
        changed(draft, user);
        return publishedResult(userId, draft);
    }
    private SchemaDraftPublishResultDto publishedResult(Long userId, SchemaDraft draft) {
        SchemaVersion version = draft.getPublishedVersion();
        SchemaVersionDto dto = version == null ? null
                : SchemaVersionDto.from(version, versionUseCase.listBindings(userId, version.getId()));
        return new SchemaDraftPublishResultDto("published", SchemaDraftDto.from(draft), dto, null);
    }
    private SchemaDraftDiffDto diff(Long userId, SchemaDraft draft, SchemaVersion current) {
        List<Map<String, Object>> baseBindings = draft.getBaseBindings();
        if (baseBindings == null) {
            baseBindings = bindingJson(versionUseCase.listBindings(userId, draft.getBaseVersion().getId()));
        }
        List<Map<String, Object>> currentBindings = bindingJson(versionUseCase.listBindings(userId, current.getId()));
        return merger.diff(draft.getBaseVersion().getId(), current.getId(),
                document(draft.getBaseVersion().getFormSchema(), baseBindings),
                document(draft.getFormSchema(), draft.getBindings()),
                document(current.getFormSchema(), currentBindings));
    }
    private Map<String, Object> document(Map<String, Object> formSchema, List<Map<String, Object>> bindings) {
        Map<String, Object> document = new LinkedHashMap<>();
        document.put("formSchema", formSchema);
        document.put("bindings", bindings);
        return document;
    }
    private Map<String, SchemaDraftMergeSide> resolutions(List<SchemaDraftMergeResolutionDto> values) {
        if (values == null) throw badRequest("Resolutions missing");
        Map<String, SchemaDraftMergeSide> result = new LinkedHashMap<>();
        for (SchemaDraftMergeResolutionDto value : values) {
            if (value == null || value.path() == null || value.path().isBlank() || value.side() == null)
                throw badRequest("Invalid merge resolution");
            if (result.putIfAbsent(value.path(), value.side()) != null)
                throw badRequest("Duplicate merge resolution: " + value.path());
        }
        return result;
    }
    private Long requireRead(Long userId) {
        users.requireById(userId);
        Long orgId = workspaces.requireCurrentOrganization(userId).getId();
        authorization.requireOrganizationRead(userId, orgId);
        return orgId;
    }

    private Long requireOperate(Long userId) {
        users.requireById(userId);
        Long orgId = workspaces.requireCurrentOrganization(userId).getId();
        authorization.requireOrganizationOperate(userId, orgId);
        return orgId;
    }

    private Schema requireSchema(Long id, Long orgId) {
        return schemas.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Schema not found"));
    }

    private void lockSchema(Long id, Long orgId) {
        schemas.findForUpdate(id, orgId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Schema not found"));
    }

    private SchemaVersion requireVersion(Long id, Long orgId) {
        return versions.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Schema version not found"));
    }

    private SchemaDraft requireDraft(Long id, Long orgId) {
        return drafts.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Schema draft not found"));
    }

    private SchemaDraft requireDraftForUpdate(Long id, Long orgId) {
        return drafts.findForUpdate(id, orgId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Schema draft not found"));
    }

    private SchemaVersion currentVersion(Long schemaId) {
        return versions.findTopBySchemaIdOrderByVersionDesc(schemaId)
                .orElseThrow(() -> badRequest("Schema has no versions"));
    }

    private void requireEditable(SchemaDraft draft) {
        if (draft.getStatus() == SchemaDraftStatus.PUBLISHED) throw badRequest("Draft already published");
    }

    private void requireRevision(SchemaDraft draft, Long expected) {
        if (expected == null || expected != draft.currentRevision()) throw conflict("Draft changed");
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> map(Object value, String message) {
        if (!(value instanceof Map<?, ?>)) throw badRequest(message);
        return (Map<String, Object>) value;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> bindings(Object value) {
        if (!(value instanceof List<?> list) || list.stream().anyMatch(item -> !(item instanceof Map<?, ?>)))
            throw badRequest("Merged bindings invalid");
        return (List<Map<String, Object>>) value;
    }

    private List<Map<String, Object>> bindingJson(List<dev.ulloasp.mlsuite.schema.domain.model.SchemaModelBinding> values) {
        return SchemaModelBindingDto.toDraftBindings(values);
    }

    private List<CreateSchemaModelBindingRequest> requestBindings(SchemaDraft draft) {
        return draft.getBindings().stream().map(binding -> new CreateSchemaModelBindingRequest(
                modelId(binding.get("modelId")), pluginPolicy(binding.get("pluginPolicy")))).toList();
    }

    private Long modelId(Object value) {
        if (value instanceof Number number) return number.longValue();
        if (value instanceof String text) try { return Long.valueOf(text); } catch (NumberFormatException ignored) { }
        throw badRequest("Draft binding modelId missing");
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> pluginPolicy(Object value) {
        return value instanceof Map<?, ?> ? (Map<String, Object>) value : Map.of();
    }

    private void changed(SchemaDraft draft, User user) {
        draft.advanceRevision();
        touch(draft.getSchema(), draft, user);
    }

    private void touch(Schema schema, SchemaDraft draft, User user) {
        schema.setUpdatedBy(user);
        schema.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));
        draft.setUpdatedBy(user);
    }

    private ResponseStatusException badRequest(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
    private ResponseStatusException conflict(String message) { return new ResponseStatusException(HttpStatus.CONFLICT, message); }
}
