package dev.ulloasp.mlsuite.workspace.adapter.in.web;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.workspace.application.dto.SelectOrganizationRequest;
import dev.ulloasp.mlsuite.workspace.application.dto.WorkspaceContextDto;
import dev.ulloasp.mlsuite.workspace.application.port.in.WorkspaceContextUseCase;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import jakarta.validation.Valid;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/workspace/context")
public class WorkspaceController {

    private final WorkspaceContextUseCase workspaceContextUseCase;

    @GetMapping
    public ResponseEntity<WorkspaceContextDto> getContext(CurrentUser user) {
        return ResponseEntity.ok(workspaceContextUseCase.getContext(user.userId()));
    }

    @PatchMapping
    public ResponseEntity<WorkspaceContextDto> selectOrganization(
            CurrentUser user,
            @Valid @RequestBody SelectOrganizationRequest request) {
        return ResponseEntity.ok(workspaceContextUseCase.selectOrganization(
                user.userId(),
                request));
    }
}
