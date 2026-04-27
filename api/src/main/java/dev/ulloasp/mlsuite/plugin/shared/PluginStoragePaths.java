package dev.ulloasp.mlsuite.plugin.shared;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

import dev.ulloasp.mlsuite.user.entity.User;

public final class PluginStoragePaths {

    private PluginStoragePaths() {
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

    public static String itemsPrefix(String rootPrefix, Long userId) {
        return userPrefix(rootPrefix, userId) + "/items/";
    }

    public static String itemObjectKey(String rootPrefix, Long userId, String id) {
        return itemsPrefix(rootPrefix, userId) + id + ".json";
    }

    public static String stateObjectKey(String rootPrefix, Long userId, String stateFile) {
        return userPrefix(rootPrefix, userId) + "/" + stateFile;
    }

    public static String legacyActiveObjectKey(String rootPrefix, User user, String activeFile) {
        return legacyUserPrefix(rootPrefix, user) + "/" + activeFile;
    }

    public static String legacyItemsPrefix(String rootPrefix, User user) {
        return legacyUserPrefix(rootPrefix, user) + "/items/";
    }

    public static String legacyItemObjectKey(String rootPrefix, User user, String id) {
        return legacyItemsPrefix(rootPrefix, user) + id + ".json";
    }

    private static String userPrefix(String rootPrefix, Long userId) {
        return "users/" + userId + "/" + rootPrefix;
    }

    private static String organizationPrefix(String rootPrefix, Long organizationId) {
        return "orgs/" + organizationId + "/" + rootPrefix;
    }

    private static String legacyUserPrefix(String rootPrefix, User user) {
        return rootPrefix + "/"
                + user.getOauthProvider().name().toLowerCase()
                + "/"
                + URLEncoder.encode(user.getOauthId(), StandardCharsets.UTF_8);
    }
}
