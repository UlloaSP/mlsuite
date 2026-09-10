package dev.ulloasp.mlsuite.schema;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.Test;
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
import dev.ulloasp.mlsuite.schema.application.service.PredictionRunServiceImpl;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@ExtendWith(MockitoExtension.class)
class PredictionRunCatalogTest {
    @Mock private UserLookupService users;
    @Mock private SchemaBookmarkRepository bookmarks;
    @Mock private SchemaModelBindingRepository bindings;
    @Mock private PredictionRunRepository runs;
    @Mock private PredictionResultRepository results;
    @Mock private PredictionResultFeedbackRepository feedback;
    @Mock private ModelRepository models;
    @Mock private WorkspaceAccessService workspace;
    @Mock private WorkspaceAuthorizationService authorization;
    @InjectMocks private PredictionRunServiceImpl service;

    @Test
    void listsOnlyCurrentOrganizationRunsNewestFirst() {
        Organization organization = organization();
        PredictionRun run = new PredictionRun();
        when(users.requireById(7L)).thenReturn(new User());
        when(workspace.requireCurrentOrganization(7L)).thenReturn(organization);
        when(runs.findByOrganizationIdOrderByCreatedAtDesc(41L)).thenReturn(List.of(run));

        assertEquals(List.of(run), service.listOrganizationRuns(7L));
        verify(authorization).requireModelView(7L, 41L);
    }

    @Test
    void rejectsCatalogWithoutModelViewPermission() {
        Organization organization = organization();
        when(users.requireById(7L)).thenReturn(new User());
        when(workspace.requireCurrentOrganization(7L)).thenReturn(organization);
        org.mockito.Mockito.doThrow(new OrganizationAccessDeniedException(41L))
                .when(authorization).requireModelView(7L, 41L);

        assertThrows(OrganizationAccessDeniedException.class, () -> service.listOrganizationRuns(7L));
    }

    @Test
    void deletesOrganizationInferenceAndItsDependentResults() {
        Organization organization = organization();
        PredictionRun run = new PredictionRun();
        when(users.requireById(7L)).thenReturn(new User());
        when(workspace.requireCurrentOrganization(7L)).thenReturn(organization);
        when(runs.findByIdAndOrganizationId(12L, 41L)).thenReturn(java.util.Optional.of(run));

        service.deleteRun(7L, 12L);

        verify(authorization).requireRunPredictions(7L, 41L);
        verify(feedback).deleteByResult_Run_Id(12L);
        verify(results).deleteByRun_Id(12L);
        verify(runs).delete(run);
    }

    @Test
    void rejectsDeletingInferenceIncludedInReview() {
        Organization organization = organization();
        PredictionRun run = new PredictionRun();
        when(users.requireById(7L)).thenReturn(new User());
        when(workspace.requireCurrentOrganization(7L)).thenReturn(organization);
        when(runs.findByIdAndOrganizationId(12L, 41L)).thenReturn(java.util.Optional.of(run));
        when(runs.isIncludedInReview(12L)).thenReturn(true);

        assertThrows(ResponseStatusException.class, () -> service.deleteRun(7L, 12L));

        verify(results, never()).deleteByRun_Id(12L);
        verify(runs, never()).delete(run);
    }

    private Organization organization() {
        Organization organization = new Organization();
        organization.setId(41L);
        return organization;
    }
}
