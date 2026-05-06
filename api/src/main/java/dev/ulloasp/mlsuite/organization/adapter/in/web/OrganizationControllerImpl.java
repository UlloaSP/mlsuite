package dev.ulloasp.mlsuite.organization.adapter.in.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.organization.application.dto.CreateOrganizationRequest;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationAdminDashboardDto;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationDto;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationMembershipDto;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationMembershipRowDto;
import dev.ulloasp.mlsuite.organization.application.dto.TransferOrganizationOwnershipRequest;
import dev.ulloasp.mlsuite.organization.application.dto.UpdateOrganizationMembershipRoleRequest;
import dev.ulloasp.mlsuite.organization.application.dto.UpdateOrganizationRequest;
import dev.ulloasp.mlsuite.organization.application.port.in.OrganizationManagementUseCase;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;

@RestController
public class OrganizationControllerImpl implements OrganizationController {

    private final CurrentUserResolver currentUserResolver;
    private final OrganizationManagementUseCase organizationManagementUseCase;

    public OrganizationControllerImpl(
            CurrentUserResolver currentUserResolver,
            OrganizationManagementUseCase organizationManagementUseCase) {
        this.currentUserResolver = currentUserResolver;
        this.organizationManagementUseCase = organizationManagementUseCase;
    }

    @Override
    public ResponseEntity<List<OrganizationDto>> listOrganizations(Authentication authentication) {
        return ResponseEntity.ok(organizationManagementUseCase.listOrganizations(currentUserResolver.resolve(authentication).userId()));
    }

    @Override
    public ResponseEntity<OrganizationDto> createOrganization(Authentication authentication, CreateOrganizationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(organizationManagementUseCase.createOrganization(currentUserResolver.resolve(authentication).userId(), request));
    }

    @Override
    public ResponseEntity<OrganizationDto> getOrganization(Authentication authentication, Long organizationId) {
        return ResponseEntity.ok(organizationManagementUseCase.getOrganization(currentUserResolver.resolve(authentication).userId(), organizationId));
    }

    @Override
    public ResponseEntity<OrganizationAdminDashboardDto> getAdminDashboard(Authentication authentication, Long organizationId) {
        return ResponseEntity.ok(organizationManagementUseCase.getAdminDashboard(
                currentUserResolver.resolve(authentication).userId(),
                organizationId));
    }

    @Override
    public ResponseEntity<OrganizationDto> updateOrganization(
            Authentication authentication,
            Long organizationId,
            UpdateOrganizationRequest request) {
        return ResponseEntity.ok(organizationManagementUseCase.updateOrganization(
                currentUserResolver.resolve(authentication).userId(),
                organizationId,
                request));
    }

    @Override
    public ResponseEntity<Void> deleteOrganization(Authentication authentication, Long organizationId) {
        organizationManagementUseCase.deleteOrganization(currentUserResolver.resolve(authentication).userId(), organizationId);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<List<OrganizationMembershipRowDto>> listMembers(Authentication authentication, Long organizationId) {
        return ResponseEntity.ok(organizationManagementUseCase.listMembers(currentUserResolver.resolve(authentication).userId(), organizationId));
    }

    @Override
    public ResponseEntity<OrganizationMembershipDto> updateMemberRole(
            Authentication authentication,
            Long organizationId,
            Long membershipId,
            UpdateOrganizationMembershipRoleRequest request) {
        return ResponseEntity.ok(organizationManagementUseCase.updateMemberRole(
                currentUserResolver.resolve(authentication).userId(),
                organizationId,
                membershipId,
                request));
    }

    @Override
    public ResponseEntity<Void> removeMember(Authentication authentication, Long organizationId, Long membershipId) {
        organizationManagementUseCase.removeMember(currentUserResolver.resolve(authentication).userId(), organizationId, membershipId);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<OrganizationMembershipDto> transferOwnership(
            Authentication authentication,
            Long organizationId,
            TransferOrganizationOwnershipRequest request) {
        return ResponseEntity.ok(organizationManagementUseCase.transferOwnership(
                currentUserResolver.resolve(authentication).userId(),
                organizationId,
                request));
    }
}
