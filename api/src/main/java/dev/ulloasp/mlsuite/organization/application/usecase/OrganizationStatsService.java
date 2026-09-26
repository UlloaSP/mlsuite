package dev.ulloasp.mlsuite.organization.application.usecase;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.invitation.adapter.out.persistence.repository.InvitationRepository;
import dev.ulloasp.mlsuite.invitation.domain.model.InvitationStatus;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationAdminStatsDto;
import dev.ulloasp.mlsuite.plugin.adapter.out.persistence.repository.PluginMetadataRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaRepository;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewRepository;
import dev.ulloasp.mlsuite.workspace.application.dto.WorkspacePermissionsDto;

/** Organization overview counts, each computed only when the caller may see that resource. */
@Service
@Transactional(readOnly = true)
public class OrganizationStatsService {

    private final OrganizationMembershipRepository membershipRepository;
    private final InvitationRepository invitationRepository;
    private final ModelRepository modelRepository;
    private final SchemaRepository schemaRepository;
    private final PredictionRunRepository predictionRunRepository;
    private final PluginMetadataRepository pluginRepository;
    private final SchemaReviewRepository reviewRepository;

    public OrganizationStatsService(
            OrganizationMembershipRepository membershipRepository,
            InvitationRepository invitationRepository,
            ModelRepository modelRepository,
            SchemaRepository schemaRepository,
            PredictionRunRepository predictionRunRepository,
            PluginMetadataRepository pluginRepository,
            SchemaReviewRepository reviewRepository) {
        this.membershipRepository = membershipRepository;
        this.invitationRepository = invitationRepository;
        this.modelRepository = modelRepository;
        this.schemaRepository = schemaRepository;
        this.predictionRunRepository = predictionRunRepository;
        this.pluginRepository = pluginRepository;
        this.reviewRepository = reviewRepository;
    }

    public OrganizationAdminStatsDto stats(Long organizationId, WorkspacePermissionsDto permissions) {
        boolean models = permissions.canViewModels();
        return new OrganizationAdminStatsDto(
                permissions.canViewMembers() ? membershipRepository.countActiveByOrganizationId(organizationId) : 0,
                models ? modelRepository.countByOrganizationId(organizationId) : 0,
                permissions.canViewInvitations()
                        ? invitationRepository.countByOrganizationIdAndStatus(organizationId, InvitationStatus.PENDING)
                        : 0,
                models ? schemaRepository.countByOrganizationId(organizationId) : 0,
                models ? predictionRunRepository.countByOrganizationId(organizationId) : 0,
                permissions.canViewPlugins() ? pluginRepository.countByOrganizationId(organizationId) : 0,
                permissions.canReview() || permissions.canManageReviews()
                        ? reviewRepository.countByOrganizationId(organizationId)
                        : 0);
    }
}
