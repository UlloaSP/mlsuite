package dev.ulloasp.mlsuite.team.adapter.in.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import dev.ulloasp.mlsuite.team.application.dto.CreateTeamRequest;
import dev.ulloasp.mlsuite.team.application.dto.TeamDto;
import dev.ulloasp.mlsuite.team.application.dto.TeamMembershipDto;
import dev.ulloasp.mlsuite.team.application.dto.UpdateTeamMembershipRoleRequest;
import dev.ulloasp.mlsuite.team.application.dto.UpdateTeamRequest;
import dev.ulloasp.mlsuite.team.application.port.in.TeamManagementUseCase;

@RestController
public class TeamControllerImpl implements TeamController {

    private final CurrentUserResolver currentUserResolver;
    private final TeamManagementUseCase teamManagementUseCase;

    public TeamControllerImpl(CurrentUserResolver currentUserResolver, TeamManagementUseCase teamManagementUseCase) {
        this.currentUserResolver = currentUserResolver;
        this.teamManagementUseCase = teamManagementUseCase;
    }

    @Override
    public ResponseEntity<List<TeamDto>> listTeams(Authentication authentication, Long organizationId) {
        return ResponseEntity.ok(teamManagementUseCase.listTeams(currentUserResolver.resolve(authentication).userId(), organizationId));
    }

    @Override
    public ResponseEntity<TeamDto> createTeam(
            Authentication authentication,
            Long organizationId,
            CreateTeamRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(teamManagementUseCase.createTeam(currentUserResolver.resolve(authentication).userId(), organizationId, request));
    }

    @Override
    public ResponseEntity<TeamDto> getTeam(Authentication authentication, Long teamId) {
        return ResponseEntity.ok(teamManagementUseCase.getTeam(currentUserResolver.resolve(authentication).userId(), teamId));
    }

    @Override
    public ResponseEntity<TeamDto> updateTeam(Authentication authentication, Long teamId, UpdateTeamRequest request) {
        return ResponseEntity.ok(teamManagementUseCase.updateTeam(currentUserResolver.resolve(authentication).userId(), teamId, request));
    }

    @Override
    public ResponseEntity<Void> deleteTeam(Authentication authentication, Long teamId) {
        teamManagementUseCase.deleteTeam(currentUserResolver.resolve(authentication).userId(), teamId);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<List<TeamMembershipDto>> listMembers(Authentication authentication, Long teamId) {
        return ResponseEntity.ok(teamManagementUseCase.listMembers(currentUserResolver.resolve(authentication).userId(), teamId));
    }

    @Override
    public ResponseEntity<TeamMembershipDto> updateMemberRole(
            Authentication authentication,
            Long teamId,
            Long membershipId,
            UpdateTeamMembershipRoleRequest request) {
        return ResponseEntity.ok(teamManagementUseCase.updateMemberRole(
                currentUserResolver.resolve(authentication).userId(),
                teamId,
                membershipId,
                request));
    }

    @Override
    public ResponseEntity<Void> removeMember(Authentication authentication, Long teamId, Long membershipId) {
        teamManagementUseCase.removeMember(currentUserResolver.resolve(authentication).userId(), teamId, membershipId);
        return ResponseEntity.noContent().build();
    }
}
