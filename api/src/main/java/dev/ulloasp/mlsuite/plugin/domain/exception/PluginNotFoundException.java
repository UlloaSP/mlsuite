package dev.ulloasp.mlsuite.plugin.domain.exception;

public class PluginNotFoundException extends RuntimeException {

    public PluginNotFoundException(String id) {
        super("Plugin with ID '" + id + "' does not exist.");
    }
}

