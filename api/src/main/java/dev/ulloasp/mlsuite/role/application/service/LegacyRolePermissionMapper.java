package dev.ulloasp.mlsuite.role.application.service;

import java.util.EnumSet;
import java.util.Set;

import org.springframework.stereotype.Component;

import dev.ulloasp.mlsuite.organization.domain.model.OrganizationRole;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;

@Component
public class LegacyRolePermissionMapper {

    public Set<PermissionKey> organization(OrganizationRole role) {
        return switch (role) {
            case OWNER -> all();
            case ADMIN -> without(PermissionKey.DELETE_ORGANIZATION, PermissionKey.TRANSFER_OWNERSHIP);
            case MEMBER -> EnumSet.of(
                    PermissionKey.VIEW_WORKSPACE,
                    PermissionKey.VIEW_ORGANIZATION,
                    PermissionKey.VIEW_MODELS,
                    PermissionKey.CREATE_MODELS,
                    PermissionKey.EDIT_MODELS,
                    PermissionKey.DELETE_MODELS,
                    PermissionKey.RUN_PREDICTIONS,
                    PermissionKey.VIEW_PLUGINS);
            case VIEWER -> EnumSet.of(
                    PermissionKey.VIEW_WORKSPACE,
                    PermissionKey.VIEW_ORGANIZATION,
                    PermissionKey.VIEW_MODELS,
                    PermissionKey.VIEW_PLUGINS);
        };
    }

    public Set<PermissionKey> all() {
        return EnumSet.allOf(PermissionKey.class);
    }

    public Set<PermissionKey> without(PermissionKey... excluded) {
        Set<PermissionKey> values = all();
        for (PermissionKey key : excluded) {
            values.remove(key);
        }
        return values;
    }
}
