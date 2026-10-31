package dev.ulloasp.mlsuite.audit.domain.model;

/** Who acted: a person with an account, the platform itself, a client key or an anonymous browser. */
public enum AuditActorKind {
    USER, SYSTEM, API_CLIENT, VISITOR
}
