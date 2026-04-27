package dev.ulloasp.mlsuite.rbac;

import java.util.List;

public final class RbacPermissions {

    public static final String ORGANIZATION_READ = "organization:read";
    public static final String ORGANIZATION_UPDATE = "organization:update";
    public static final String MEMBERS_READ = "members:read";
    public static final String MEMBERS_MANAGE = "members:manage";
    public static final String ROLES_READ = "roles:read";
    public static final String ROLES_MANAGE = "roles:manage";
    public static final String MODELS_READ = "models:read";
    public static final String MODELS_CREATE = "models:create";
    public static final String MODELS_DELETE = "models:delete";
    public static final String SIGNATURES_READ = "signatures:read";
    public static final String SIGNATURES_CREATE = "signatures:create";
    public static final String PREDICTIONS_READ = "predictions:read";
    public static final String PREDICTIONS_CREATE = "predictions:create";
    public static final String PREDICTIONS_UPDATE = "predictions:update";
    public static final String FEEDBACK_READ = "feedback:read";
    public static final String FEEDBACK_CREATE = "feedback:create";
    public static final String FEEDBACK_UPDATE = "feedback:update";
    public static final String PLUGINS_READ = "plugins:read";
    public static final String PLUGINS_MANAGE = "plugins:manage";

    public static final List<String> ALL = List.of(
            ORGANIZATION_READ,
            ORGANIZATION_UPDATE,
            MEMBERS_READ,
            MEMBERS_MANAGE,
            ROLES_READ,
            ROLES_MANAGE,
            MODELS_READ,
            MODELS_CREATE,
            MODELS_DELETE,
            SIGNATURES_READ,
            SIGNATURES_CREATE,
            PREDICTIONS_READ,
            PREDICTIONS_CREATE,
            PREDICTIONS_UPDATE,
            FEEDBACK_READ,
            FEEDBACK_CREATE,
            FEEDBACK_UPDATE,
            PLUGINS_READ,
            PLUGINS_MANAGE);

    private RbacPermissions() {
    }
}
