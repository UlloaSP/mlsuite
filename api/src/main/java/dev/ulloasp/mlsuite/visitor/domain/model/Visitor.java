package dev.ulloasp.mlsuite.visitor.domain.model;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Someone who ran a public bookmark without an account. The id is random, issued by the API
 * in a browser cookie on their first run, and is all that is known of them: no address, no
 * name. Their runs and feedback stay theirs across visits for as long as the browser keeps
 * the cookie, and stay in the organization's records for good either way.
 */
@Entity
@Table(name = "visitor")
@Getter
@Setter
@NoArgsConstructor
public class Visitor {

    public Visitor(UUID id, OffsetDateTime now) {
        this.id = id;
        this.createdAt = now;
        this.lastSeenAt = now;
    }

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "created_at", nullable = false, updatable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;

    @Column(name = "last_seen_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime lastSeenAt;
}
