package dev.ulloasp.mlsuite.plugin.adapter.in.web;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import dev.ulloasp.mlsuite.plugin.application.dto.PluginRuntimeSourceDto;
import dev.ulloasp.mlsuite.plugin.application.port.in.ListPluginRuntimeSourcesUseCase;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class PluginRuntimeController {
    private final ListPluginRuntimeSourcesUseCase runtime;

    @GetMapping("/api/plugins/runtime")
    public List<PluginRuntimeSourceDto> list(CurrentUser user) {
        return runtime.list(user.userId());
    }
}
