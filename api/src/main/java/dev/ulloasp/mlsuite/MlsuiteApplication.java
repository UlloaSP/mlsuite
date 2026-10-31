package dev.ulloasp.mlsuite;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class MlsuiteApplication {

    public static void main(String[] args) {
        String mode = System.getenv().getOrDefault("MLSUITE_MODE", "serve");
        if ("migrate".equalsIgnoreCase(mode)) {
            DatabaseMigrationApplication.run(args);
            return;
        }
        if ("artifact-prune".equalsIgnoreCase(mode)) {
            ArtifactPruneApplication.run(args);
            return;
        }
        SpringApplication.run(MlsuiteApplication.class, args);
    }
}
