package dev.ulloasp.mlsuite.schema.domain.model;

import java.time.OffsetDateTime;
import java.util.Map;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import dev.ulloasp.mlsuite.model.domain.model.Model;
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
@Table(name = "schema_model_binding", uniqueConstraints = {
        @UniqueConstraint(name = "uq_schema_binding_model", columnNames = { "schema_version_id", "model_id" })
})
@Getter
@Setter
@NoArgsConstructor
public class SchemaModelBinding {

    public SchemaModelBinding(SchemaVersion schemaVersion, Model model, Map<String, Object> pluginPolicy) {
        this.schemaVersion = schemaVersion;
        this.model = model;
        this.pluginPolicy = pluginPolicy;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "schema_version_id", nullable = false, foreignKey = @ForeignKey(name = "fk_schema_binding_version"))
    private SchemaVersion schemaVersion;

    @ManyToOne(optional = false)
    @JoinColumn(name = "model_id", nullable = false, foreignKey = @ForeignKey(name = "fk_schema_binding_model"))
    private Model model;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "plugin_policy_json")
    private Map<String, Object> pluginPolicy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;
}
