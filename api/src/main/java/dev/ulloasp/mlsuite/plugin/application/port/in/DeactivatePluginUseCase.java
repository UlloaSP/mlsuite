package dev.ulloasp.mlsuite.plugin.application.port.in;

public interface DeactivatePluginUseCase {

    void deactivate(Long userId, String id);
}
