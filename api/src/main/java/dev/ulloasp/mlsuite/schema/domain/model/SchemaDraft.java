package dev.ulloasp.mlsuite.schema.domain.model;

import dev.ulloasp.mlsuite.principal.domain.model.Principal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

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
            Map<String, Object> formSchema, List<Map<String, Object>> bindings, Principal createdBy) {
        this.schema = schema;
        this.createdBy = createdBy;
        this.updatedBy = createdBy;
        this.baseVersion = baseVersion;
        this.name = name;
        this.formSchema = copyMap(formSchema);
        this.bindings = copyBindings(bindings);
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
    @Column(name = "form_schema", nullable = false)
    private Map<String, Object> formSchema;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "bindings", nullable = false)
    private List<Map<String, Object>> bindings;

    @ManyToOne
    @JoinColumn(name = "published_version_id", foreignKey = @ForeignKey(name = "fk_schema_draft_published"))
    private SchemaVersion publishedVersion;

    @Column(name = "lock_version", nullable = false)
    private long revision;

    public long currentRevision() {
        return revision;
    }

    public void advanceRevision() {
        revision++;
    }

    public void setFormSchema(Map<String, Object> formSchema) {
        this.formSchema = copyMap(formSchema);
    }

    public void setBindings(List<Map<String, Object>> bindings) {
        this.bindings = copyBindings(bindings);
    }

    private static List<Map<String, Object>> copyBindings(List<Map<String, Object>> bindings) {
        return bindings.stream().map(SchemaDraft::copyMap).toList();
    }

    private static Map<String, Object> copyMap(Map<?, ?> source) {
        Map<String, Object> copy = new LinkedHashMap<>();
        source.forEach((key, value) -> copy.put(String.valueOf(key), copyValue(value)));
        return copy;
    }

    private static Object copyValue(Object value) {
        if (value instanceof Map<?, ?> map) return copyMap(map);
        if (value instanceof List<?> list) return list.stream().map(SchemaDraft::copyValue).toList();
        return value;
    }

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private SchemaDraftStatus status;

    /** Who created it. */
    @ManyToOne(optional = false)
    @JoinColumn(name = "created_by_principal_id", nullable = false, updatable = false)
    private Principal createdBy;

    /** Who changed it last. */
    @ManyToOne(optional = false)
    @JoinColumn(name = "updated_by_principal_id", nullable = false)
    private Principal updatedBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime updatedAt;
}
