package dev.ulloasp.mlsuite.schema.domain.model;

import dev.ulloasp.mlsuite.principal.domain.model.Principal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
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

    public SchemaBookmark(Schema schema, SchemaVersion version, String name, Principal createdBy) {
        this.schema = schema;
        this.createdBy = createdBy;
        this.updatedBy = createdBy;
        this.version = version;
        this.name = name;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Who created it. */
    @ManyToOne(optional = false)
    @JoinColumn(name = "created_by_principal_id", nullable = false, updatable = false)
    private Principal createdBy;

    /** Who changed it last. */
    @ManyToOne(optional = false)
    @JoinColumn(name = "updated_by_principal_id", nullable = false)
    private Principal updatedBy;

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

    /**
     * Opaque id of the bookmark outside the workspace, on its public page and in the client API;
     * assigned the first time it is published or given to an API client, and never reassigned.
     */
    @Column(name = "public_id", unique = true, length = 36)
    private String publicId;

    @OneToMany(mappedBy = "bookmark", cascade = CascadeType.REMOVE, orphanRemoval = true)
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    private List<ProfilePin> pins = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime updatedAt;

    /** Makes the bookmark private again; its public id is kept for a later publish. */
    public void unpublish() {
        this.visibility = BookmarkVisibility.PRIVATE;
        unpin();
    }

    /** Takes the bookmark off its owner's profile: a pin stands only while anyone may read it. */
    public void unpin() {
        pins.clear();
    }
}
