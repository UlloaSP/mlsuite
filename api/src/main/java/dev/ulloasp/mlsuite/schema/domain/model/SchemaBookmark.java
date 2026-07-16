package dev.ulloasp.mlsuite.schema.domain.model;

import java.time.OffsetDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

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

@Entity
@Table(name = "schema_bookmark", uniqueConstraints = {
        @UniqueConstraint(name = "uq_schema_bookmark_schema_name", columnNames = { "schema_id", "name" })
})
@Getter
@Setter
@NoArgsConstructor
public class SchemaBookmark {

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

    @Column(name = "name", nullable = false, length = 180)
    private String name;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime updatedAt;
}
