package dev.ulloasp.mlsuite.storage;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Savepoint;
import java.util.Map;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.postgresql.util.PSQLException;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * A migrated database written to by hand, as any client could, one transaction per test that is
 * rolled back after it, with the rows the tests about the database's own rules are built from.
 */
@Testcontainers(disabledWithoutDocker = true)
abstract class DatabaseFixture {

    protected static final String PLATFORM = "(SELECT id FROM principal WHERE kind = 'SYSTEM')";

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:18.6")
            .withDatabaseName("mlsuite").withUsername("mlsuite").withPassword("mlsuite");

    protected Connection db;

    @BeforeAll
    static void migrate() {
        Flyway.configure().configuration(Map.of("flyway.postgresql.transactional.lock", "false"))
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword()).load().migrate();
    }

    @BeforeEach
    void open() throws SQLException {
        db = DriverManager.getConnection(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        db.setAutoCommit(false);
    }

    // Each test leaves nothing behind for the next.
    @AfterEach
    void close() throws SQLException {
        db.rollback();
        db.close();
    }

    protected long bookmark(long version) throws SQLException {
        return number("INSERT INTO schema_bookmark (schema_id, schema_version_id, name, created_by_principal_id,"
                + " updated_by_principal_id, created_at, updated_at) SELECT schema_id, id, 'production', " + PLATFORM + ", "
                + PLATFORM + ", now(), now() FROM schema_version WHERE id = " + version + " RETURNING id");
    }

    protected long predictionRun(long version, String name) throws SQLException {
        return number(runInsert(version, name, "SUCCESS", "WORKSPACE", PLATFORM, "SYSTEM") + " RETURNING id");
    }

    protected String runInsert(long version, String name, String status, String origin, String author, String kind) {
        return "INSERT INTO prediction_run (organization_id, schema_id, schema_version_id, name, input_data, status, origin,"
                + " created_by_principal_id, created_by_kind, created_at) SELECT organization_id, schema_id, id, '" + name + "', '{}', '"
                + status + "', '" + origin + "', " + author + ", '" + kind + "', now() FROM schema_version WHERE id = " + version;
    }

    protected String binding(long org, long version, long model) {
        return "INSERT INTO schema_model_binding (organization_id, schema_version_id, model_id, created_by_principal_id,"
                + " created_at) VALUES (" + org + ", " + version + ", " + model + ", " + PLATFORM + ", now())";
    }

    protected long role(long org) throws SQLException {
        return number("INSERT INTO role_definition (organization_id, name, slug, locked, created_by_principal_id,"
                + " updated_by_principal_id, created_at, updated_at) VALUES (" + org + ", 'Member', 'member', true, " + PLATFORM
                + ", " + PLATFORM + ", now(), now()) RETURNING id");
    }

    protected String result(long run, long model) {
        return "INSERT INTO prediction_result (schema_version_id, prediction_run_id, model_id, environment_key, status,"
                + " model_input, output, created_at) SELECT schema_version_id, id, " + model
                + ", repeat('e', 64), 'SUCCESS', '{}', '{}', now() FROM prediction_run WHERE id = " + run;
    }

    protected long platform() throws SQLException {
        return number("SELECT id FROM principal WHERE kind = 'SYSTEM'");
    }

    protected long user(String name) throws SQLException {
        return number("INSERT INTO app_user (username, email, full_name, password_hash, enabled, system_role, created_at,"
                + " updated_at) VALUES ('" + name + "', '" + name + "@example.test', '" + name + "', 'x', true, 'USER', now(),"
                + " now()) RETURNING id");
    }

    protected long organization(String slug, long author) throws SQLException {
        return number("INSERT INTO organization (slug, name, created_by_principal_id, updated_by_principal_id, created_at,"
                + " updated_at) VALUES ('" + slug + "', '" + slug + "', " + author + ", " + author + ", now(), now()) RETURNING id");
    }

    protected long schema(long org, String name) throws SQLException {
        return number("INSERT INTO schema (organization_id, name, created_by_principal_id, updated_by_principal_id,"
                + " created_at, updated_at) VALUES (" + org + ", '" + name + "', " + PLATFORM + ", " + PLATFORM
                + ", now(), now()) RETURNING id");
    }

    protected long version(long schema, int number) throws SQLException {
        return number("INSERT INTO schema_version (organization_id, schema_id, version_number, form_schema,"
                + " created_by_principal_id, created_at) SELECT organization_id, id, " + number + ", '{}', " + PLATFORM
                + ", now() FROM schema WHERE id = " + schema + " RETURNING id");
    }

    protected long model(long org, String name) throws SQLException {
        run("INSERT INTO runtime_environment (environment_key, writer_version, python_version, packages, created_at)"
                + " VALUES (repeat('e', 64), '0.3.1', '3.14.7', '[]', now()) ON CONFLICT (environment_key) DO NOTHING");
        return number("INSERT INTO model (organization_id, name, type, specific_type, file_name, storage_bucket,"
                + " storage_object_key, storage_version_id, storage_etag, size_bytes, artifact_sha256,"
                + " artifact_verified_at, input_schema, environment_key, created_by_principal_id,"
                + " updated_by_principal_id, created_at, updated_at) VALUES (" + org + ", '" + name + "', 'classifier',"
                + " 'Forest', 'm.mlbundle', 'bucket', 'models/" + org + "/" + name + "', 'v1', 'etag', 5, repeat('a', 64), now(), '{}', repeat('e', 64),"
                + " " + PLATFORM + ", " + PLATFORM + ", now(), now()) RETURNING id");
    }

    protected void assertRefused(String constraint, String sql) throws SQLException {
        Savepoint before = db.setSavepoint();
        PSQLException refused = assertThrows(PSQLException.class, () -> run(sql));
        db.rollback(before);
        assertEquals(constraint, refused.getServerErrorMessage().getConstraint(), refused.getMessage());
    }

    protected void run(String sql) throws SQLException {
        db.createStatement().execute(sql);
    }

    protected long number(String sql) throws SQLException {
        try (var result = db.createStatement().executeQuery(sql)) {
            result.next();
            return result.getLong(1);
        }
    }

    protected String text(String sql) throws SQLException {
        try (var result = db.createStatement().executeQuery(sql)) {
            result.next();
            return result.getString(1);
        }
    }
}
