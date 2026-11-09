package dev.ulloasp.mlsuite.schema.domain.model;

import jakarta.persistence.PrePersist;
import dev.ulloasp.mlsuite.principal.domain.model.Principal;
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

    public SchemaVersion(Schema schema, int version, String name, Map<String, Object> formSchema,
            Principal createdBy) {
        this.schema = schema;
        this.createdBy = createdBy;
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

    /** Who created it. */
    @ManyToOne(optional = false)
    @JoinColumn(name = "created_by_principal_id", nullable = false, updatable = false)
    private Principal createdBy;

    @Column(name = "name", length = 180)
    private String name;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "form_schema", nullable = false)
    private Map<String, Object> formSchema;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;

    /** Carried from its parent for the composite foreign key that keeps it there. */
    @Column(name = "organization_id", nullable = false, updatable = false)
    private Long organizationId;

    @PrePersist
    void carryParentKeys() {
        organizationId = schema.getOrganization().getId();
    }
}
