package dev.ulloasp.mlsuite.organization.adapter.in.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.organization.application.dto.CreateOrganizationRequest;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationAdminDashboardDto;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationDto;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationMembershipDto;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationMembershipRowDto;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationCatalogItemDto;
import dev.ulloasp.mlsuite.util.PageDto;
import dev.ulloasp.mlsuite.organization.application.dto.TransferOrganizationOwnershipRequest;
import dev.ulloasp.mlsuite.organization.application.dto.UpdateOrganizationMembershipRoleRequest;
import dev.ulloasp.mlsuite.organization.application.dto.UpdateOrganizationRequest;
import dev.ulloasp.mlsuite.organization.application.port.in.OrganizationManagementUseCase;
import dev.ulloasp.mlsuite.organization.application.usecase.OrganizationCatalogService;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import jakarta.validation.Valid;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/organizations")
public class OrganizationController {

    private final OrganizationManagementUseCase organizationManagementUseCase;
    private final OrganizationCatalogService organizationCatalogService;

    @GetMapping
    public ResponseEntity<List<OrganizationDto>> listOrganizations(CurrentUser user) {
        return ResponseEntity.ok(organizationManagementUseCase.listOrganizations(user.userId()));
    }

    @GetMapping("/catalog")
    public ResponseEntity<PageDto<OrganizationCatalogItemDto>> getOrganizationPage(
            CurrentUser user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size,
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "updated") String sort) {
        return ResponseEntity.ok(organizationCatalogService.getPage(
                user.userId(),
                page,
                size,
                search,
                sort));
    }

    @PostMapping
    public ResponseEntity<OrganizationDto> createOrganization(
            CurrentUser user,
            @Valid @RequestBody CreateOrganizationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(organizationManagementUseCase.createOrganization(user.userId(), request));
    }

    @GetMapping("/{organizationId}")
    public ResponseEntity<OrganizationDto> getOrganization(
            CurrentUser user,
            @PathVariable Long organizationId) {
        return ResponseEntity.ok(organizationManagementUseCase.getOrganization(user.userId(), organizationId));
    }

    @GetMapping("/{organizationId}/admin-dashboard")
    public ResponseEntity<OrganizationAdminDashboardDto> getAdminDashboard(
            CurrentUser user,
            @PathVariable Long organizationId) {
        return ResponseEntity.ok(organizationManagementUseCase.getAdminDashboard(
                user.userId(),
                organizationId));
    }

    @PatchMapping("/{organizationId}")
    public ResponseEntity<OrganizationDto> updateOrganization(
            CurrentUser user,
            @PathVariable Long organizationId,
            @Valid @RequestBody UpdateOrganizationRequest request) {
        return ResponseEntity.ok(organizationManagementUseCase.updateOrganization(
                user.userId(),
                organizationId,
                request));
    }

    @DeleteMapping("/{organizationId}")
    public ResponseEntity<Void> deleteOrganization(
            CurrentUser user,
            @PathVariable Long organizationId) {
        organizationManagementUseCase.deleteOrganization(user.userId(), organizationId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{organizationId}/members")
    public ResponseEntity<List<OrganizationMembershipRowDto>> listMembers(
            CurrentUser user,
            @PathVariable Long organizationId) {
        return ResponseEntity.ok(organizationManagementUseCase.listMembers(user.userId(), organizationId));
    }

    @PatchMapping("/{organizationId}/members/{membershipId}")
    public ResponseEntity<OrganizationMembershipDto> updateMemberRole(
            CurrentUser user,
            @PathVariable Long organizationId,
            @PathVariable Long membershipId,
            @Valid @RequestBody UpdateOrganizationMembershipRoleRequest request) {
        return ResponseEntity.ok(organizationManagementUseCase.updateMemberRole(
                user.userId(),
                organizationId,
                membershipId,
                request));
    }

    @DeleteMapping("/{organizationId}/members/{membershipId}")
    public ResponseEntity<Void> removeMember(
            CurrentUser user,
            @PathVariable Long organizationId,
            @PathVariable Long membershipId) {
        organizationManagementUseCase.removeMember(user.userId(), organizationId, membershipId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{organizationId}/transfer-ownership")
    public ResponseEntity<OrganizationMembershipDto> transferOwnership(
            CurrentUser user,
            @PathVariable Long organizationId,
            @Valid @RequestBody TransferOrganizationOwnershipRequest request) {
        return ResponseEntity.ok(organizationManagementUseCase.transferOwnership(
                user.userId(),
                organizationId,
                request));
    }
}
