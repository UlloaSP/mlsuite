package dev.ulloasp.mlsuite.workspace.application.dto;

import java.util.List;

import dev.ulloasp.mlsuite.organization.application.dto.OrganizationDto;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationMembershipDto;
import dev.ulloasp.mlsuite.team.application.dto.TeamDto;

public record WorkspaceContextDto(
        WorkspaceUserDto user,
        List<OrganizationMembershipDto> memberships,
        List<OrganizationDto> organizations,
        OrganizationDto currentOrganization,
        OrganizationMembershipDto currentMembership,
        List<TeamDto> teams,
        WorkspacePermissionsDto permissions) {
}
