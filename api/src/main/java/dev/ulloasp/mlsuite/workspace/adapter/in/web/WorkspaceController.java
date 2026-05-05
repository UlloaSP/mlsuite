package dev.ulloasp.mlsuite.workspace.adapter.in.web;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;

import dev.ulloasp.mlsuite.workspace.application.dto.SelectOrganizationRequest;
import dev.ulloasp.mlsuite.workspace.application.dto.WorkspaceContextDto;
import jakarta.validation.Valid;

@RequestMapping("/api/workspace/context")
public interface WorkspaceController {

    @GetMapping
    ResponseEntity<WorkspaceContextDto> getContext(Authentication authentication);

    @PatchMapping
    ResponseEntity<WorkspaceContextDto> selectOrganization(
            Authentication authentication,
            @Valid @RequestBody SelectOrganizationRequest request);
}
