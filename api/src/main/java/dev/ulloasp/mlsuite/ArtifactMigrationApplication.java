package dev.ulloasp.mlsuite;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.context.annotation.Import;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

import dev.ulloasp.mlsuite.storage.ArtifactMigrationClaimRepository;
import dev.ulloasp.mlsuite.storage.ArtifactMigrationCommand;
import dev.ulloasp.mlsuite.storage.ArtifactMigrationProperties;
import dev.ulloasp.mlsuite.storage.ArtifactMigrationService;
import dev.ulloasp.mlsuite.storage.ModelArtifactWriter;
import dev.ulloasp.mlsuite.storage.ObjectStorageConfig;
import dev.ulloasp.mlsuite.storage.StorageDeletionQueue;

@Configuration(proxyBeanMethods = false)
@Profile("artifact-migration")
@org.springframework.boot.autoconfigure.EnableAutoConfiguration
@EntityScan("dev.ulloasp.mlsuite")
@EnableJpaRepositories("dev.ulloasp.mlsuite")
@EnableConfigurationProperties(ArtifactMigrationProperties.class)
@Import({
        ObjectStorageConfig.class,
        ModelArtifactWriter.class,
        StorageDeletionQueue.class,
        ArtifactMigrationClaimRepository.class,
        ArtifactMigrationService.class,
        ArtifactMigrationCommand.class
})
public class ArtifactMigrationApplication {

    static void run(String[] args) {
        SpringApplication application = new SpringApplication(ArtifactMigrationApplication.class);
        application.setAdditionalProfiles("artifact-migration");
        application.setWebApplicationType(WebApplicationType.NONE);
        try (ConfigurableApplicationContext ignored = application.run(args)) {
            // The command is executed by ArtifactMigrationCommand.
        }
    }
}
