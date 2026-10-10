package dev.ulloasp.mlsuite.workspace.adapter.in.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.organization.application.dto.OrganizationDto;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;
import dev.ulloasp.mlsuite.workspace.application.dto.SelectOrganizationRequest;
import dev.ulloasp.mlsuite.workspace.application.dto.WorkspaceCurrentContextDto;
import dev.ulloasp.mlsuite.workspace.application.port.in.WorkspaceContextUseCase;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/workspace/context")
public class WorkspaceCatalogController {

    private final WorkspaceContextUseCase workspaceContextUseCase;

    @GetMapping("/current")
    public WorkspaceCurrentContextDto currentContext(CurrentUser user) {
        return workspaceContextUseCase.getCurrentContext(user.userId());
    }

    @PatchMapping("/current")
    public WorkspaceCurrentContextDto selectCurrentOrganization(CurrentUser user,
            @Valid @RequestBody SelectOrganizationRequest request) {
        return workspaceContextUseCase.selectCurrentOrganization(user.userId(), request);
    }

    @GetMapping("/organizations/catalog")
    public PageDto<OrganizationDto> organizationCatalog(CurrentUser user, @ModelAttribute CatalogRequest request) {
        return workspaceContextUseCase.organizations(user.userId(), request);
    }
}
