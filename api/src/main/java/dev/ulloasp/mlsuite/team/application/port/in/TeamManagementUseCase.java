package dev.ulloasp.mlsuite.team.application.port.in;

import java.util.List;

import dev.ulloasp.mlsuite.team.application.dto.CreateTeamRequest;
import dev.ulloasp.mlsuite.team.application.dto.TeamDetailDto;
import dev.ulloasp.mlsuite.team.application.dto.TeamDto;
import dev.ulloasp.mlsuite.team.application.dto.TeamMembershipDto;
import dev.ulloasp.mlsuite.team.application.dto.TeamMembershipRowDto;
import dev.ulloasp.mlsuite.team.application.dto.UpdateTeamMembershipRoleRequest;
import dev.ulloasp.mlsuite.team.application.dto.UpdateTeamRequest;

public interface TeamManagementUseCase {

    List<TeamDto> listTeams(Long userId, Long organizationId);

    TeamDto createTeam(Long userId, Long organizationId, CreateTeamRequest request);

    TeamDetailDto getTeam(Long userId, Long teamId);

    TeamDto updateTeam(Long userId, Long teamId, UpdateTeamRequest request);

    void deleteTeam(Long userId, Long teamId);

    List<TeamMembershipRowDto> listMembers(Long userId, Long teamId);

    TeamMembershipDto updateMemberRole(Long userId, Long teamId, Long membershipId, UpdateTeamMembershipRoleRequest request);

    void removeMember(Long userId, Long teamId, Long membershipId);
}
