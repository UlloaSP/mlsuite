package dev.ulloasp.mlsuite.invitation.domain.model;

/**
 * Where an invitation stands. EXPIRED is never stored: a PENDING invitation is expired once its
 * {@code expires_at} has passed (see {@link Invitation#statusAt}).
 */
public enum InvitationStatus {
    PENDING,
    ACCEPTED,
    EXPIRED,
    REVOKED,
    DECLINED
}
