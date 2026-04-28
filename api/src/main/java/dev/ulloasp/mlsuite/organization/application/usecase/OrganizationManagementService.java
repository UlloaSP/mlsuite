package dev.ulloasp.mlsuite.organization.application.usecase;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.organization.application.dto.CreateOrganizationRequest;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationDto;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationMembershipDto;
import dev.ulloasp.mlsuite.organization.application.dto.UpdateOrganizationMembershipRoleRequest;
import dev.ulloasp.mlsuite.organization.application.dto.UpdateOrganizationRequest;
import dev.ulloasp.mlsuite.organization.application.port.in.OrganizationManagementUseCase;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAlreadyExistsException;
import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationRole;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;

@Service
@Transactional
public class OrganizationManagementService implements OrganizationManagementUseCase {

    private final WorkspaceAccessService workspaceAccessService;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMembershipRepository membershipRepository;

    public OrganizationManagementService(
            WorkspaceAccessService workspaceAccessService,
            OrganizationRepository organizationRepository,
            OrganizationMembershipRepository membershipRepository) {
        this.workspaceAccessService = workspaceAccessService;
        this.organizationRepository = organizationRepository;
        this.membershipRepository = membershipRepository;
    }

    @Override
    public List<OrganizationDto> listOrganizations(Long userId) {
        workspaceAccessService.requireUser(userId);
        return membershipRepository.findActiveByUserId(userId).stream()
                .map(OrganizationMembership::getOrganization)
                .map(OrganizationDto::from)
                .toList();
    }

    @Override
    public OrganizationDto createOrganization(Long userId, CreateOrganizationRequest request) {
        User user = workspaceAccessService.requireUser(userId);
        String slug = normalizeSlug(request.slug(), request.name());
        if (organizationRepository.existsBySlug(slug)) {
            throw new OrganizationAlreadyExistsException(slug);
        }
        Organization organization = organizationRepository.save(new Organization(
                slug,
                request.name().strip(),
                request.description(),
                user.getAvatarUrl(),
                user));
        membershipRepository.save(new OrganizationMembership(
                organization,
                user,
                OrganizationRole.OWNER,
                MembershipStatus.ACTIVE));
        user.setCurrentOrganization(organization);
        return OrganizationDto.from(organization);
    }

    @Override
    public OrganizationDto getOrganization(Long userId, Long organizationId) {
        return OrganizationDto.from(workspaceAccessService.requireMembership(userId, organizationId).getOrganization());
    }

    @Override
    public OrganizationDto updateOrganization(Long userId, Long organizationId, UpdateOrganizationRequest request) {
        Organization organization = workspaceAccessService.requireAdminOrganization(userId, organizationId);
        organization.setName(request.name().strip());
        organization.setDescription(request.description());
        return OrganizationDto.from(organizationRepository.save(organization));
    }

    @Override
    public void deleteOrganization(Long userId, Long organizationId) {
        Organization organization = workspaceAccessService.requireOwnerOrganization(userId, organizationId);
        organizationRepository.delete(organization);
    }

    @Override
    public List<OrganizationMembershipDto> listMembers(Long userId, Long organizationId) {
        workspaceAccessService.requireMembership(userId, organizationId);
        return membershipRepository.findByOrganizationIdAndStatusOrderByCreatedAtAsc(organizationId, MembershipStatus.ACTIVE)
                .stream()
                .map(OrganizationMembershipDto::from)
                .toList();
    }

    @Override
    public OrganizationMembershipDto updateMemberRole(
            Long userId,
            Long organizationId,
            Long membershipId,
            UpdateOrganizationMembershipRoleRequest request) {
        workspaceAccessService.requireOwnerOrganization(userId, organizationId);
        OrganizationMembership membership = membershipRepository.findById(membershipId)
                .orElseThrow(() -> new IllegalArgumentException("Membership does not exist."));
        if (!membership.getOrganization().getId().equals(organizationId)) {
            throw new IllegalArgumentException("Membership does not belong to organization.");
        }
        membership.setRole(OrganizationRole.valueOf(request.role().trim().toUpperCase()));
        return OrganizationMembershipDto.from(membershipRepository.save(membership));
    }

    @Override
    public void removeMember(Long userId, Long organizationId, Long membershipId) {
        workspaceAccessService.requireOwnerOrganization(userId, organizationId);
        OrganizationMembership membership = membershipRepository.findById(membershipId)
                .orElseThrow(() -> new IllegalArgumentException("Membership does not exist."));
        if (!membership.getOrganization().getId().equals(organizationId)) {
            throw new IllegalArgumentException("Membership does not belong to organization.");
        }
        if (membership.getRole() == OrganizationRole.OWNER) {
            throw new IllegalArgumentException("Cannot remove organization owner.");
        }
        membership.setStatus(MembershipStatus.REMOVED);
        membershipRepository.save(membership);
    }

    private String normalizeSlug(String rawSlug, String rawName) {
        String base = (rawSlug != null && !rawSlug.isBlank() ? rawSlug : rawName)
                .toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        return base.isBlank() ? "workspace" : base;
    }
}
