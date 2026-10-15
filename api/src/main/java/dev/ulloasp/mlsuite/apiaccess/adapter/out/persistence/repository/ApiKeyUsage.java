package dev.ulloasp.mlsuite.apiaccess.adapter.out.persistence.repository;

import java.time.OffsetDateTime;

/** How many keys a client holds and when one of them was last used. */
public record ApiKeyUsage(Long clientId, long keyCount, OffsetDateTime lastUsedAt) {
}
