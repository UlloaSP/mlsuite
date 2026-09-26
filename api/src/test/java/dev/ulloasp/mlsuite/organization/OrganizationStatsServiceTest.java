package dev.ulloasp.mlsuite.organization;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import dev.ulloasp.mlsuite.invitation.adapter.out.persistence.repository.InvitationRepository;
import dev.ulloasp.mlsuite.invitation.domain.model.InvitationStatus;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationAdminStatsDto;
import dev.ulloasp.mlsuite.organization.application.usecase.OrganizationStatsService;
import dev.ulloasp.mlsuite.plugin.adapter.out.persistence.repository.PluginMetadataRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaRepository;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewRepository;
import dev.ulloasp.mlsuite.workspace.application.dto.WorkspacePermissionsDto;

@ExtendWith(MockitoExtension.class)
class OrganizationStatsServiceTest {

    @Mock private OrganizationMembershipRepository membershipRepository;
    @Mock private InvitationRepository invitationRepository;
    @Mock private ModelRepository modelRepository;
    @Mock private SchemaRepository schemaRepository;
    @Mock private PredictionRunRepository predictionRunRepository;
    @Mock private PluginMetadataRepository pluginRepository;
    @Mock private SchemaReviewRepository reviewRepository;
    @Mock private WorkspacePermissionsDto permissions;

    private OrganizationStatsService service;

    @BeforeEach
    void setUp() {
        service = new OrganizationStatsService(
                membershipRepository,
                invitationRepository,
                modelRepository,
                schemaRepository,
                predictionRunRepository,
                pluginRepository,
                reviewRepository);
    }

    @Test
    void countsEveryResourceTheCallerMaySee() {
        when(permissions.canViewMembers()).thenReturn(true);
        when(permissions.canViewInvitations()).thenReturn(true);
        when(permissions.canViewModels()).thenReturn(true);
        when(permissions.canViewPlugins()).thenReturn(true);
        when(permissions.canReview()).thenReturn(true);
        when(membershipRepository.countActiveByOrganizationId(41L)).thenReturn(4L);
        when(invitationRepository.countByOrganizationIdAndStatus(41L, InvitationStatus.PENDING)).thenReturn(2L);
        when(modelRepository.countByOrganizationId(41L)).thenReturn(3L);
        when(schemaRepository.countByOrganizationId(41L)).thenReturn(5L);
        when(predictionRunRepository.countByOrganizationId(41L)).thenReturn(120L);
        when(pluginRepository.countByOrganizationId(41L)).thenReturn(6L);
        when(reviewRepository.countByOrganizationId(41L)).thenReturn(7L);

        assertEquals(new OrganizationAdminStatsDto(4, 3, 2, 5, 120, 6, 7), service.stats(41L, permissions));
    }

    @Test
    void countsReviewsForReviewManagersWhoDoNotReview() {
        when(permissions.canManageReviews()).thenReturn(true);
        when(reviewRepository.countByOrganizationId(anyLong())).thenReturn(9L);

        assertEquals(9, service.stats(41L, permissions).totalReviews());
    }

    @Test
    void skipsQueriesForResourcesTheCallerCannotSee() {
        assertEquals(new OrganizationAdminStatsDto(0, 0, 0, 0, 0, 0, 0), service.stats(41L, permissions));
        verifyNoInteractions(
                membershipRepository,
                invitationRepository,
                modelRepository,
                schemaRepository,
                predictionRunRepository,
                pluginRepository,
                reviewRepository);
    }
}
