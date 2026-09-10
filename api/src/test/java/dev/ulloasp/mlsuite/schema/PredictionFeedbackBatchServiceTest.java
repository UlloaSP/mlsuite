package dev.ulloasp.mlsuite.schema;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultFeedbackRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository;
import dev.ulloasp.mlsuite.schema.application.service.PredictionResultFeedbackService;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedback;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@ExtendWith(MockitoExtension.class)
class PredictionFeedbackBatchServiceTest {

    @Mock private UserLookupService userLookupService;
    @Mock private WorkspaceAccessService workspaceAccessService;
    @Mock private WorkspaceAuthorizationService authorizationService;
    @Mock private PredictionResultRepository resultRepository;
    @Mock private PredictionResultFeedbackRepository feedbackRepository;
    @Mock private PredictionRunRepository runRepository;
    private PredictionResultFeedbackService service;

    @BeforeEach
    void setUp() {
        service = new PredictionResultFeedbackService(userLookupService, workspaceAccessService,
                authorizationService, resultRepository, feedbackRepository, runRepository);
        Organization organization = new Organization();
        organization.setId(41L);
        when(userLookupService.requireById(7L)).thenReturn(new User());
        when(workspaceAccessService.requireCurrentOrganization(7L)).thenReturn(organization);
    }

    @Test
    void loadsUniqueRunFeedbackInOneRepositoryCall() {
        List<PredictionResultFeedback> expected = List.of(new PredictionResultFeedback());
        when(runRepository.countByIdsAndOrganizationId(List.of(2L, 1L), 41L)).thenReturn(2L);
        when(feedbackRepository.findByRunIdsAndOrganizationId(List.of(2L, 1L), 41L))
                .thenReturn(expected);

        assertEquals(expected, service.listByRuns(7L, List.of(2L, 1L, 2L)));
        verify(feedbackRepository).findByRunIdsAndOrganizationId(List.of(2L, 1L), 41L);
    }

    @Test
    void rejectsEmptyBatch() {
        assertThrows(ResponseStatusException.class, () -> service.listByRuns(7L, List.of()));
    }

    @Test
    void rejectsRunsOutsideCurrentOrganization() {
        when(runRepository.countByIdsAndOrganizationId(List.of(2L), 41L)).thenReturn(0L);

        assertThrows(ResponseStatusException.class, () -> service.listByRuns(7L, List.of(2L)));
    }
}
