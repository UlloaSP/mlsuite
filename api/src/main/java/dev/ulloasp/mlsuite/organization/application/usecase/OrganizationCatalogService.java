package dev.ulloasp.mlsuite.organization.application.usecase;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.audit.adapter.out.persistence.repository.AuditEventRepository;
import dev.ulloasp.mlsuite.invitation.adapter.out.persistence.repository.InvitationRepository;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationCatalogItemDto;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationPageDto;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationNotFoundException;
import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationRole;
import dev.ulloasp.mlsuite.plugin.adapter.out.persistence.repository.PluginMetadataRepository;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleDefinitionRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewLinkRepository;
import dev.ulloasp.mlsuite.team.adapter.out.persistence.repository.TeamRepository;
import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;

@Service
@Transactional
public class OrganizationCatalogService {

    private final WorkspaceAccessService workspaceAccessService;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMembershipRepository membershipRepository;
    private final ModelRepository modelRepository;
    private final SchemaRepository schemaRepository;
    private final PluginMetadataRepository pluginRepository;
    private final TeamRepository teamRepository;
    private final PredictionRunRepository predictionRunRepository;
    private final InvitationRepository invitationRepository;
    private final RoleDefinitionRepository roleRepository;
    private final SchemaReviewLinkRepository reviewLinkRepository;
    private final AuditEventRepository auditRepository;
    private final UserRepository userRepository;

    public OrganizationCatalogService(
            WorkspaceAccessService workspaceAccessService,
            OrganizationRepository organizationRepository,
            OrganizationMembershipRepository membershipRepository,
            ModelRepository modelRepository,
            SchemaRepository schemaRepository,
            PluginMetadataRepository pluginRepository,
            TeamRepository teamRepository,
            PredictionRunRepository predictionRunRepository,
            InvitationRepository invitationRepository,
            RoleDefinitionRepository roleRepository,
            SchemaReviewLinkRepository reviewLinkRepository,
            AuditEventRepository auditRepository,
            UserRepository userRepository) {
        this.workspaceAccessService = workspaceAccessService;
        this.organizationRepository = organizationRepository;
        this.membershipRepository = membershipRepository;
        this.modelRepository = modelRepository;
        this.schemaRepository = schemaRepository;
        this.pluginRepository = pluginRepository;
        this.teamRepository = teamRepository;
        this.predictionRunRepository = predictionRunRepository;
        this.invitationRepository = invitationRepository;
        this.roleRepository = roleRepository;
        this.reviewLinkRepository = reviewLinkRepository;
        this.auditRepository = auditRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public OrganizationPageDto getPage(Long userId, int page, int size, String search, String filter, String sort) {
        requireSuperadmin(userId);
        var organizations = organizationRepository.findCatalogPage(
                normalizeSearch(search),
                normalizeFilter(filter),
                PageRequest.of(Math.max(page, 0), normalizePageSize(size), sort(sort)));
        return new OrganizationPageDto(
                organizations.getContent().stream().map(this::catalogItem).toList(),
                organizations.getNumber(),
                organizations.getSize(),
                organizations.getTotalElements(),
                organizations.hasNext());
    }

    public void deleteOrganization(Long userId, Long organizationId) {
        requireSuperadmin(userId);
        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new OrganizationNotFoundException(organizationId));
        assertDeletable(organizationId);
        membershipRepository.deleteAll(membershipRepository.findByOrganizationId(organizationId));
        roleRepository.deleteAll(roleRepository.findByOrganizationId(organizationId));
        userRepository.clearCurrentOrganization(organizationId);
        organizationRepository.delete(organization);
    }

    private OrganizationCatalogItemDto catalogItem(Organization organization) {
        Long id = organization.getId();
        OrganizationMembership owner = membershipRepository
                .findByOrganizationIdAndStatusOrderByCreatedAtAsc(id, MembershipStatus.ACTIVE)
                .stream()
                .filter(this::isOwner)
                .findFirst()
                .orElse(null);
        return OrganizationCatalogItemDto.from(
                organization,
                owner != null ? owner.getUser().getFullName() : null,
                owner != null ? owner.getUser().getEmail() : null,
                owner != null ? owner.getUser().getAvatarUrl() : null,
                teamRepository.countByOrganizationId(id),
                modelRepository.countByOrganizationId(id),
                schemaRepository.countByOrganizationId(id),
                pluginRepository.countByOrganizationId(id),
                predictionRunRepository.countByOrganizationId(id),
                true,
                membershipRepository.countByOrganizationIdAndStatus(id, MembershipStatus.ACTIVE));
    }

    private void assertDeletable(Long organizationId) {
        if (modelRepository.countByOrganizationId(organizationId) > 0
                || schemaRepository.countByOrganizationId(organizationId) > 0
                || pluginRepository.countByOrganizationId(organizationId) > 0
                || teamRepository.countByOrganizationId(organizationId) > 0
                || invitationRepository.countByOrganizationId(organizationId) > 0
                || reviewLinkRepository.countByOrganizationId(organizationId) > 0
                || auditRepository.countByOrganizationId(organizationId) > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only empty organizations can be deleted.");
        }
    }

    private void requireSuperadmin(Long userId) {
        if (!workspaceAccessService.isSuperadmin(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Superadmin access required.");
        }
    }

    private boolean isOwner(OrganizationMembership membership) {
        return membership.getRole() == OrganizationRole.OWNER
                || "OWNER".equals(membership.getRoleDefinition() != null
                        ? membership.getRoleDefinition().getSystemKey()
                        : null);
    }

    private String normalizeSearch(String search) {
        return search == null ? "" : search.strip();
    }

    private String normalizeFilter(String filter) {
        return "public".equals(filter) || "private".equals(filter) ? filter : "all";
    }

    private int normalizePageSize(int size) {
        return size <= 0 ? 24 : Math.min(size, 100);
    }

    private Sort sort(String mode) {
        if ("name".equals(mode)) return Sort.by(Sort.Order.asc("name").ignoreCase());
        if ("created".equals(mode)) return Sort.by(Sort.Order.desc("createdAt"));
        return Sort.by(Sort.Order.desc("updatedAt"), Sort.Order.asc("name").ignoreCase());
    }
}
