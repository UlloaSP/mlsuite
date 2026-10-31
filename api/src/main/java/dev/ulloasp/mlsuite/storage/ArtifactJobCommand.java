package dev.ulloasp.mlsuite.storage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;

/** Runs what {@code ARTIFACT_JOB} asks of the one-shot job; finding a failure fails the job. */
public class ArtifactJobCommand implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ArtifactJobCommand.class);
    private final ArtifactOrphanReconciliationService reconciliation;
    private final ArtifactVerificationService verification;
    private final long graceSeconds;
    private final String job;

    public ArtifactJobCommand(
            ArtifactOrphanReconciliationService reconciliation,
            ArtifactVerificationService verification,
            @Value("${artifact.orphan-grace-seconds}") long graceSeconds,
            @Value("${artifact.job}") String job) {
        this.reconciliation = reconciliation;
        this.verification = verification;
        this.graceSeconds = graceSeconds;
        this.job = job;
    }

    @Override
    public void run(ApplicationArguments args) {
        switch (job) {
            case "prune" -> prune();
            case "verify" -> verify();
            default -> throw new IllegalArgumentException("ARTIFACT_JOB must be prune or verify.");
        }
    }

    private void prune() {
        ArtifactOrphanReport report = reconciliation.prune(graceSeconds);
        log.info("Artifact orphan reconciliation completed. examined={}, deleted={}, failed={}",
                report.examined(), report.deleted(), report.failed());
        if (report.failed() > 0) {
            throw new IllegalStateException("Artifact orphan reconciliation finished with failures");
        }
    }

    private void verify() {
        ArtifactVerificationReport report = verification.verify();
        log.info("Artifact verification completed. examined={}, failed={}", report.examined(), report.failed());
        if (report.failed() > 0) {
            throw new IllegalStateException("Artifact verification found " + report.failed() + " bad artifacts");
        }
    }
}
