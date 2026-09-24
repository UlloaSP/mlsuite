package dev.ulloasp.mlsuite.storage;

import java.util.Locale;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;

import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.model.domain.model.ModelArtifactState;

public class ArtifactMigrationCommand implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ArtifactMigrationCommand.class);
    private final ArtifactMigrationProperties properties;
    private final ArtifactMigrationService service;
    private final ArtifactOrphanReconciliationService orphanReconciliation;
    private final ModelRepository models;

    public ArtifactMigrationCommand(
            ArtifactMigrationProperties properties,
            ArtifactMigrationService service,
            ArtifactOrphanReconciliationService orphanReconciliation,
            ModelRepository models) {
        this.properties = properties;
        this.service = service;
        this.orphanReconciliation = orphanReconciliation;
        this.models = models;
    }

    @Override
    public void run(ApplicationArguments args) {
        String command = properties.getCommand().toLowerCase(Locale.ROOT);
        switch (command) {
            case "migrate" -> requireSuccess("migration", service.migrate(properties));
            case "verify" -> requireSuccess("verification", service.verifyAll());
            case "retry-failed" -> log.info("Reset {} failed artifacts for retry", service.retryFailed());
            case "prune-orphans" -> pruneOrphans();
            case "status" -> logStatus();
            default -> throw new IllegalArgumentException("Unknown artifact migration command: " + command);
        }
    }

    private void pruneOrphans() {
        ArtifactOrphanReport report = orphanReconciliation.prune(properties.getOrphanGraceSeconds());
        log.info("Artifact orphan reconciliation completed. examined={}, deleted={}, failed={}",
                report.examined(), report.deleted(), report.failed());
        if (report.failed() > 0) {
            throw new IllegalStateException("Artifact orphan reconciliation finished with failures");
        }
    }

    private void requireSuccess(String operation, ArtifactMigrationReport report) {
        log.info("Artifact {} completed. examined={}, verified={}, failed={}",
                operation, report.examined(), report.verified(), report.failed());
        long unresolved = models.countByArtifactState(ModelArtifactState.FAILED)
                + models.countByArtifactState(ModelArtifactState.INLINE_ONLY)
                + models.countByArtifactState(ModelArtifactState.UNVERIFIED)
                + models.countByArtifactState(ModelArtifactState.RUNNING);
        if (report.failed() > 0 || unresolved > 0) {
            throw new IllegalStateException("Artifact " + operation + " finished with unresolved failures");
        }
    }

    private void logStatus() {
        for (ModelArtifactState state : ModelArtifactState.values()) {
            log.info("Artifact migration status {}={}", state, models.countByArtifactState(state));
        }
    }
}
