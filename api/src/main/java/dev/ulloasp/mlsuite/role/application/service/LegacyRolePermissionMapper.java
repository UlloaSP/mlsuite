package dev.ulloasp.mlsuite.role.application.service;

import java.util.EnumSet;
import java.util.Set;

import org.springframework.stereotype.Component;

import dev.ulloasp.mlsuite.organization.domain.model.OrganizationRole;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.team.domain.model.TeamRole;

@Component
public class LegacyRolePermissionMapper {

    public Set<PermissionKey> organization(OrganizationRole role) {
        return switch (role) {
            case OWNER -> all();
            case ADMIN -> without(PermissionKey.DELETE_ORGANIZATION, PermissionKey.TRANSFER_OWNERSHIP);
            case MEMBER -> EnumSet.of(
                    PermissionKey.VIEW_WORKSPACE,
                    PermissionKey.VIEW_ORGANIZATION,
                    PermissionKey.VIEW_TEAMS,
                    PermissionKey.VIEW_MODELS,
                    PermissionKey.CREATE_MODELS,
                    PermissionKey.EDIT_MODELS,
                    PermissionKey.DELETE_MODELS,
                    PermissionKey.RUN_PREDICTIONS,
                    PermissionKey.VIEW_PLUGINS);
            case VIEWER -> EnumSet.of(
                    PermissionKey.VIEW_WORKSPACE,
                    PermissionKey.VIEW_ORGANIZATION,
                    PermissionKey.VIEW_TEAMS,
                    PermissionKey.VIEW_MODELS,
                    PermissionKey.VIEW_PLUGINS);
        };
    }

    public Set<PermissionKey> team(TeamRole role) {
        return switch (role) {
            case TEAM_ADMIN -> EnumSet.of(
                    PermissionKey.VIEW_TEAMS,
                    PermissionKey.EDIT_TEAMS,
                    PermissionKey.VIEW_MEMBERS,
                    PermissionKey.MANAGE_MEMBER_ROLES,
                    PermissionKey.REMOVE_MEMBERS);
            case TEAM_MEMBER, TEAM_VIEWER -> EnumSet.of(PermissionKey.VIEW_TEAMS);
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
