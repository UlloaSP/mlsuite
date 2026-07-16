package dev.ulloasp.mlsuite.organization.adapter.in.web;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import dev.ulloasp.mlsuite.organization.application.dto.CreateOrganizationRequest;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationAdminDashboardDto;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationDto;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationMembershipDto;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationMembershipRowDto;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationPageDto;
import dev.ulloasp.mlsuite.organization.application.dto.TransferOrganizationOwnershipRequest;
import dev.ulloasp.mlsuite.organization.application.dto.UpdateOrganizationMembershipRoleRequest;
import dev.ulloasp.mlsuite.organization.application.dto.UpdateOrganizationRequest;
import jakarta.validation.Valid;

@RequestMapping("/api/organizations")
public interface OrganizationController {

    @GetMapping
    ResponseEntity<List<OrganizationDto>> listOrganizations(Authentication authentication);

    @GetMapping("/catalog")
    ResponseEntity<OrganizationPageDto> getOrganizationPage(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size,
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "all") String filter,
            @RequestParam(defaultValue = "updated") String sort);

    @PostMapping
    ResponseEntity<OrganizationDto> createOrganization(
            Authentication authentication,
            @Valid @RequestBody CreateOrganizationRequest request);

    @GetMapping("/{organizationId}")
    ResponseEntity<OrganizationDto> getOrganization(
            Authentication authentication,
            @PathVariable Long organizationId);

    @GetMapping("/{organizationId}/admin-dashboard")
    ResponseEntity<OrganizationAdminDashboardDto> getAdminDashboard(
            Authentication authentication,
            @PathVariable Long organizationId);

    @PatchMapping("/{organizationId}")
    ResponseEntity<OrganizationDto> updateOrganization(
            Authentication authentication,
            @PathVariable Long organizationId,
            @Valid @RequestBody UpdateOrganizationRequest request);

    @DeleteMapping("/{organizationId}")
    ResponseEntity<Void> deleteOrganization(
            Authentication authentication,
            @PathVariable Long organizationId);

    @GetMapping("/{organizationId}/members")
    ResponseEntity<List<OrganizationMembershipRowDto>> listMembers(
            Authentication authentication,
            @PathVariable Long organizationId);

    @PatchMapping("/{organizationId}/members/{membershipId}")
    ResponseEntity<OrganizationMembershipDto> updateMemberRole(
            Authentication authentication,
            @PathVariable Long organizationId,
            @PathVariable Long membershipId,
            @Valid @RequestBody UpdateOrganizationMembershipRoleRequest request);

    @DeleteMapping("/{organizationId}/members/{membershipId}")
    ResponseEntity<Void> removeMember(
            Authentication authentication,
            @PathVariable Long organizationId,
            @PathVariable Long membershipId);

    @PostMapping("/{organizationId}/transfer-ownership")
    ResponseEntity<OrganizationMembershipDto> transferOwnership(
            Authentication authentication,
            @PathVariable Long organizationId,
            @Valid @RequestBody TransferOrganizationOwnershipRequest request);
}
