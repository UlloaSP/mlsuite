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

import dev.ulloasp.mlsuite.storage.ArtifactOrphanPruneCommand;
import dev.ulloasp.mlsuite.storage.ArtifactOrphanReconciliationService;
import dev.ulloasp.mlsuite.storage.ObjectStorageConfig;

/** The one-shot {@code artifact-prune} job: removes artifact objects no model refers to. */
@Configuration(proxyBeanMethods = false)
@Profile("artifact-prune")
@EnableAutoConfiguration
@EntityScan("dev.ulloasp.mlsuite")
@EnableJpaRepositories("dev.ulloasp.mlsuite")
@Import({
        ObjectStorageConfig.class,
        ArtifactOrphanReconciliationService.class,
        ArtifactOrphanPruneCommand.class
})
public class ArtifactPruneApplication {

    static void run(String[] args) {
        SpringApplication application = new SpringApplication(ArtifactPruneApplication.class);
        application.setAdditionalProfiles("artifact-prune");
        application.setWebApplicationType(WebApplicationType.NONE);
        try (ConfigurableApplicationContext ignored = application.run(args)) {
            // The prune is executed by ArtifactOrphanPruneCommand.
        }
    }
}
