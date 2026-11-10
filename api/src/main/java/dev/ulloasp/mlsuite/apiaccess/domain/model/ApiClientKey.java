package dev.ulloasp.mlsuite.apiaccess.domain.model;

import dev.ulloasp.mlsuite.principal.domain.model.Principal;
import java.time.OffsetDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * One secret of a client. Only its SHA-256 is kept, so the secret is shown once, when issued.
 * A key never expires; it is revoked by deleting it. A client may hold several, so a new key
 * can be put in place before the old one is revoked.
 */
@Entity
@Table(name = "api_client_key")
@Getter
@Setter
@NoArgsConstructor
public class ApiClientKey {

    public static final int NAME_MAX_LENGTH = 80;

    public ApiClientKey(ApiClient client, String name, String keyPrefix, String keyHash, Principal createdBy) {
        this.client = client;
        this.name = name;
        this.keyPrefix = keyPrefix;
        this.keyHash = keyHash;
        this.createdBy = createdBy;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "api_client_id", nullable = false, updatable = false,
            foreignKey = @ForeignKey(name = "fk_api_client_key_client"))
    private ApiClient client;

    @Column(name = "name", nullable = false, updatable = false, length = NAME_MAX_LENGTH)
    private String name;

    /** The secret's first characters, enough for a member to tell keys apart. */
    @Column(name = "key_prefix", nullable = false, updatable = false, length = 16)
    private String keyPrefix;

    @Column(name = "key_hash", nullable = false, updatable = false, unique = true, length = 64)
    private String keyHash;

    /** Who created it. */
    @ManyToOne(optional = false)
    @JoinColumn(name = "created_by_principal_id", nullable = false, updatable = false)
    private Principal createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;

    @Column(name = "last_used_at", columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime lastUsedAt;
}
