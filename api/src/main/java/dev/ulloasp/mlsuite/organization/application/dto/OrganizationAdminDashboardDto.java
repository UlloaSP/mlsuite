package dev.ulloasp.mlsuite.organization.application.dto;

import java.util.List;

import dev.ulloasp.mlsuite.invitation.application.dto.InvitationDto;
import dev.ulloasp.mlsuite.team.application.dto.TeamDto;
import dev.ulloasp.mlsuite.workspace.application.dto.WorkspacePermissionsDto;

public record OrganizationAdminDashboardDto(
        OrganizationDto organization,
        WorkspacePermissionsDto permissions,
        OrganizationAdminStatsDto stats,
        List<TeamDto> recentTeams,
        List<OrganizationMembershipRowDto> recentMembers,
        List<InvitationDto> recentInvitations) {
}
