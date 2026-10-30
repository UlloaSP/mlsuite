package dev.ulloasp.mlsuite.plugin.domain.model;

public final class PluginStoragePaths {

    private PluginStoragePaths() {
    }

    public static String organizationItemsPrefix(String rootPrefix, Long organizationId) {
        return organizationPrefix(rootPrefix, organizationId) + "/items/";
    }

    public static String organizationItemObjectKey(String rootPrefix, Long organizationId, String id) {
        return organizationItemsPrefix(rootPrefix, organizationId) + id + ".json";
    }

    private static String organizationPrefix(String rootPrefix, Long organizationId) {
        return "organizations/" + organizationId + "/" + rootPrefix;
    }
}

