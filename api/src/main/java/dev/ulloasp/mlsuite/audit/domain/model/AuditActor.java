package dev.ulloasp.mlsuite.audit.domain.model;

import jakarta.annotation.Nullable;

/**
 * Who an entry says acted. {@code label} is the name kept with the entry; a user's is read from
 * their account by the insert that writes it, so it is left null here.
 */
public record AuditActor(AuditActorKind kind, @Nullable Long userId, @Nullable String label) {

    public static final AuditActor SYSTEM = new AuditActor(AuditActorKind.SYSTEM, null, "System");
    public static final AuditActor VISITOR = new AuditActor(AuditActorKind.VISITOR, null, "Public visitor");

    public static AuditActor user(Long userId) {
        return new AuditActor(AuditActorKind.USER, userId, null);
    }

    public static AuditActor apiClient(String clientName) {
        return new AuditActor(AuditActorKind.API_CLIENT, null, clientName);
    }

    /** Someone who gave no valid identity, known only by what they typed. */
    public static AuditActor unidentified(String attempted) {
        return new AuditActor(AuditActorKind.VISITOR, null, attempted);
    }
}
