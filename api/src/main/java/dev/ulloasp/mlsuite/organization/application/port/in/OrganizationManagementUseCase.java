package dev.ulloasp.mlsuite.organization.application.port.in;

import java.util.List;

import dev.ulloasp.mlsuite.organization.application.dto.CreateOrganizationRequest;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationDto;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationAdminDashboardDto;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationMembershipDto;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationMembershipRowDto;
import dev.ulloasp.mlsuite.organization.application.dto.TransferOrganizationOwnershipRequest;
import dev.ulloasp.mlsuite.organization.application.dto.UpdateOrganizationMembershipRoleRequest;
import dev.ulloasp.mlsuite.organization.application.dto.UpdateOrganizationRequest;

public interface OrganizationManagementUseCase {

    List<OrganizationDto> listOrganizations(Long userId);

    OrganizationDto createOrganization(Long userId, CreateOrganizationRequest request);

    OrganizationDto getOrganization(Long userId, Long organizationId);

    OrganizationAdminDashboardDto getAdminDashboard(Long userId, Long organizationId);

    OrganizationDto updateOrganization(Long userId, Long organizationId, UpdateOrganizationRequest request);

    void deleteOrganization(Long userId, Long organizationId);

    List<OrganizationMembershipRowDto> listMembers(Long userId, Long organizationId);

    OrganizationMembershipDto updateMemberRole(
            Long userId,
            Long organizationId,
            Long membershipId,
            UpdateOrganizationMembershipRoleRequest request);

    void removeMember(Long userId, Long organizationId, Long membershipId);

    OrganizationMembershipDto transferOwnership(
            Long userId,
            Long organizationId,
            TransferOrganizationOwnershipRequest request);
}
