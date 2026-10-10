package dev.ulloasp.mlsuite.workspace.application.dto;

import dev.ulloasp.mlsuite.organization.application.dto.OrganizationDto;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationMembershipDto;

/** Who the user is and where they work now, with how many organizations they are an active member of. */
public record WorkspaceCurrentContextDto(
        WorkspaceUserDto user,
        OrganizationDto currentOrganization,
        OrganizationMembershipDto currentMembership,
        WorkspacePermissionsDto permissions,
        long membershipCount) {
}
