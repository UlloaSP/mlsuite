package dev.ulloasp.mlsuite.schema.domain.model;

import java.time.OffsetDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.hibernate.type.SqlTypes;

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
 * A secret issued on a bookmark for one outside consumer, named after them. Only the secret's
 * SHA-256 is kept, so the secret itself is shown once, when issued. A key never expires; it is
 * revoked by deleting it, and the database removes it with its bookmark.
 */
@Entity
@Table(name = "bookmark_api_key")
@Getter
@Setter
@NoArgsConstructor
public class BookmarkApiKey {

    public static final int NAME_MAX_LENGTH = 80;

    public BookmarkApiKey(SchemaBookmark bookmark, String name, String keyPrefix, String keyHash,
            String createdByName) {
        this.bookmark = bookmark;
        this.name = name;
        this.keyPrefix = keyPrefix;
        this.keyHash = keyHash;
        this.createdByName = createdByName;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "schema_bookmark_id", nullable = false, updatable = false,
            foreignKey = @ForeignKey(name = "fk_bookmark_api_key_bookmark"))
    private SchemaBookmark bookmark;

    @Column(name = "name", nullable = false, updatable = false, length = NAME_MAX_LENGTH)
    private String name;

    /** The secret's first characters, enough for a member to tell keys apart. */
    @Column(name = "key_prefix", nullable = false, updatable = false, length = 16)
    private String keyPrefix;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "key_hash", nullable = false, updatable = false, unique = true, length = 64)
    private String keyHash;

    // Identity snapshot: who issued the key, as they were named then.
    @Column(name = "created_by_name", updatable = false)
    private String createdByName;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;

    @Column(name = "last_used_at", columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime lastUsedAt;
}
