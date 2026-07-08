package dev.ulloasp.mlsuite.schema.domain.model;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import dev.ulloasp.mlsuite.user.domain.model.User;
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
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "schema_draft")
@Getter
@Setter
@NoArgsConstructor
public class SchemaDraft {

    public SchemaDraft(Schema schema, SchemaVersion baseVersion, String name,
            Map<String, Object> formSchema, List<Map<String, Object>> bindings) {
        this.schema = schema;
        this.baseVersion = baseVersion;
        this.name = name;
        this.formSchema = formSchema;
        this.bindings = bindings;
        this.status = SchemaDraftStatus.DRAFT;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "schema_id", nullable = false, foreignKey = @ForeignKey(name = "fk_schema_draft_schema"))
    private Schema schema;

    @ManyToOne(optional = false)
    @JoinColumn(name = "base_version_id", nullable = false, foreignKey = @ForeignKey(name = "fk_schema_draft_base"))
    private SchemaVersion baseVersion;

    @Column(name = "name", nullable = false, length = 180)
    private String name;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "form_schema_json", nullable = false)
    private Map<String, Object> formSchema;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "bindings_json", nullable = false)
    private List<Map<String, Object>> bindings;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private SchemaDraftStatus status;

    @ManyToOne
    @JoinColumn(name = "updated_by", foreignKey = @ForeignKey(name = "fk_schema_draft_updated_by"))
    private User updatedBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime updatedAt;
}
