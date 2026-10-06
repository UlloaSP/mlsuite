package dev.ulloasp.mlsuite.schema.domain.model;

import java.time.OffsetDateTime;
import java.util.UUID;

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
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A run a member marked as a public example of a bookmark. It holds no inputs of its own: the run
 * is the source of truth. The database removes the row with its run or its bookmark.
 */
@Entity
@Table(name = "schema_bookmark_example", uniqueConstraints = {
        @UniqueConstraint(name = "uq_schema_bookmark_example_bookmark_run",
                columnNames = { "schema_bookmark_id", "prediction_run_id" })
})
@Getter
@Setter
@NoArgsConstructor
public class SchemaBookmarkExample {

    public SchemaBookmarkExample(SchemaBookmark bookmark, PredictionRun run) {
        this.bookmark = bookmark;
        this.run = run;
        this.publicId = UUID.randomUUID().toString();
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "schema_bookmark_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_schema_bookmark_example_bookmark"))
    private SchemaBookmark bookmark;

    @ManyToOne(optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "prediction_run_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_schema_bookmark_example_run"))
    private PredictionRun run;

    /** Names the example on the public page, so the run's numeric id never leaves the workspace. */
    @Column(name = "public_id", nullable = false, unique = true, updatable = false, length = 36)
    private String publicId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;

    /**
     * The one rule that ties an example to its bookmark: the run executed on the snapshot the
     * bookmark pins now. Moving the bookmark turns its examples stale without touching them, and
     * moving it back restores them.
     */
    public boolean isOnPinnedSnapshot() {
        return run.getSchemaVersion().getId().equals(bookmark.getVersion().getId());
    }

    public BookmarkExampleStatus status() {
        if (!isOnPinnedSnapshot()) return BookmarkExampleStatus.BOOKMARK_MOVED;
        return bookmark.getVisibility() == BookmarkVisibility.PUBLIC
                ? BookmarkExampleStatus.SERVED
                : BookmarkExampleStatus.BOOKMARK_PRIVATE;
    }
}
