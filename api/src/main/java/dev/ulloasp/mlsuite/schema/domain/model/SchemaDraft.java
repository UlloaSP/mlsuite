package dev.ulloasp.mlsuite.schema.domain.model;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;

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
        this.formSchema = copyMap(formSchema);
        this.bindings = copyBindings(bindings);
        this.baseBindings = copyBindings(bindings);
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

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "base_bindings_json")
    private List<Map<String, Object>> baseBindings;

    @ManyToOne
    @JoinColumn(name = "published_version_id", foreignKey = @ForeignKey(name = "fk_schema_draft_published"))
    private SchemaVersion publishedVersion;

    @Column(name = "revision")
    private Long revision = 0L;

    public long currentRevision() {
        return revision == null ? 0L : revision;
    }

    public void advanceRevision() {
        revision = currentRevision() + 1;
    }

    public void setFormSchema(Map<String, Object> formSchema) {
        this.formSchema = copyMap(formSchema);
    }

    public void setBindings(List<Map<String, Object>> bindings) {
        this.bindings = copyBindings(bindings);
    }

    public void setBaseBindings(List<Map<String, Object>> bindings) {
        this.baseBindings = bindings == null ? null : copyBindings(bindings);
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
