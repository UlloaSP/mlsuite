package dev.ulloasp.mlsuite.schema;

import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.Test;
import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import org.springframework.http.HttpStatus;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultFeedbackRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaModelBindingRepository;
import dev.ulloasp.mlsuite.schema.adapter.in.web.PredictionRunController;
import dev.ulloasp.mlsuite.schema.application.dto.PredictionRunCatalogItemDto;
import dev.ulloasp.mlsuite.schema.application.port.in.WorkspacePredictionUseCase;
import dev.ulloasp.mlsuite.schema.application.service.PredictionRunServiceImpl;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRunStatus;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@ExtendWith(MockitoExtension.class)
class PredictionRunCatalogTest {
    @Mock private UserLookupService users;
    @Mock private SchemaBookmarkRepository bookmarks;
    @Mock private SchemaModelBindingRepository bindings;
    @Mock private PredictionRunRepository runs;
    @Mock private PredictionResultRepository results;
    @Mock private PredictionResultFeedbackRepository feedback;
    @Mock private dev.ulloasp.mlsuite.schema.application.service.PredictionRunDeletion deletion;
    @Mock private ModelRepository models;
    @Mock private WorkspaceAuthorizationService authorization;
    @Mock private AuditLogService auditLog;
    @InjectMocks private PredictionRunServiceImpl service;
    private CurrentUser user;

    @Test
    void deletesOrganizationInferenceAndItsDependentResults() {
        Organization organization = organization();
        PredictionRun run = new PredictionRun();
        lenient().when(users.requireById(7L)).thenReturn(new User());
        lenient().when(authorization.requireCurrent(eq(7L), any(PermissionKey[].class))).thenReturn(organization);
        when(runs.findByIdAndOrganizationId(12L, 41L)).thenReturn(java.util.Optional.of(run));
        when(deletion.delete(7L, java.util.List.of(12L)))
                .thenReturn(new dev.ulloasp.mlsuite.schema.application.service.PredictionRunDeletion.Deleted(0, 0));

        service.deleteRun(7L, 12L);

        verify(authorization).requireCurrent(7L, PermissionKey.RUN_PREDICTIONS);
        verify(deletion).delete(7L, java.util.List.of(12L));
    }

    @Test
    void summaryReturnsTheCatalogItemOfAnOrganizationRun() {
        allowRead();
        PredictionRun run = new PredictionRun(SchemaFlowFixtures.bookmark(), SchemaFlowFixtures.version(), "case-1",
                java.util.Map.of(), PredictionRunStatus.SUCCESS);
        run.setId(12L);
        when(runs.findByIdAndOrganizationId(12L, 41L)).thenReturn(java.util.Optional.of(run));

        var response = controller().summary(user, 12L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(PredictionRunCatalogItemDto.from(run), response.getBody());
        assertEquals(70L, response.getBody().bookmarkId());
        verify(authorization).requireCurrent(7L, PermissionKey.VIEW_MODELS);
    }

    @Test
    void summaryIsNotFoundForUnknownOrOtherOrganizationRun() {
        allowRead();
        when(runs.findByIdAndOrganizationId(12L, 41L)).thenReturn(java.util.Optional.empty());

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> controller().summary(user, 12L));

        assertEquals(HttpStatus.NOT_FOUND, error.getStatusCode());
    }

    @Test
    void summaryRejectsUserWithoutModelViewPermission() {
        allowRead();
        when(authorization.requireCurrent(7L, PermissionKey.VIEW_MODELS)).thenThrow(new OrganizationAccessDeniedException(41L));

        assertThrows(OrganizationAccessDeniedException.class, () -> controller().summary(user, 12L));
        verify(runs, never()).findByIdAndOrganizationId(12L, 41L);
    }

    private PredictionRunController controller() {
        user = new CurrentUser(7L, "alice", SystemRole.USER);
        return new PredictionRunController(service, mock(WorkspacePredictionUseCase.class), results);
    }

    private void allowRead() {
        lenient().when(users.requireById(7L)).thenReturn(new User());
        lenient().when(authorization.requireCurrent(eq(7L), any(PermissionKey[].class))).thenReturn(organization());
    }

    private Organization organization() {
        Organization organization = new Organization();
        organization.setId(41L);
        return organization;
    }
}
