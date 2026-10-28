package dev.ulloasp.mlsuite.model.domain.model;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * The environment models run in: a Python version and exact distributions, as a bundle's lock
 * names them, plus the mlbundle release that wrote the bundle. Models that need the same files
 * share it. A row is never changed or removed, so every stored result keeps saying what computed
 * it; {@link #LEGACY} is the frozen environment of bundles written before locks.
 */
@Entity
@Table(name = "runtime_environment")
@Getter
@NoArgsConstructor
public class RuntimeEnvironment {

    public static final String LEGACY = "legacy";

    @Id
    @Column(name = "environment_key", length = 64)
    private String key;

    @Column(name = "environment_id", length = 64)
    private String environmentId;

    @Column(name = "writer_version", nullable = false, length = 64)
    private String writerVersion;

    @Column(name = "python_version", nullable = false, length = 32)
    private String pythonVersion;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "packages", nullable = false)
    private List<Map<String, Object>> packages;

    @Column(name = "lock_toml")
    private String lockToml;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;

    public RuntimeEnvironment(String key, String environmentId, String writerVersion, String pythonVersion,
            List<Map<String, Object>> packages, String lockToml) {
        this.key = key;
        this.environmentId = environmentId;
        this.writerVersion = writerVersion;
        this.pythonVersion = pythonVersion;
        this.packages = packages;
        this.lockToml = lockToml;
    }

    public boolean isLegacy() {
        return LEGACY.equals(key);
    }
}
