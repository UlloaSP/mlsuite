package dev.ulloasp.mlsuite.plugin.application.service;

import dev.ulloasp.mlsuite.plugin.application.port.in.ActivatePluginUseCase;
import dev.ulloasp.mlsuite.plugin.application.port.in.DeactivateAllPluginsUseCase;
import dev.ulloasp.mlsuite.plugin.application.port.in.DeactivatePluginUseCase;
import dev.ulloasp.mlsuite.plugin.application.port.in.DeletePluginUseCase;
import dev.ulloasp.mlsuite.plugin.application.port.in.ListActivePluginsUseCase;
import dev.ulloasp.mlsuite.plugin.application.port.in.ListPluginsUseCase;
import dev.ulloasp.mlsuite.plugin.application.port.in.UploadPluginUseCase;

public interface PluginService extends UploadPluginUseCase, ListPluginsUseCase, ListActivePluginsUseCase,
        ActivatePluginUseCase, DeactivatePluginUseCase, DeactivateAllPluginsUseCase, DeletePluginUseCase {
}

