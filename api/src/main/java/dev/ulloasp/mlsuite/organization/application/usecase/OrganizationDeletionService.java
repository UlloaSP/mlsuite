package dev.ulloasp.mlsuite.organization.application.usecase;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.audit.adapter.out.persistence.repository.AuditEventRepository;
import dev.ulloasp.mlsuite.invitation.adapter.out.persistence.repository.InvitationRepository;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationNotFoundException;
import dev.ulloasp.mlsuite.plugin.adapter.out.persistence.repository.PluginMetadataRepository;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleDefinitionRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaRepository;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewRepository;
import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;

@Service
public class OrganizationDeletionService {

    private final OrganizationRepository organizationRepository;
    private final OrganizationMembershipRepository membershipRepository;
    private final ModelRepository modelRepository;
    private final SchemaRepository schemaRepository;
    private final PluginMetadataRepository pluginRepository;
    private final InvitationRepository invitationRepository;
    private final RoleDefinitionRepository roleRepository;
    private final SchemaReviewRepository reviewRepository;
    private final AuditEventRepository auditRepository;
    private final UserRepository userRepository;

    public OrganizationDeletionService(
            OrganizationRepository organizationRepository,
            OrganizationMembershipRepository membershipRepository,
            ModelRepository modelRepository,
            SchemaRepository schemaRepository,
            PluginMetadataRepository pluginRepository,
            InvitationRepository invitationRepository,
            RoleDefinitionRepository roleRepository,
            SchemaReviewRepository reviewRepository,
            AuditEventRepository auditRepository,
            UserRepository userRepository) {
        this.organizationRepository = organizationRepository;
        this.membershipRepository = membershipRepository;
        this.modelRepository = modelRepository;
        this.schemaRepository = schemaRepository;
        this.pluginRepository = pluginRepository;
        this.invitationRepository = invitationRepository;
        this.roleRepository = roleRepository;
        this.reviewRepository = reviewRepository;
        this.auditRepository = auditRepository;
        this.userRepository = userRepository;
    }

    public void delete(Long organizationId) {
        var organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new OrganizationNotFoundException(organizationId));
        assertEmpty(organizationId);
        membershipRepository.deleteAll(membershipRepository.findByOrganizationId(organizationId));
        roleRepository.deleteAll(roleRepository.findByOrganizationId(organizationId));
        userRepository.clearCurrentOrganization(organizationId);
        organizationRepository.delete(organization);
    }

    private void assertEmpty(Long organizationId) {
        if (modelRepository.countByOrganizationId(organizationId) > 0
                || schemaRepository.countByOrganizationId(organizationId) > 0
                || pluginRepository.countByOrganizationId(organizationId) > 0
                || invitationRepository.countByOrganizationId(organizationId) > 0
                || reviewRepository.countByOrganizationId(organizationId) > 0
                || auditRepository.countByOrganizationId(organizationId) > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only empty organizations can be deleted.");
        }
    }
}
