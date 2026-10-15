package dev.ulloasp.mlsuite.apiaccess.domain.model;

/** A client is active until the platform suspends it; only the platform reinstates it. */
public enum ApiClientStatus {
    ACTIVE,
    SUSPENDED
}
