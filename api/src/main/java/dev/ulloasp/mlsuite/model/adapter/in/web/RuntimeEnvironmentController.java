package dev.ulloasp.mlsuite.model.adapter.in.web;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.model.application.dto.RuntimeEnvironmentDto;
import dev.ulloasp.mlsuite.model.application.runtime.RuntimeEnvironments;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import lombok.RequiredArgsConstructor;

/**
 * What an environment holds, by the key a model or a stored result names. It lists public
 * package versions only, the same for every organization whose models share it.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/runtime-environments")
public class RuntimeEnvironmentController {

    private final RuntimeEnvironments environments;

    @GetMapping("/{environmentKey}")
    public ResponseEntity<RuntimeEnvironmentDto> get(CurrentUser user, @PathVariable String environmentKey) {
        return ResponseEntity.ok(RuntimeEnvironmentDto.toDto(environments.find(environmentKey)));
    }
}
