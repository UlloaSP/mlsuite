package dev.ulloasp.mlsuite.plugin.domain.model;

public final class PluginStoragePaths {

    private PluginStoragePaths() {
    }

    public static String itemsPrefix(String rootPrefix, Long userId) {
        return userPrefix(rootPrefix, userId) + "/items/";
    }

    public static String itemObjectKey(String rootPrefix, Long userId, String id) {
        return itemsPrefix(rootPrefix, userId) + id + ".json";
    }

    public static String stateObjectKey(String rootPrefix, Long userId, String stateFile) {
        return userPrefix(rootPrefix, userId) + "/" + stateFile;
    }

    public static String organizationItemsPrefix(String rootPrefix, Long organizationId) {
        return organizationPrefix(rootPrefix, organizationId) + "/items/";
    }

    public static String organizationItemObjectKey(String rootPrefix, Long organizationId, String id) {
        return organizationItemsPrefix(rootPrefix, organizationId) + id + ".json";
    }

    public static String organizationStateObjectKey(String rootPrefix, Long organizationId, String stateFile) {
        return organizationPrefix(rootPrefix, organizationId) + "/" + stateFile;
    }

    private static String userPrefix(String rootPrefix, Long userId) {
        return "users/" + userId + "/" + rootPrefix;
    }

    private static String organizationPrefix(String rootPrefix, Long organizationId) {
        return "organizations/" + organizationId + "/" + rootPrefix;
    }
}

