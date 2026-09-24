package dev.ulloasp.mlsuite;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers(disabledWithoutDocker = true)
class DatabaseMigrationApplicationTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:18.6")
            .withDatabaseName("mlsuite")
            .withUsername("mlsuite")
            .withPassword("mlsuite");

    @Test
    void startsMigrationContextWithoutJpaAndAppliesMigrations() {
        SpringApplication application = new SpringApplication(DatabaseMigrationApplication.class);
        application.setWebApplicationType(WebApplicationType.NONE);

        try (var context = application.run(
                "--spring.profiles.active=database-migration",
                "--spring.datasource.url=" + POSTGRES.getJdbcUrl(),
                "--spring.datasource.username=" + POSTGRES.getUsername(),
                "--spring.datasource.password=" + POSTGRES.getPassword(),
                "--spring.flyway.user=" + POSTGRES.getUsername(),
                "--spring.flyway.password=" + POSTGRES.getPassword(),
                "--logging.file.name=target/database-migration-test.log")) {
            assertEquals("5", context.getBean(Flyway.class).info().current().getVersion().toString());
        }
    }
}
