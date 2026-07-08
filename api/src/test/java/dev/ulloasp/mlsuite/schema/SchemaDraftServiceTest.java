package dev.ulloasp.mlsuite.schema;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaDraftRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaVersionRepository;
import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaDraftRequest;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaDraftPublishResultDto;
import dev.ulloasp.mlsuite.schema.application.dto.UpdateSchemaDraftRequest;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaVersionUseCase;
import dev.ulloasp.mlsuite.schema.application.service.SchemaDraftDiffService;
import dev.ulloasp.mlsuite.schema.application.service.SchemaDraftServiceImpl;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaDraft;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaDraftStatus;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaModelBinding;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@ExtendWith(MockitoExtension.class)
class SchemaDraftServiceTest {

    @Mock private UserLookupService userLookupService;
    @Mock private SchemaRepository schemaRepository;
    @Mock private SchemaVersionRepository versionRepository;
    @Mock private SchemaDraftRepository draftRepository;
    @Mock private SchemaVersionUseCase versionUseCase;
    @Mock private WorkspaceAccessService workspaceAccessService;
    @Mock private WorkspaceAuthorizationService authorizationService;

    private SchemaDraftServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new SchemaDraftServiceImpl(userLookupService, schemaRepository, versionRepository,
                draftRepository, versionUseCase, new SchemaDraftDiffService(), workspaceAccessService,
                authorizationService);
        when(userLookupService.requireById(7L)).thenReturn(user());
        when(workspaceAccessService.requireCurrentOrganization(7L)).thenReturn(organization());
    }

    @Test
    void createDraft_CopiesBaseSnapshotAndBindings() {
        SchemaVersion base = version(9L, 1, formSchema("Age"));
        when(schemaRepository.findByIdAndOrganizationId(5L, 41L)).thenReturn(Optional.of(schema()));
        when(versionRepository.findByIdAndOrganizationId(9L, 41L)).thenReturn(Optional.of(base));
        when(versionUseCase.listBindings(7L, 9L)).thenReturn(List.of(binding(base)));
        when(draftRepository.save(any(SchemaDraft.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SchemaDraft draft = service.createDraft(7L, 5L,
                new CreateSchemaDraftRequest("Rename age", 9L));

        assertEquals("Rename age", draft.getName());
        assertEquals(SchemaDraftStatus.DRAFT, draft.getStatus());
        assertEquals("Age", draft.getFormSchema().get("label"));
        assertEquals(11L, draft.getBindings().get(0).get("modelId"));
    }

    @Test
    void createDraft_RejectsBaseOutsideSchema() {
        SchemaVersion base = version(9L, 1, formSchema("Age"));
        base.setSchema(otherSchema());
        when(schemaRepository.findByIdAndOrganizationId(5L, 41L)).thenReturn(Optional.of(schema()));
        when(versionRepository.findByIdAndOrganizationId(9L, 41L)).thenReturn(Optional.of(base));

        assertThrows(ResponseStatusException.class, () -> service.createDraft(7L, 5L,
                new CreateSchemaDraftRequest("Bad base", 9L)));
    }

    @Test
    void updateDraft_RejectsPublishedDraft() {
        SchemaDraft draft = draft(version(9L, 1, formSchema("Age")));
        draft.setStatus(SchemaDraftStatus.PUBLISHED);
        when(draftRepository.findByIdAndOrganizationId(30L, 41L)).thenReturn(Optional.of(draft));

        assertThrows(ResponseStatusException.class, () -> service.updateDraft(7L, 30L,
                new UpdateSchemaDraftRequest("Done", formSchema("Age"), List.of())));
    }

    @Test
    void publishDraft_CreatesVersionWhenBaseIsCurrent() {
        SchemaVersion base = version(9L, 1, formSchema("Age"));
        SchemaDraft draft = draft(base);
        SchemaVersion published = version(10L, 2, formSchema("Patient age"));
        draft.setFormSchema(formSchema("Patient age"));
        when(draftRepository.findByIdAndOrganizationId(30L, 41L)).thenReturn(Optional.of(draft));
        when(versionRepository.findTopBySchemaIdOrderByVersionDesc(5L)).thenReturn(Optional.of(base));
        when(versionUseCase.createVersion(any(), any(), any())).thenReturn(published);
        when(versionUseCase.listBindings(7L, 10L)).thenReturn(List.of(binding(published)));

        SchemaDraftPublishResultDto result = service.publishDraft(7L, 30L);

        assertEquals("published", result.status());
        assertEquals(SchemaDraftStatus.PUBLISHED, draft.getStatus());
        assertEquals(2, result.version().version());
        verify(versionUseCase).createVersion(any(), any(), any());
    }

    @Test
    void publishDraft_BlocksStaleBase() {
        SchemaVersion base = version(9L, 1, formSchema("Age"));
        SchemaVersion current = version(10L, 2, formSchema("Age"));
        SchemaDraft draft = draft(base);
        when(draftRepository.findByIdAndOrganizationId(30L, 41L)).thenReturn(Optional.of(draft));
        when(versionRepository.findTopBySchemaIdOrderByVersionDesc(5L)).thenReturn(Optional.of(current));

        SchemaDraftPublishResultDto result = service.publishDraft(7L, 30L);

        assertEquals("conflict", result.status());
        assertEquals(SchemaDraftStatus.CONFLICT, draft.getStatus());
    }

    private SchemaDraft draft(SchemaVersion base) {
        SchemaDraft draft = new SchemaDraft(schema(), base, "Draft", base.getFormSchema(),
                List.of(Map.of("modelId", 11L, "modelName", "model", "pluginPolicy", Map.of())));
        draft.setId(30L);
        return draft;
    }

    private SchemaModelBinding binding(SchemaVersion version) {
        return new SchemaModelBinding(version, model(), Map.of());
    }

    private SchemaVersion version(Long id, int number, Map<String, Object> formSchema) {
        SchemaVersion version = new SchemaVersion(schema(), number, "v" + number, formSchema);
        version.setId(id);
        return version;
    }

    private Map<String, Object> formSchema(String label) {
        return Map.of("fields", List.of(Map.of("id", "age", "label", label)), "label", label);
    }

    private Model model() {
        Model model = new Model();
        model.setId(11L);
        model.setName("model");
        return model;
    }

    private Schema schema() {
        Schema schema = new Schema(organization(), "Risk", null);
        schema.setId(5L);
        return schema;
    }

    private Schema otherSchema() {
        Schema schema = new Schema(organization(), "Other", null);
        schema.setId(6L);
        return schema;
    }

    private Organization organization() {
        Organization organization = new Organization();
        organization.setId(41L);
        organization.setName("Org");
        organization.setSlug("org");
        organization.setCreatedBy(user());
        return organization;
    }

    private User user() {
        User user = new User();
        user.setId(7L);
        user.setUsername("alice");
        user.setFullName("Alice");
        return user;
    }
}
