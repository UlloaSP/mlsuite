package dev.ulloasp.mlsuite.schema;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaModelBindingRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaDraftRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaVersionRepository;
import dev.ulloasp.mlsuite.schema.application.dto.*;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaVersionUseCase;
import dev.ulloasp.mlsuite.schema.application.service.SchemaDraftDiffService;
import dev.ulloasp.mlsuite.schema.application.service.SchemaDraftPublishedVersionResolver;
import dev.ulloasp.mlsuite.schema.application.service.SchemaDraftServiceImpl;
import dev.ulloasp.mlsuite.schema.application.service.SchemaVersionServiceImpl;
import dev.ulloasp.mlsuite.schema.domain.model.*;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@ExtendWith(MockitoExtension.class)
class SchemaDraftServiceTest {
    @Mock UserLookupService users;
    @Mock SchemaRepository schemas;
    @Mock SchemaVersionRepository versions;
    @Mock SchemaDraftRepository drafts;
    @Mock SchemaModelBindingRepository bindings;
    @Mock ModelRepository models;
    @Mock SchemaVersionUseCase versionUseCase;
    @Mock SchemaDraftPublishedVersionResolver publishedVersions;
    @Mock WorkspaceAccessService workspaces;
    @Mock WorkspaceAuthorizationService authorization;
    SchemaDraftDiffService engine;
    SchemaDraftServiceImpl service;

    @BeforeEach
    void setUp() {
        engine = new SchemaDraftDiffService();
        service = new SchemaDraftServiceImpl(users, schemas, versions, drafts, versionUseCase,
                engine, publishedVersions, workspaces, authorization);
        lenient().when(users.requireById(7L)).thenReturn(user());
        lenient().when(workspaces.requireCurrentOrganization(7L)).thenReturn(organization());
    }

    @Test
    void createDraftSnapshotsBindingsIndependently() {
        SchemaVersion base = version(9L, 1, form("Age"));
        when(schemas.findByIdAndOrganizationId(5L, 41L)).thenReturn(Optional.of(schema()));
        when(versions.findByIdAndOrganizationId(9L, 41L)).thenReturn(Optional.of(base));
        when(versionUseCase.listBindings(7L, 9L)).thenReturn(List.of(binding(base)));
        when(drafts.save(any())).thenAnswer(call -> call.getArgument(0));

        SchemaDraft draft = service.createDraft(7L, 5L, new CreateSchemaDraftRequest("Change", 9L));
        draft.getFormSchema().put("title", "changed");
        draft.getBindings().getFirst().put("modelName", "changed");
        policy(draft.getBindings().getFirst()).put("threshold", 2);

        assertFalse(base.getFormSchema().containsKey("title"));
        assertEquals("model", draft.getBaseBindings().getFirst().get("modelName"));
        assertEquals(1, policy(draft.getBaseBindings().getFirst()).get("threshold"));
        assertEquals(0, draft.currentRevision());
    }

    @Test
    void structuralDiffPreservesMissingNullPointersAndArrayRules() {
        Map<String, Object> base = doc(map("a/b", "x", "nullable", null,
                "stable", List.of(map("id", "a", "v", 1)), "plain", List.of("a", "b"),
                "sameLength", List.of(map("label", "one"), map("label", "two")),
                "unstable", List.of(map("id", null, "v", 1))), List.of());
        Map<String, Object> draft = doc(map("nullable", null,
                "stable", List.of(map("id", "a", "v", 2)), "plain", List.of("a"),
                "sameLength", List.of(map("label", "one"), map("label", "draft")),
                "unstable", List.of(map("id", null, "v", 2))), List.of());
        Map<String, Object> current = doc(map("a/b", map("nested", true), "nullable", "now text",
                "stable", List.of(map("id", "a", "v", 3)), "plain", List.of("a", "b"),
                "sameLength", List.of(map("label", "one"), map("label", "current")),
                "unstable", List.of(map("id", null, "v", 3))), List.of());

        SchemaDraftDiffDto diff = engine.diff(1L, 2L, base, draft, current);
        Map<String, SchemaDraftChangeDto> changes = diff.changes().stream()
                .collect(java.util.stream.Collectors.toMap(SchemaDraftChangeDto::path, value -> value));

        assertFalse(changes.get("/formSchema/a~1b").draftPresent());
        assertTrue(changes.get("/formSchema/nullable").draftPresent());
        assertTrue(changes.containsKey("/formSchema/stable/0/v"));
        assertTrue(changes.containsKey("/formSchema/plain"));
        assertFalse(changes.containsKey("/formSchema/plain/1"));
        assertTrue(changes.containsKey("/formSchema/sameLength/1/label"));
        assertFalse(changes.containsKey("/formSchema/sameLength"));
        assertTrue(changes.containsKey("/formSchema/unstable"));
    }

    @Test
    void mergeResolvesWholeDocumentAndRebasesBindings() {
        SchemaVersion base = version(9L, 1, map("fields", List.of(map("id", "age", "label", "Age")), "gone", true));
        SchemaVersion current = version(10L, 2, map("fields", List.of(map("id", "age", "label", "Clinical")), "gone", true));
        SchemaDraft draft = draft(base);
        draft.setFormSchema(map("fields", List.of(map("id", "age", "label", "Patient"))));
        draft.setBindings(List.of(map("modelId", 12L, "modelName", "new", "pluginPolicy", Map.of())));
        stubMutation(draft, current);

        SchemaDraftDiffDto preview = service.diffDraft(7L, 30L);
        List<SchemaDraftMergeResolutionDto> choices = preview.changes().stream()
                .filter(SchemaDraftChangeDto::conflict)
                .map(change -> resolution(change.path(), SchemaDraftMergeSide.INCOMING)).toList();
        service.mergeDraft(7L, 30L, new SchemaDraftMergeRequest(
                10L, preview.currentDocumentHash(), 0L, choices));

        assertFalse(draft.getFormSchema().containsKey("gone"));
        assertEquals(12L, draft.getBindings().getFirst().get("modelId"));
        assertEquals(List.of(), draft.getBaseBindings());
        assertEquals(10L, draft.getBaseVersion().getId());
        assertEquals(1, draft.currentRevision());
    }

    @Test
    void mergeRejectsMissingDuplicateUnknownAndNullResolutions() {
        SchemaVersion base = version(9L, 1, form("Age"));
        SchemaVersion current = version(10L, 2, form("Clinical"));
        SchemaDraft draft = draft(base);
        draft.setFormSchema(form("Patient"));
        stubMutation(draft, current);
        SchemaDraftDiffDto preview = service.diffDraft(7L, 30L);
        String path = preview.changes().getFirst().path();
        List<List<SchemaDraftMergeResolutionDto>> invalid = List.of(
                List.of(),
                List.of(resolution(path, SchemaDraftMergeSide.INCOMING), resolution(path, SchemaDraftMergeSide.CURRENT)),
                List.of(resolution("/unknown", SchemaDraftMergeSide.INCOMING)),
                Arrays.asList((SchemaDraftMergeResolutionDto) null));

        for (List<SchemaDraftMergeResolutionDto> values : invalid) {
            ResponseStatusException error = assertThrows(ResponseStatusException.class,
                    () -> service.mergeDraft(7L, 30L, new SchemaDraftMergeRequest(
                            10L, preview.currentDocumentHash(), 0L, values)));
            assertEquals(400, error.getStatusCode().value());
        }
    }

    @Test
    void staleRevisionBlocksUpdateMergeAndPublish() {
        SchemaVersion current = version(10L, 2, form("Age"));
        SchemaDraft draft = draft(current);
        draft.advanceRevision();
        stubMutation(draft, current);

        assertConflict(() -> service.updateDraft(7L, 30L,
                new UpdateSchemaDraftRequest(0L, "x", form("x"), List.of(map("modelId", 1L)))));
        assertConflict(() -> service.mergeDraft(7L, 30L,
                new SchemaDraftMergeRequest(10L, "ignored", 0L, List.of())));
        assertConflict(() -> service.publishDraft(7L, 30L, new PublishSchemaDraftRequest(0L)));
    }

    @Test
    void publishIsIdempotentAndLegacyPublishedDraftConflicts() {
        SchemaVersion base = version(9L, 1, form("Age"));
        SchemaVersion published = version(10L, 2, form("Patient"));
        SchemaDraft draft = draft(base);
        stubMutation(draft, base);
        when(versionUseCase.createVersion(any(), any(), any())).thenReturn(published);

        assertEquals("published", service.publishDraft(7L, 30L, new PublishSchemaDraftRequest(0L)).status());
        assertEquals("published", service.publishDraft(7L, 30L, new PublishSchemaDraftRequest(0L)).status());
        verify(versionUseCase, times(1)).createVersion(any(), any(), any());
        assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.updateDraft(7L, 30L,
                new UpdateSchemaDraftRequest(1L, "x", form("x"), List.of(map("modelId", 1L)))))
                .getStatusCode().value());

        draft.setPublishedVersion(null);
        when(publishedVersions.resolve(7L, draft)).thenReturn(published);
        assertEquals("published", service.publishDraft(7L, 30L, new PublishSchemaDraftRequest(1L)).status());
        assertEquals(10L, draft.getPublishedVersion().getId());
    }

    @Test
    void publishedResolverFindsExactLegacyVersionAndRejectsAmbiguity() {
        SchemaVersion base = version(9L, 1, form("Age"));
        SchemaVersion published = version(10L, 2, form("Patient"));
        SchemaDraft draft = draft(base);
        draft.setName("v2");
        draft.setFormSchema(form("Patient"));
        draft.setBindings(List.of(map("modelId", 11L, "modelName", "renamed", "pluginPolicy", Map.of("threshold", 1))));
        SchemaDraftPublishedVersionResolver resolver = new SchemaDraftPublishedVersionResolver(versions, versionUseCase);
        when(versions.findBySchemaIdOrderByVersionDesc(5L)).thenReturn(List.of(published));
        when(versionUseCase.listBindings(7L, 10L)).thenReturn(List.of(binding(published)));

        assertEquals(10L, resolver.resolve(7L, draft).getId());

        SchemaVersion duplicate = version(11L, 3, form("Patient"));
        duplicate.setName("v2");
        when(versions.findBySchemaIdOrderByVersionDesc(5L)).thenReturn(List.of(published, duplicate));
        when(versionUseCase.listBindings(7L, 11L)).thenReturn(List.of(binding(published)));
        assertConflict(() -> resolver.resolve(7L, draft));
    }

    @Test
    void addBindingFreezesLegacyDraftBaseBindingsBeforeMutation() {
        SchemaVersion base = version(9L, 1, form("Age"));
        SchemaDraft legacy = draft(base);
        legacy.setBaseBindings(null);
        SchemaVersionServiceImpl versionService = new SchemaVersionServiceImpl(users, schemas, versions, bindings,
                models, drafts, workspaces, authorization);
        when(versions.findByIdAndOrganizationId(9L, 41L)).thenReturn(Optional.of(base));
        when(schemas.findForUpdate(5L, 41L)).thenReturn(Optional.of(schema()));
        when(bindings.findBinding(9L, 12L)).thenReturn(Optional.empty());
        when(bindings.findBySchemaVersionId(9L)).thenReturn(List.of(binding(base)));
        when(drafts.findByBaseVersionIdAndBaseBindingsIsNull(9L)).thenReturn(List.of(legacy));
        when(models.findByIdAndOrganizationId(12L, 41L)).thenReturn(Optional.of(model(12L)));
        when(bindings.save(any())).thenAnswer(call -> call.getArgument(0));

        versionService.addBinding(7L, 9L, new CreateSchemaModelBindingRequest(12L, Map.of()));

        assertEquals(11L, legacy.getBaseBindings().getFirst().get("modelId"));
        assertEquals(1, policy(legacy.getBaseBindings().getFirst()).get("threshold"));
    }

    @Test
    void staleCurrentReturnsConflictWithoutMutation() {
        SchemaVersion base = version(9L, 1, form("Age"));
        SchemaVersion current = version(10L, 2, form("Clinical"));
        SchemaDraft draft = draft(base);
        stubMutation(draft, current);

        assertConflict(() -> service.mergeDraft(7L, 30L,
                new SchemaDraftMergeRequest(9L, "ignored", 0L, List.of())));
        assertEquals(9L, draft.getBaseVersion().getId());
    }

    @Test
    void staleCurrentDocumentHashBlocksSameVersionBindingDrift() {
        SchemaVersion base = version(9L, 1, form("Age"));
        SchemaVersion current = version(10L, 2, form("Age"));
        SchemaDraft draft = draft(base);
        stubMutation(draft, current);
        when(versionUseCase.listBindings(7L, 10L)).thenReturn(List.of(), List.of(binding(current)));

        SchemaDraftDiffDto preview = service.diffDraft(7L, 30L);

        assertConflict(() -> service.mergeDraft(7L, 30L,
                new SchemaDraftMergeRequest(10L, preview.currentDocumentHash(), 0L, List.of())));
        assertEquals(9L, draft.getBaseVersion().getId());
    }

    private void stubMutation(SchemaDraft draft, SchemaVersion current) {
        lenient().when(drafts.findForUpdate(30L, 41L)).thenReturn(Optional.of(draft));
        lenient().when(drafts.findByIdAndOrganizationId(30L, 41L)).thenReturn(Optional.of(draft));
        lenient().when(schemas.findForUpdate(5L, 41L)).thenReturn(Optional.of(draft.getSchema()));
        lenient().when(versions.findTopBySchemaIdOrderByVersionDesc(5L)).thenReturn(Optional.of(current));
        lenient().when(versionUseCase.listBindings(any(), any())).thenReturn(List.of());
    }

    private void assertConflict(org.junit.jupiter.api.function.Executable action) {
        assertEquals(409, assertThrows(ResponseStatusException.class, action).getStatusCode().value());
    }

    private SchemaDraftMergeResolutionDto resolution(String path, SchemaDraftMergeSide side) {
        return new SchemaDraftMergeResolutionDto(path, side);
    }

    private SchemaDraft draft(SchemaVersion base) {
        SchemaDraft draft = new SchemaDraft(schema(), base, "Draft", base.getFormSchema(), List.of());
        draft.setId(30L);
        return draft;
    }

    private SchemaVersion version(Long id, int number, Map<String, Object> formSchema) {
        SchemaVersion version = new SchemaVersion(schema(), number, "v" + number, formSchema);
        version.setId(id);
        return version;
    }

    private SchemaModelBinding binding(SchemaVersion version) {
        return new SchemaModelBinding(version, model(), map("threshold", 1));
    }
    @SuppressWarnings("unchecked")
    private Map<String, Object> policy(Map<String, Object> binding) {
        return (Map<String, Object>) binding.get("pluginPolicy");
    }
    private Map<String, Object> form(String label) { return map("fields", List.of(map("id", "age", "label", label)), "label", label); }
    private Map<String, Object> doc(Map<String, Object> form, List<Map<String, Object>> bindings) { return map("formSchema", form, "bindings", bindings); }

    private Map<String, Object> map(Object... values) {
        Map<String, Object> result = new LinkedHashMap<>();
        for (int i = 0; i < values.length; i += 2) result.put((String) values[i], values[i + 1]);
        return result;
    }

    private Model model() { return model(11L); }
    private Model model(Long id) { Model model = new Model(); model.setId(id); model.setName("model"); return model; }
    private Schema schema() { Schema schema = new Schema(organization(), "Risk", null); schema.setId(5L); return schema; }
    private Organization organization() { Organization org = new Organization(); org.setId(41L); org.setName("Org"); org.setSlug("org"); org.setCreatedBy(user()); return org; }
    private User user() { User user = new User(); user.setId(7L); user.setUsername("alice"); user.setFullName("Alice"); return user; }
}
