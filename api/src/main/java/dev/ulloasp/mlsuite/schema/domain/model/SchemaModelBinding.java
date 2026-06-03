package dev.ulloasp.mlsuite.schema.domain.model;

import java.time.OffsetDateTime;
import java.util.Map;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.signature.domain.model.Signature;
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
        @UniqueConstraint(name = "uq_schema_binding_model_signature", columnNames = {
                "schema_version_id", "model_id", "signature_id" })
})
@Getter
@Setter
@NoArgsConstructor
public class SchemaModelBinding {

    public SchemaModelBinding(SchemaVersion schemaVersion, Model model, Signature signature,
            Map<String, Object> inputMapping, Map<String, Object> outputMapping,
            Map<String, Object> pluginPolicy) {
        this.schemaVersion = schemaVersion;
        this.model = model;
        this.signature = signature;
        this.inputMapping = inputMapping;
        this.outputMapping = outputMapping;
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

    @ManyToOne(optional = false)
    @JoinColumn(name = "signature_id", nullable = false, foreignKey = @ForeignKey(name = "fk_schema_binding_signature"))
    private Signature signature;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "input_mapping_json", nullable = false)
    private Map<String, Object> inputMapping;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "output_mapping_json", nullable = false)
    private Map<String, Object> outputMapping;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "plugin_policy_json")
    private Map<String, Object> pluginPolicy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;
}
