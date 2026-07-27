package dev.ulloasp.mlsuite.schema;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaModelBindingRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaVersionRepository;
import dev.ulloasp.mlsuite.schema.application.service.SchemaServiceImpl;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaModelBinding;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewRepository;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.dto.WorkspacePermissionsDto;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@ExtendWith(MockitoExtension.class)
class SchemaDuplicateServiceTest {

    @Mock private UserLookupService userLookupService;
    @Mock private SchemaRepository schemaRepository;
    @Mock private SchemaVersionRepository versionRepository;
    @Mock private SchemaModelBindingRepository bindingRepository;
    @Mock private PredictionRunRepository runRepository;
    @Mock private SchemaReviewRepository reviewRepository;
    @Mock private WorkspaceAccessService workspaceAccessService;
    @Mock private WorkspaceAuthorizationService authorizationService;

    private SchemaServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new SchemaServiceImpl(userLookupService, schemaRepository, versionRepository,
                bindingRepository, runRepository, reviewRepository,
                workspaceAccessService, authorizationService);
        when(userLookupService.requireById(7L)).thenReturn(user());
        when(workspaceAccessService.requireCurrentOrganization(7L)).thenReturn(organization());
        when(authorizationService.workspacePermissions(7L, 41L)).thenReturn(permissions());
    }

    @Test
    void duplicateSchema_CopiesSelectedSnapshotAsIndependentFirstSnapshot() {
        Schema source = schema(5L, "Risk");
        SchemaVersion selected = version(source, 8L, 3, "Approved");
        Model model = model(11L);
        Map<String, Object> policy = Map.of("reportKinds", List.of("crystal-tree"));
        when(schemaRepository.findByIdAndOrganizationId(5L, 41L)).thenReturn(Optional.of(source));
        when(versionRepository.findByIdAndOrganizationId(8L, 41L)).thenReturn(Optional.of(selected));
        when(schemaRepository.save(any(Schema.class))).thenAnswer(invocation -> {
            Schema copy = invocation.getArgument(0);
            copy.setId(6L);
            return copy;
        });
        when(versionRepository.save(any(SchemaVersion.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(bindingRepository.findBySchemaVersionId(8L))
                .thenReturn(List.of(new SchemaModelBinding(selected, model, policy)));

        Schema result = service.duplicateSchema(7L, 5L, 8L, "Risk Copy");

        ArgumentCaptor<SchemaVersion> versionCaptor = ArgumentCaptor.forClass(SchemaVersion.class);
        ArgumentCaptor<SchemaModelBinding> bindingCaptor = ArgumentCaptor.forClass(SchemaModelBinding.class);
        verify(versionRepository).save(versionCaptor.capture());
        verify(bindingRepository).save(bindingCaptor.capture());
        SchemaVersion copiedVersion = versionCaptor.getValue();
        assertEquals(6L, result.getId());
        assertEquals("Risk Copy", result.getName());
        assertEquals("Source description", result.getDescription());
        assertEquals(1, copiedVersion.getVersion());
        assertEquals("Approved", copiedVersion.getName());
        assertEquals(selected.getFormSchema(), copiedVersion.getFormSchema());
        assertSame(result, copiedVersion.getSchema());
        assertSame(copiedVersion, bindingCaptor.getValue().getSchemaVersion());
        assertSame(model, bindingCaptor.getValue().getModel());
        assertEquals(policy, bindingCaptor.getValue().getPluginPolicy());
        verify(versionRepository, never()).findTopBySchemaIdOrderByVersionDesc(5L);
        verifyNoInteractions(runRepository, reviewRepository);
    }

    @Test
    void duplicateSchema_UsesLatestSnapshotWhenVersionIsOmitted() {
        Schema source = schema(5L, "Risk");
        SchemaVersion latest = version(source, 9L, 4, "Latest");
        when(schemaRepository.findByIdAndOrganizationId(5L, 41L)).thenReturn(Optional.of(source));
        when(versionRepository.findTopBySchemaIdOrderByVersionDesc(5L)).thenReturn(Optional.of(latest));
        when(schemaRepository.save(any(Schema.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(versionRepository.save(any(SchemaVersion.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(bindingRepository.findBySchemaVersionId(9L)).thenReturn(List.of());

        service.duplicateSchema(7L, 5L, null, "Risk Copy");

        verify(versionRepository).findTopBySchemaIdOrderByVersionDesc(5L);
        verify(versionRepository).save(any(SchemaVersion.class));
    }

    @Test
    void duplicateSchema_RejectsMissingSnapshot() {
        when(schemaRepository.findByIdAndOrganizationId(5L, 41L)).thenReturn(Optional.of(schema(5L, "Risk")));
        when(versionRepository.findByIdAndOrganizationId(99L, 41L)).thenReturn(Optional.empty());

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.duplicateSchema(7L, 5L, 99L, "Risk Copy"));

        assertEquals(HttpStatus.NOT_FOUND, error.getStatusCode());
        verify(schemaRepository, never()).save(any(Schema.class));
    }

    @Test
    void duplicateSchema_RejectsSnapshotFromAnotherSchema() {
        Schema source = schema(5L, "Risk");
        SchemaVersion foreign = version(schema(12L, "Other"), 8L, 1, "Foreign");
        when(schemaRepository.findByIdAndOrganizationId(5L, 41L)).thenReturn(Optional.of(source));
        when(versionRepository.findByIdAndOrganizationId(8L, 41L)).thenReturn(Optional.of(foreign));

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.duplicateSchema(7L, 5L, 8L, "Risk Copy"));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        verify(schemaRepository, never()).save(any(Schema.class));
    }

    @Test
    void duplicateSchema_RejectsDuplicateNameBeforeCopyingSnapshot() {
        when(schemaRepository.findByIdAndOrganizationId(5L, 41L)).thenReturn(Optional.of(schema(5L, "Risk")));
        when(schemaRepository.existsByNameAndOrganizationId("Risk Copy", 41L)).thenReturn(true);

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.duplicateSchema(7L, 5L, 8L, "Risk Copy"));

        assertEquals(HttpStatus.CONFLICT, error.getStatusCode());
        verify(versionRepository, never()).findByIdAndOrganizationId(any(), any());
    }

    private SchemaVersion version(Schema schema, Long id, int number, String name) {
        SchemaVersion version = new SchemaVersion(schema, number, name,
                Map.of("fields", List.of(Map.of("id", "age", "kind", "number"))));
        version.setId(id);
        return version;
    }

    private Schema schema(Long id, String name) {
        Schema schema = new Schema(organization(), name, "Source description");
        schema.setId(id);
        return schema;
    }

    private Model model(Long id) {
        Model model = new Model();
        model.setId(id);
        model.setOrganization(organization());
        return model;
    }

    private Organization organization() {
        Organization organization = new Organization();
        organization.setId(41L);
        organization.setName("Org");
        organization.setSlug("org");
        return organization;
    }

    private User user() {
        User user = new User();
        user.setId(7L);
        user.setUsername("alice");
        return user;
    }

    private WorkspacePermissionsDto permissions() {
        return new WorkspacePermissionsDto(true, true, true, true, true, true, true, true, true, true, true, true,
                true, true, true, true, true, true, true, true, true, true, true, true, true);
    }
}
