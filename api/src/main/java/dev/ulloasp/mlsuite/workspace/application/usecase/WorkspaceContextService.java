package dev.ulloasp.mlsuite.workspace.application.usecase;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationDto;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationMembershipDto;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationRole;
import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;
import dev.ulloasp.mlsuite.workspace.application.dto.SelectOrganizationRequest;
import dev.ulloasp.mlsuite.workspace.application.dto.WorkspaceContextDto;
import dev.ulloasp.mlsuite.workspace.application.dto.WorkspaceUserDto;
import dev.ulloasp.mlsuite.workspace.application.port.in.WorkspaceContextUseCase;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@Service
@Transactional
public class WorkspaceContextService implements WorkspaceContextUseCase {

    private final WorkspaceAccessService workspaceAccessService;
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMembershipRepository membershipRepository;
    private final WorkspaceAuthorizationService workspaceAuthorizationService;

    public WorkspaceContextService(
            WorkspaceAccessService workspaceAccessService,
            UserRepository userRepository,
            OrganizationRepository organizationRepository,
            OrganizationMembershipRepository membershipRepository,
            WorkspaceAuthorizationService workspaceAuthorizationService) {
        this.workspaceAccessService = workspaceAccessService;
        this.userRepository = userRepository;
        this.organizationRepository = organizationRepository;
        this.membershipRepository = membershipRepository;
        this.workspaceAuthorizationService = workspaceAuthorizationService;
    }

    @Override
    public WorkspaceContextDto getContext(Long userId) {
        var user = workspaceAccessService.requireUser(userId);
        var currentOrganization = workspaceAccessService.requireCurrentOrganization(userId);
        if (workspaceAccessService.isSuperadmin(userId)) {
            OrganizationMembership currentMembership = new OrganizationMembership(
                    currentOrganization,
                    user,
                    OrganizationRole.OWNER,
                    dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus.ACTIVE);
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
        var user = workspaceAccessService.requireUser(userId);
        var membership = workspaceAccessService.requireMembership(userId, request.organizationId());
        user.setCurrentOrganization(membership.getOrganization());
        userRepository.save(user);
        return getContext(userId);
    }
}
