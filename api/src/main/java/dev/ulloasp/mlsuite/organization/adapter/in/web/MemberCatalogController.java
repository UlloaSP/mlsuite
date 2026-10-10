package dev.ulloasp.mlsuite.organization.adapter.in.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.organization.application.dto.MemberCatalogDto;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationMembershipRowDto;
import dev.ulloasp.mlsuite.organization.application.usecase.MemberCatalogService;
import dev.ulloasp.mlsuite.role.application.dto.RoleSummaryDto;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class MemberCatalogController {
    private final MemberCatalogService members;

    @GetMapping("/api/organizations/{organizationId}/members/roles/catalog")
    public PageDto<RoleSummaryDto> memberFilterRoleCatalog(CurrentUser user, @PathVariable Long organizationId,
            @ModelAttribute CatalogRequest request) {
        return members.filterRoles(user.userId(), organizationId, request);
    }

    @GetMapping("/api/organizations/{organizationId}/members/catalog")
    public MemberCatalogDto memberCatalog(CurrentUser user, @PathVariable Long organizationId,
            @ModelAttribute CatalogRequest request) {
        return members.list(user.userId(), organizationId, request);
    }

    @GetMapping("/api/organizations/{organizationId}/owner-candidates/catalog")
    public PageDto<OrganizationMembershipRowDto> ownerCandidateCatalog(CurrentUser user,
            @PathVariable Long organizationId, @ModelAttribute CatalogRequest request) {
        return members.ownerCandidates(user.userId(), organizationId, request);
    }

    @GetMapping("/api/organizations/{organizationId}/members/{membershipId}/roles/catalog")
    public PageDto<RoleSummaryDto> assignableRoleCatalog(CurrentUser user, @PathVariable Long organizationId,
            @PathVariable Long membershipId, @ModelAttribute CatalogRequest request) {
        return members.assignableRoles(user.userId(), organizationId, membershipId, request);
    }
}
