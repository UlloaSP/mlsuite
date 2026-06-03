package dev.ulloasp.mlsuite.schema.domain.model;

import java.time.OffsetDateTime;
import java.util.Map;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
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
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "schema_version", uniqueConstraints = {
        @UniqueConstraint(name = "uq_schema_version_schema_version", columnNames = { "schema_id", "version_number" })
})
@Getter
@Setter
@NoArgsConstructor
public class SchemaVersion {

    public SchemaVersion(Schema schema, int version, String name, Map<String, Object> formSchema) {
        this.schema = schema;
        this.version = version;
        this.name = name;
        this.formSchema = formSchema;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "schema_id", nullable = false, foreignKey = @ForeignKey(name = "fk_schema_version_schema"))
    private Schema schema;

    @Column(name = "version_number", nullable = false)
    private int version;

    @Column(name = "name", length = 180)
    private String name;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "form_schema_json", nullable = false)
    private Map<String, Object> formSchema;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;
}
