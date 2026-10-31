package dev.ulloasp.mlsuite;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Profile;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

import dev.ulloasp.mlsuite.storage.ArtifactJobCommand;
import dev.ulloasp.mlsuite.storage.ArtifactOrphanReconciliationService;
import dev.ulloasp.mlsuite.storage.ArtifactVerificationService;
import dev.ulloasp.mlsuite.storage.ObjectStorageConfig;

/**
 * The one-shot {@code artifact-prune} job: removes artifact objects no model refers to or, with
 * {@code ARTIFACT_JOB=verify}, checks every model's artifact against its persisted hash.
 */
@Configuration(proxyBeanMethods = false)
@Profile("artifact-prune")
@EnableAutoConfiguration
@EntityScan("dev.ulloasp.mlsuite")
@EnableJpaRepositories("dev.ulloasp.mlsuite")
@Import({
        ObjectStorageConfig.class,
        ArtifactOrphanReconciliationService.class,
        ArtifactVerificationService.class,
        ArtifactJobCommand.class
})
public class ArtifactPruneApplication {

    static void run(String[] args) {
        SpringApplication application = new SpringApplication(ArtifactPruneApplication.class);
        application.setAdditionalProfiles("artifact-prune");
        application.setWebApplicationType(WebApplicationType.NONE);
        try (ConfigurableApplicationContext ignored = application.run(args)) {
            // The job is executed by ArtifactJobCommand.
        }
    }
}
