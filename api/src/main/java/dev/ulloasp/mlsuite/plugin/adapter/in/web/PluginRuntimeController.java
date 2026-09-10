package dev.ulloasp.mlsuite.plugin.adapter.in.web;

import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import dev.ulloasp.mlsuite.plugin.application.dto.PluginRuntimeSourceDto;
import dev.ulloasp.mlsuite.plugin.application.port.in.ListPluginRuntimeSourcesUseCase;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;

@RestController
public class PluginRuntimeController {
    private final ListPluginRuntimeSourcesUseCase runtime;
    private final CurrentUserResolver users;

    public PluginRuntimeController(ListPluginRuntimeSourcesUseCase runtime, CurrentUserResolver users) {
        this.runtime = runtime;
        this.users = users;
    }

    @GetMapping("/api/plugins/runtime")
    public List<PluginRuntimeSourceDto> list(Authentication authentication) {
        return runtime.list(users.resolve(authentication).userId());
    }
}
