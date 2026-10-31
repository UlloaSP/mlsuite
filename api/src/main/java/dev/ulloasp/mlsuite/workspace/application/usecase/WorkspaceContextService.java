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
        return context(userId, workspaceAccessService.requireCurrentOrganization(userId));
    }

    private WorkspaceContextDto context(Long userId, Organization currentOrganization) {
        User user = workspaceAccessService.requireUser(userId);
        if (workspaceAccessService.isSuperadmin(userId)) {
            OrganizationMembership currentMembership = ownerMembership(user, currentOrganization);
            return new WorkspaceContextDto(
                    WorkspaceUserDto.from(user),
                    List.of(OrganizationMembershipDto.from(currentMembership)),
                    organizationRepository.findAdministeredBy(userId).stream().map(OrganizationDto::from).toList(),
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
        return context(userId, select(userId, request.organizationId()));
    }

    @Override
    public WorkspaceCurrentContextDto getCurrentContext(Long userId) {
        return currentContext(userId, workspaceAccessService.requireCurrentOrganization(userId));
    }

    private WorkspaceCurrentContextDto currentContext(Long userId, Organization currentOrganization) {
        User user = workspaceAccessService.requireUser(userId);
        OrganizationMembership currentMembership = workspaceAccessService.isSuperadmin(userId)
                ? ownerMembership(user, currentOrganization)
                : workspaceAccessService.requireMembership(userId, currentOrganization.getId());
        return new WorkspaceCurrentContextDto(
                WorkspaceUserDto.from(user),
                OrganizationDto.from(currentOrganization),
                OrganizationMembershipDto.from(currentMembership),
                workspaceAuthorizationService.workspacePermissions(userId, currentOrganization.getId()),
                membershipRepository.countActiveTeamsByUserId(userId));
    }

    @Override
    /** Answers for the organization selected, whichever one the request itself names. */
    public WorkspaceCurrentContextDto selectCurrentOrganization(Long userId, SelectOrganizationRequest request) {
        return currentContext(userId, select(userId, request.organizationId()));
    }

    /** {@code filter=team} leaves the personal account out, which otherwise leads the list. */
    @Override
    public PageDto<OrganizationDto> organizations(Long userId, CatalogRequest request) {
        workspaceAccessService.requireUser(userId);
        Page<Organization> page = organizationRepository.findAccessiblePage(userId,
                workspaceAccessService.isSuperadmin(userId), request.filter().equalsIgnoreCase("team"),
                CatalogPages.likeLiteral(request.search()),
                CatalogPages.pageable(request, Sort.by("kind", "name", "id")));
        return PageDto.of(page, page.getContent().stream().map(OrganizationDto::from).toList());
    }

    /** Stores the organization the user selected, which a request naming none acts in. */
    private Organization select(Long userId, Long organizationId) {
        User user = workspaceAccessService.requireUser(userId);
        OrganizationMembership membership = workspaceAccessService.requireMembership(userId, organizationId);
        user.setCurrentOrganization(membership.getOrganization());
        userRepository.save(user);
        return membership.getOrganization();
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
