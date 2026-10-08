package dev.ulloasp.mlsuite.schema.domain.model;

import java.time.OffsetDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "schema_bookmark", uniqueConstraints = {
        @UniqueConstraint(name = "uq_schema_bookmark_schema_name", columnNames = { "schema_id", "name" })
})
@Getter
@Setter
@NoArgsConstructor
public class SchemaBookmark {

    public static final int NAME_MAX_LENGTH = 180;
    public static final int DESCRIPTION_MAX_LENGTH = 800;
    public static final int PUBLICATION_NOTE_MAX_LENGTH = 1000;

    public SchemaBookmark(Schema schema, SchemaVersion version, String name) {
        this.schema = schema;
        this.version = version;
        this.name = name;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "schema_id", nullable = false, foreignKey = @ForeignKey(name = "fk_schema_bookmark_schema"))
    private Schema schema;

    @ManyToOne(optional = false)
    @JoinColumn(name = "schema_version_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_schema_bookmark_version"))
    private SchemaVersion version;

    @Column(name = "name", nullable = false, length = NAME_MAX_LENGTH)
    private String name;

    /** The bookmark's own text, shown with it in the workspace and on its public page. */
    @Column(name = "description", length = DESCRIPTION_MAX_LENGTH)
    private String description;

    /** A note for the public page: the paper it was published in, a DOI, terms of use. */
    @Column(name = "publication_note", length = PUBLICATION_NOTE_MAX_LENGTH)
    private String publicationNote;

    @Enumerated(EnumType.STRING)
    @Column(name = "visibility", nullable = false, length = 16)
    private BookmarkVisibility visibility = BookmarkVisibility.PRIVATE;

    /** Opaque id of the public page; assigned on the first publish and never reassigned. */
    @Column(name = "public_id", unique = true, length = 36)
    private String publicId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime updatedAt;

    /** Makes the bookmark private again; its public id is kept for a later publish. */
    public void unpublish() {
        this.visibility = BookmarkVisibility.PRIVATE;
    }
}
