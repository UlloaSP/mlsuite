package dev.ulloasp.mlsuite.plugin.exceptions;

public class PluginNotFoundException extends RuntimeException {

    public PluginNotFoundException(String id) {
        super("Plugin with ID '" + id + "' does not exist.");
    }
}
