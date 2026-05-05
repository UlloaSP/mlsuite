package dev.ulloasp.mlsuite.team.adapter.in.web;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import dev.ulloasp.mlsuite.team.application.dto.CreateTeamRequest;
import dev.ulloasp.mlsuite.team.application.dto.TeamDto;
import dev.ulloasp.mlsuite.team.application.dto.TeamMembershipDto;
import dev.ulloasp.mlsuite.team.application.dto.UpdateTeamMembershipRoleRequest;
import dev.ulloasp.mlsuite.team.application.dto.UpdateTeamRequest;
import jakarta.validation.Valid;

public interface TeamController {

    @GetMapping("/api/organizations/{organizationId}/teams")
    ResponseEntity<List<TeamDto>> listTeams(Authentication authentication, @PathVariable Long organizationId);

    @PostMapping("/api/organizations/{organizationId}/teams")
    ResponseEntity<TeamDto> createTeam(
            Authentication authentication,
            @PathVariable Long organizationId,
            @Valid @RequestBody CreateTeamRequest request);

    @GetMapping("/api/teams/{teamId}")
    ResponseEntity<TeamDto> getTeam(Authentication authentication, @PathVariable Long teamId);

    @PatchMapping("/api/teams/{teamId}")
    ResponseEntity<TeamDto> updateTeam(
            Authentication authentication,
            @PathVariable Long teamId,
            @Valid @RequestBody UpdateTeamRequest request);

    @DeleteMapping("/api/teams/{teamId}")
    ResponseEntity<Void> deleteTeam(Authentication authentication, @PathVariable Long teamId);

    @GetMapping("/api/teams/{teamId}/members")
    ResponseEntity<List<TeamMembershipDto>> listMembers(Authentication authentication, @PathVariable Long teamId);

    @PatchMapping("/api/teams/{teamId}/members/{membershipId}")
    ResponseEntity<TeamMembershipDto> updateMemberRole(
            Authentication authentication,
            @PathVariable Long teamId,
            @PathVariable Long membershipId,
            @Valid @RequestBody UpdateTeamMembershipRoleRequest request);

    @DeleteMapping("/api/teams/{teamId}/members/{membershipId}")
    ResponseEntity<Void> removeMember(
            Authentication authentication,
            @PathVariable Long teamId,
            @PathVariable Long membershipId);
}
