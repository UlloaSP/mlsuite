package dev.ulloasp.mlsuite.workspace.application.usecase;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationDto;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationMembershipDto;
import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationRole;
import dev.ulloasp.mlsuite.role.application.service.RoleSeedService;
import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.util.CatalogPages;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;
import dev.ulloasp.mlsuite.workspace.application.dto.SelectOrganizationRequest;
import dev.ulloasp.mlsuite.workspace.application.dto.WorkspaceContextDto;
import dev.ulloasp.mlsuite.workspace.application.dto.WorkspaceCurrentContextDto;
import dev.ulloasp.mlsuite.workspace.application.dto.WorkspaceUserDto;
import dev.ulloasp.mlsuite.workspace.application.port.in.WorkspaceContextUseCase;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import lombok.RequiredArgsConstructor;

@Service
@Transactional
@RequiredArgsConstructor
public class WorkspaceContextService implements WorkspaceContextUseCase {

    private final WorkspaceAccessService workspaceAccessService;
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMembershipRepository membershipRepository;
    private final WorkspaceAuthorizationService workspaceAuthorizationService;
    private final RoleSeedService roleSeedService;

    @Override
    public WorkspaceContextDto getContext(Long userId) {
        User user = workspaceAccessService.requireUser(userId);
        Organization currentOrganization = workspaceAccessService.requireCurrentOrganization(userId);
        if (workspaceAccessService.isSuperadmin(userId)) {
            OrganizationMembership currentMembership = ownerMembership(user, currentOrganization);
            return new WorkspaceContextDto(
                    WorkspaceUserDto.from(user),
                    List.of(OrganizationMembershipDto.from(currentMembership)),
                    organizationRepository.findAll().stream().map(OrganizationDto::from).toList(),
                    OrganizationDto.from(currentOrganization),
                    OrganizationMembershipDto.from(currentMembership),
                    workspaceAuthorizationService.workspacePermissions(userId, currentOrganization.getId()));
        }
        List<OrganizationMembership> memberships = membershipRepository.findActiveByUserId(userId);
        OrganizationMembership currentMembership = memberships.stream()
                .filter(membership -> membership.getOrganization().getId().equals(currentOrganization.getId()))
                .findFirst()
                .orElseThrow();
        return new WorkspaceContextDto(
                WorkspaceUserDto.from(user),
                memberships.stream().map(OrganizationMembershipDto::from).toList(),
                memberships.stream().map(OrganizationMembership::getOrganization).map(OrganizationDto::from).toList(),
                OrganizationDto.from(currentOrganization),
                OrganizationMembershipDto.from(currentMembership),
                workspaceAuthorizationService.workspacePermissions(userId, currentOrganization.getId()));
    }

    @Override
    public WorkspaceContextDto selectOrganization(Long userId, SelectOrganizationRequest request) {
        select(userId, request.organizationId());
        return getContext(userId);
    }

    @Override
    public WorkspaceCurrentContextDto getCurrentContext(Long userId) {
        User user = workspaceAccessService.requireUser(userId);
        Organization currentOrganization = workspaceAccessService.requireCurrentOrganization(userId);
        boolean superadmin = workspaceAccessService.isSuperadmin(userId);
        OrganizationMembership currentMembership = superadmin
                ? ownerMembership(user, currentOrganization)
                : workspaceAccessService.requireMembership(userId, currentOrganization.getId());
        return new WorkspaceCurrentContextDto(
                WorkspaceUserDto.from(user),
                OrganizationDto.from(currentOrganization),
                OrganizationMembershipDto.from(currentMembership),
                workspaceAuthorizationService.workspacePermissions(userId, currentOrganization.getId()),
                superadmin ? 1 : membershipRepository.countByUserIdAndStatus(userId, MembershipStatus.ACTIVE));
    }

    @Override
    public WorkspaceCurrentContextDto selectCurrentOrganization(Long userId, SelectOrganizationRequest request) {
        select(userId, request.organizationId());
        return getCurrentContext(userId);
    }

    @Override
    public PageDto<OrganizationDto> organizations(Long userId, CatalogRequest request) {
        workspaceAccessService.requireUser(userId);
        Page<Organization> page = organizationRepository.findAccessiblePage(userId,
                workspaceAccessService.isSuperadmin(userId), CatalogPages.likeLiteral(request.search()),
                CatalogPages.pageable(request, Sort.by("name", "id")));
        return PageDto.of(page, page.getContent().stream().map(OrganizationDto::from).toList());
    }

    private void select(Long userId, Long organizationId) {
        User user = workspaceAccessService.requireUser(userId);
        OrganizationMembership membership = workspaceAccessService.requireMembership(userId, organizationId);
        user.setCurrentOrganization(membership.getOrganization());
        userRepository.save(user);
    }

    /** A superadmin has no stored membership and acts as the owner of the organization they select. */
    private OrganizationMembership ownerMembership(User user, Organization organization) {
        return new OrganizationMembership(
                organization,
                user,
                roleSeedService.orgRole(organization, OrganizationRole.OWNER),
                MembershipStatus.ACTIVE);
    }
}
