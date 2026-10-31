package dev.ulloasp.mlsuite.storage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;

public class ArtifactOrphanPruneCommand implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ArtifactOrphanPruneCommand.class);
    private final ArtifactOrphanReconciliationService reconciliation;
    private final long graceSeconds;

    public ArtifactOrphanPruneCommand(
            ArtifactOrphanReconciliationService reconciliation,
            @Value("${artifact.orphan-grace-seconds}") long graceSeconds) {
        this.reconciliation = reconciliation;
        this.graceSeconds = graceSeconds;
    }

    @Override
    public void run(ApplicationArguments args) {
        ArtifactOrphanReport report = reconciliation.prune(graceSeconds);
        log.info("Artifact orphan reconciliation completed. examined={}, deleted={}, failed={}",
                report.examined(), report.deleted(), report.failed());
        if (report.failed() > 0) {
            throw new IllegalStateException("Artifact orphan reconciliation finished with failures");
        }
    }
}
