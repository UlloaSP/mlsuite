package dev.ulloasp.mlsuite.support;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * The PostgreSQL the tests run against, migrated by Flyway like production. One container serves
 * every test class: Spring caches contexts across classes, so it must outlive each of them.
 */
public final class PostgresDatabase {

    private static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:18.6")
            .withDatabaseName("mlsuite")
            .withUsername("mlsuite")
            .withPassword("mlsuite");

    static {
        POSTGRES.start();
    }

    private PostgresDatabase() {
    }

    /** Points the data source and Flyway at the container; call it from a @DynamicPropertySource. */
    public static void register(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.flyway.user", POSTGRES::getUsername);
        registry.add("spring.flyway.password", POSTGRES::getPassword);
    }
}
