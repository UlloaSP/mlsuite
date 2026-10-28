package dev.ulloasp.mlsuite.model.application.runtime;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import dev.ulloasp.mlsuite.model.adapter.out.analyzer.ModelRuntimeClient;
import dev.ulloasp.mlsuite.model.adapter.out.analyzer.RuntimeBuilderClient;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.RuntimeEnvironmentRepository;
import dev.ulloasp.mlsuite.model.domain.exception.AnalyzerServiceException;
import dev.ulloasp.mlsuite.model.domain.model.RuntimeEnvironment;

/**
 * Prepares uploaded models on the server: the builder installs the environment the model's lock
 * names (once for every model that needs it), then the runtime loads the model there, proves the
 * environment matches the lock and predicts the bundle's samples. The model is then READY, with
 * the feature importances read from it. What the bundle itself causes (an environment the
 * allowlist refuses, a model that cannot load or predict) fails the model with the reason at
 * once; anything else (the builder or index unreachable, a download failing) is tried again
 * after a delay that doubles, up to the configured attempts.
 */
@Component
class ModelPreparationWorker {

    private static final Logger log = LoggerFactory.getLogger(ModelPreparationWorker.class);
    private static final long FIRST_DELAY_SECONDS = 30;
    private static final long MAX_DELAY_SECONDS = 1800;

    private final String worker = "api-" + UUID.randomUUID();
    private final ModelPreparationLedger ledger;
    private final ModelRepository models;
    private final RuntimeEnvironmentRepository environments;
    private final RuntimeBuilderClient builder;
    private final ModelRuntimeClient runtime;
    private final int leaseSeconds;
    private final int maxAttempts;

    ModelPreparationWorker(ModelPreparationLedger ledger, ModelRepository models,
            RuntimeEnvironmentRepository environments, RuntimeBuilderClient builder, ModelRuntimeClient runtime,
            @Value("${mlsuite.model-preparation.lease-seconds}") int leaseSeconds,
            @Value("${mlsuite.model-preparation.max-attempts}") int maxAttempts) {
        this.ledger = ledger;
        this.models = models;
        this.environments = environments;
        this.builder = builder;
        this.runtime = runtime;
        this.leaseSeconds = leaseSeconds;
        this.maxAttempts = maxAttempts;
    }

    @Scheduled(fixedDelayString = "${mlsuite.model-preparation.poll-ms}")
    void work() {
        Optional<Long> claimed;
        while ((claimed = ledger.claim(worker, leaseSeconds)).isPresent()) {
            prepare(claimed.get());
        }
    }

    void prepare(Long modelId) {
        Optional<RunnableModel> found = models.findRunnableModel(modelId);
        if (found.isEmpty()) return; // deleted since it was claimed
        RunnableModel model = found.get();
        try {
            RuntimeEnvironment environment = environments.findById(model.environmentKey()).orElseThrow();
            if (!environment.isLegacy()) builder.build(environment);
            Map<String, Object> answer = runtime.verify(model);
            ledger.ready(modelId, worker, importances(answer.get("featureImportances")));
            log.info("Model {} is ready in environment {}", modelId, model.environmentKey());
        } catch (AnalyzerServiceException ex) {
            if (ex.getStatus() == 400 || ex.getStatus() == 422) {
                log.warn("Model {} cannot run: {}", modelId, ex.getDetail());
                ledger.fail(modelId, worker, ex.getDetail());
            } else {
                later(modelId, ex.getDetail());
            }
        } catch (RuntimeException ex) {
            log.error("Preparing model {} failed", modelId, ex);
            later(modelId, "The environment could not be prepared");
        }
    }

    private void later(Long modelId, String reason) {
        if (ledger.retryOrFail(modelId, worker, reason, maxAttempts, FIRST_DELAY_SECONDS, MAX_DELAY_SECONDS)) {
            log.warn("Model {} failed after {} attempts: {}", modelId, maxAttempts, reason);
        } else {
            log.info("Model {} is tried again later: {}", modelId, reason);
        }
    }

    private static List<Map<String, Object>> importances(Object value) {
        if (!(value instanceof List<?> items)) return null;
        return items.stream().filter(Map.class::isInstance).map(item -> {
            Map<String, Object> importance = new LinkedHashMap<>();
            ((Map<?, ?>) item).forEach((key, entry) -> importance.put(String.valueOf(key), entry));
            return importance;
        }).toList();
    }
}
