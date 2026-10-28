package dev.ulloasp.mlsuite.model.application.runtime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import dev.ulloasp.mlsuite.model.adapter.out.analyzer.RuntimeBuilderClient;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.RuntimeEnvironmentRepository;
import dev.ulloasp.mlsuite.model.application.upload.BundleInspection;
import dev.ulloasp.mlsuite.model.domain.model.ModelRuntimeState;
import dev.ulloasp.mlsuite.model.domain.model.RuntimeEnvironment;
import lombok.RequiredArgsConstructor;

/**
 * The environments models run in: recorded when a bundle that needs one is uploaded, and removed
 * from the builder once no model uses them. The record itself stays, so stored results keep
 * saying what computed them.
 */
@Component
@RequiredArgsConstructor
public class RuntimeEnvironments {

    private static final Logger log = LoggerFactory.getLogger(RuntimeEnvironments.class);

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;
    private final ModelRepository models;
    private final RuntimeEnvironmentRepository environments;
    private final RuntimeBuilderClient builder;

    public RuntimeEnvironment find(String environmentKey) {
        return environments.findById(environmentKey)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Environment not found"));
    }

    /** Records the environment unless it is known (two uploads may need it at once); returns its key. */
    public String register(BundleInspection.Environment environment) {
        if (RuntimeEnvironment.LEGACY.equals(environment.key())) return RuntimeEnvironment.LEGACY;
        jdbc.update("""
                INSERT INTO runtime_environment (environment_key, environment_id, writer_version, python_version,
                    packages, lock_toml, created_at)
                VALUES (?, ?, ?, ?, ?::jsonb, ?, now())
                ON CONFLICT (environment_key) DO NOTHING""",
                environment.key(), environment.environmentId(), environment.writerVersion(),
                environment.pythonVersion(), json(environment), environment.lock());
        return environment.key();
    }

    /** A model of the legacy environment runs at once; any other once its environment is prepared. */
    public static ModelRuntimeState initialState(String environmentKey) {
        return RuntimeEnvironment.LEGACY.equals(environmentKey) ? ModelRuntimeState.READY : ModelRuntimeState.PREPARING;
    }

    /**
     * Once the deleting transaction commits, asks the builder to remove the environment if no
     * model uses it any longer, archived ones included. A failure only leaves the files in place.
     */
    public void releaseWhenUnused(String environmentKey) {
        if (RuntimeEnvironment.LEGACY.equals(environmentKey)) return;
        Runnable release = () -> {
            try {
                if (!models.existsByEnvironmentKey(environmentKey)) builder.remove(environmentKey);
            } catch (RuntimeException ex) {
                log.warn("Environment {} could not be removed from the builder: {}", environmentKey, ex.getMessage());
            }
        };
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            release.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                release.run();
            }
        });
    }

    private String json(BundleInspection.Environment environment) {
        try {
            return objectMapper.writeValueAsString(environment.packages());
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Environment packages are not serializable", ex);
        }
    }
}
