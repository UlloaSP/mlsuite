package dev.ulloasp.mlsuite.workspace.adapter.in.web;

import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import dev.ulloasp.mlsuite.workspace.application.dto.SelectOrganizationRequest;
import dev.ulloasp.mlsuite.workspace.application.dto.WorkspaceContextDto;
import dev.ulloasp.mlsuite.workspace.application.port.in.WorkspaceContextUseCase;

@RestController
public class WorkspaceControllerImpl implements WorkspaceController {

    private final CurrentUserResolver currentUserResolver;
    private final WorkspaceContextUseCase workspaceContextUseCase;

    public WorkspaceControllerImpl(CurrentUserResolver currentUserResolver, WorkspaceContextUseCase workspaceContextUseCase) {
        this.currentUserResolver = currentUserResolver;
        this.workspaceContextUseCase = workspaceContextUseCase;
    }

    @Override
    public ResponseEntity<WorkspaceContextDto> getContext(OAuth2AuthenticationToken authentication) {
        return ResponseEntity.ok(workspaceContextUseCase.getContext(currentUserResolver.resolve(authentication).userId()));
    }

    @Override
    public ResponseEntity<WorkspaceContextDto> selectOrganization(
            OAuth2AuthenticationToken authentication,
            SelectOrganizationRequest request) {
        return ResponseEntity.ok(workspaceContextUseCase.selectOrganization(
                currentUserResolver.resolve(authentication).userId(),
                request));
    }
}
