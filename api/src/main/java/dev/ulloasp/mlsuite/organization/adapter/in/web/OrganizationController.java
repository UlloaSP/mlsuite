package dev.ulloasp.mlsuite.organization.adapter.in.web;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;

import dev.ulloasp.mlsuite.organization.application.dto.CreateOrganizationRequest;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationDto;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationMembershipDto;
import dev.ulloasp.mlsuite.organization.application.dto.UpdateOrganizationMembershipRoleRequest;
import dev.ulloasp.mlsuite.organization.application.dto.UpdateOrganizationRequest;
import jakarta.validation.Valid;

@RequestMapping("/api/organizations")
public interface OrganizationController {

    @GetMapping
    ResponseEntity<List<OrganizationDto>> listOrganizations(OAuth2AuthenticationToken authentication);

    @PostMapping
    ResponseEntity<OrganizationDto> createOrganization(
            OAuth2AuthenticationToken authentication,
            @Valid @RequestBody CreateOrganizationRequest request);

    @GetMapping("/{organizationId}")
    ResponseEntity<OrganizationDto> getOrganization(
            OAuth2AuthenticationToken authentication,
            @PathVariable Long organizationId);

    @PatchMapping("/{organizationId}")
    ResponseEntity<OrganizationDto> updateOrganization(
            OAuth2AuthenticationToken authentication,
            @PathVariable Long organizationId,
            @Valid @RequestBody UpdateOrganizationRequest request);

    @DeleteMapping("/{organizationId}")
    ResponseEntity<Void> deleteOrganization(
            OAuth2AuthenticationToken authentication,
            @PathVariable Long organizationId);

    @GetMapping("/{organizationId}/members")
    ResponseEntity<List<OrganizationMembershipDto>> listMembers(
            OAuth2AuthenticationToken authentication,
            @PathVariable Long organizationId);

    @PatchMapping("/{organizationId}/members/{membershipId}")
    ResponseEntity<OrganizationMembershipDto> updateMemberRole(
            OAuth2AuthenticationToken authentication,
            @PathVariable Long organizationId,
            @PathVariable Long membershipId,
            @Valid @RequestBody UpdateOrganizationMembershipRoleRequest request);

    @DeleteMapping("/{organizationId}/members/{membershipId}")
    ResponseEntity<Void> removeMember(
            OAuth2AuthenticationToken authentication,
            @PathVariable Long organizationId,
            @PathVariable Long membershipId);
}
