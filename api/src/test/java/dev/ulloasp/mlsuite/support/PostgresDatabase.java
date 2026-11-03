package dev.ulloasp.mlsuite.support;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * The PostgreSQL the tests run against, migrated by Flyway like production. One container serves
 * every test class: Spring caches contexts across classes, so it must outlive each of them.
 *
 * <p>It holds two databases. Application contexts commit what their tests set up, so a test whose
 * every transaction rolls back, and which counts what it finds, gets the second one to itself.
 */
public final class PostgresDatabase {

    private static final String ROLLED_BACK = "mlsuite_rolled_back";

    private static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:18.6")
            .withDatabaseName("mlsuite")
            .withUsername("mlsuite")
            .withPassword("mlsuite");

    static {
        POSTGRES.start();
        try (Connection connection = DriverManager.getConnection(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
                Statement statement = connection.createStatement()) {
            statement.execute("CREATE DATABASE " + ROLLED_BACK);
        } catch (SQLException e) {
            throw new IllegalStateException("Could not create the test database " + ROLLED_BACK, e);
        }
    }

    private PostgresDatabase() {
    }

    /** For an application context; call it from a @DynamicPropertySource. */
    public static void register(DynamicPropertyRegistry registry) {
        register(registry, POSTGRES.getJdbcUrl());
    }

    /** For a test whose every transaction rolls back, such as a @DataJpaTest. */
    public static void registerRolledBack(DynamicPropertyRegistry registry) {
        register(registry, "jdbc:postgresql://" + POSTGRES.getHost() + ":"
                + POSTGRES.getMappedPort(PostgreSQLContainer.POSTGRESQL_PORT) + "/" + ROLLED_BACK);
    }

    /** Points the data source and Flyway at {@code url}. */
    private static void register(DynamicPropertyRegistry registry, String url) {
        registry.add("spring.datasource.url", () -> url);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.flyway.user", POSTGRES::getUsername);
        registry.add("spring.flyway.password", POSTGRES::getPassword);
    }
}
