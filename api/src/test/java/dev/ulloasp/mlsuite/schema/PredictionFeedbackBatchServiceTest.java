package dev.ulloasp.mlsuite.schema;

import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultFeedbackRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultFeedbackRevisionRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository;
import dev.ulloasp.mlsuite.schema.application.service.PredictionResultFeedbackService;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewRepository;
import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedback;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@ExtendWith(MockitoExtension.class)
class PredictionFeedbackBatchServiceTest {

    @Mock private WorkspaceAuthorizationService authorizationService;
    @Mock private PredictionResultRepository resultRepository;
    @Mock private PredictionResultFeedbackRepository feedbackRepository;
    @Mock private PredictionRunRepository runRepository;
    private PredictionResultFeedbackService service;

    @BeforeEach
    void setUp() {
        service = new PredictionResultFeedbackService(
                authorizationService, resultRepository, feedbackRepository, runRepository,
                mock(PredictionResultFeedbackRevisionRepository.class), mock(UserRepository.class),
                mock(SchemaReviewRepository.class));
        Organization organization = new Organization();
        organization.setId(41L);
        lenient().when(authorizationService.requireCurrent(eq(7L), any(PermissionKey[].class))).thenReturn(organization);
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
