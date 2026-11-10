package dev.ulloasp.mlsuite.organization.domain.model;

/** A member is active until removed; a removed member's row is kept so they can be invited again. */
public enum MembershipStatus {
    ACTIVE,
    REMOVED
}
