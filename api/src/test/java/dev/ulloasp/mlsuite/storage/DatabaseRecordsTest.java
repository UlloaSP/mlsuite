package dev.ulloasp.mlsuite.storage;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

import org.junit.jupiter.api.Test;

/**
 * What the database keeps as a record, whatever writes to it: a model's artifact, a snapshot and its
 * bindings, a run and its results never change, and a run agrees with its results; a change of an
 * answer is kept with who made it and marks its run's projection stale; a pin stands only on a
 * public bookmark; an audited actor is of its principal's kind; a handle has one spelling.
 */
class DatabaseRecordsTest extends DatabaseFixture {

    @Test
    void aModelsArtifactASnapshotAndItsBindingsAreWrittenOnce() throws SQLException {
        long org = organization("lab", platform());
        long version = version(schema(org, "risk"), 1);
        long model = model(org, "forest");
        assertEquals(64, text("SELECT form_schema_sha256 FROM schema_version WHERE id = " + version).length());
        // A document's digest is of its UTF-8 text, escapes and all.
        long escaped = number("INSERT INTO schema_version (organization_id, schema_id, version_number, form_schema,"
                + " created_by_principal_id, created_at) SELECT organization_id, schema_id, 2,"
                + " '{\"label\": \"say \\\"hi\\\"\\nthen \\\\ é\"}', " + PLATFORM + ", now()"
                + " FROM schema_version WHERE id = " + version + " RETURNING id");
        assertEquals(text("SELECT encode(sha256(convert_to(form_schema::text, 'UTF8')), 'hex') FROM schema_version WHERE id = "
                + escaped), text("SELECT form_schema_sha256 FROM schema_version WHERE id = " + escaped));
        run(binding(org, version, model));
        predictionRun(version, "first");

        assertRefused("ck_model_artifact_fixed", "UPDATE model SET artifact_sha256 = repeat('b', 64) WHERE id = " + model);
        run("UPDATE model SET name = 'renamed' WHERE id = " + model);
        assertRefused("ck_schema_version_fixed",
                "UPDATE schema_version SET form_schema = '{\"fields\":[]}' WHERE id = " + version);
        assertRefused("ck_schema_binding_fixed", "DELETE FROM schema_model_binding WHERE schema_version_id = " + version);
        assertRefused("ck_schema_binding_fixed", "UPDATE schema_model_binding SET plugin_policy = '{}' WHERE schema_version_id = "
                + version);
        run("UPDATE schema_version SET name = 'baseline' WHERE id = " + version);
    }

    @Test
    void aRunAndItsResultsAreRecordsThatOutliveTheirBookmark() throws SQLException {
        long org = organization("lab", platform());
        long version = version(schema(org, "risk"), 1);
        long model = model(org, "forest");
        run(binding(org, version, model));
        long bookmark = bookmark(version);
        long run = predictionRun(version, "first");
        run("UPDATE prediction_run SET schema_bookmark_id = " + bookmark + " WHERE id = " + run);
        long result = number(result(run, model) + " RETURNING id");

        assertRefused("ck_prediction_run_fixed", "UPDATE prediction_run SET name = 'second' WHERE id = " + run);
        assertRefused("ck_prediction_result_fixed", "UPDATE prediction_result SET output = '{\"a\":1}' WHERE id = " + result);
        assertRefused("uq_prediction_run_version_name", runInsert(version, "FIRST", "SUCCESS", "WORKSPACE", PLATFORM, "SYSTEM"));
        assertRefused("ck_prediction_run_origin_author", runInsert(version, "api", "SUCCESS", "API", PLATFORM, "SYSTEM"));
        assertRefused("fk_prediction_run_created_by", runInsert(version, "posing", "SUCCESS", "WORKSPACE", PLATFORM, "USER"));
        run("DELETE FROM schema_bookmark WHERE id = " + bookmark);
        assertNull(text("SELECT schema_bookmark_id::text FROM prediction_run WHERE id = " + run));

        // A result goes only with its run.
        run("SET CONSTRAINTS ALL IMMEDIATE");
        assertRefused("ck_prediction_result_with_run", "DELETE FROM prediction_result WHERE id = " + result);
        run("SET CONSTRAINTS ALL DEFERRED");
        run("DELETE FROM prediction_result WHERE id = " + result);
        run("DELETE FROM prediction_run WHERE id = " + run);
        run("SET CONSTRAINTS ALL IMMEDIATE");
    }

    @Test
    void aRunHasAResultForEveryBoundModelAndSaysHowTheyWent() throws SQLException {
        long org = organization("lab", platform());
        long version = version(schema(org, "risk"), 1);
        long model = model(org, "forest");
        run(binding(org, version, model));
        run(result(predictionRun(version, "first"), model));
        run("SET CONSTRAINTS ALL IMMEDIATE");
        run("SET CONSTRAINTS ALL DEFERRED");

        long failed = number(runInsert(version, "second", "FAILED", "WORKSPACE", PLATFORM, "SYSTEM") + " RETURNING id");
        run(result(failed, model));
        assertRefused("ck_prediction_run_results", "SET CONSTRAINTS ALL IMMEDIATE");
    }

    @Test
    void aSnapshotWrittenEarlierTakesNoNewBinding() throws SQLException {
        Connection open = db;
        long version;
        long model;
        long org;
        try (Connection committed = DriverManager.getConnection(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(),
                POSTGRES.getPassword())) {
            db = committed;
            committed.setAutoCommit(false);
            org = organization("frozen", platform());
            version = version(schema(org, "risk"), 1);
            run(binding(org, version, model(org, "forest")));
            committed.commit();
        } finally {
            db = open;
        }
        model = model(org, "tree");
        assertRefused("ck_schema_binding_fixed", binding(org, version, model));
    }

    @Test
    void aSnapshotKeepsThePluginsItWasPublishedWith() throws SQLException {
        long org = organization("lab", platform());
        long version = version(schema(org, "risk"), 1);
        long plugin = number("INSERT INTO plugin_metadata (public_id, organization_id, plugin_type, kind, file_name,"
                + " content_type, storage_bucket, storage_object_key, storage_version_id, size_bytes, artifact_sha256,"
                + " created_by_principal_id, updated_by_principal_id, created_at, updated_at) VALUES ('p', " + org
                + ", 'field', 'gauge', 'g.ts', 'text/plain', 'b', 'k', 'v1', 1, repeat('a', 64), " + PLATFORM + ", "
                + PLATFORM + ", now(), now()) RETURNING id");
        run("INSERT INTO schema_version_plugin (organization_id, schema_version_id, plugin_metadata_id) VALUES (" + org
                + ", " + version + ", " + plugin + ")");

        assertRefused("fk_schema_version_plugin_plugin", "DELETE FROM plugin_metadata WHERE id = " + plugin);
        run(binding(org, version, model(org, "forest")));
        predictionRun(version, "first");
        assertRefused("ck_schema_version_plugin_fixed", "DELETE FROM schema_version_plugin WHERE schema_version_id = " + version);
    }

    @Test
    void nothingNewIsWrittenUnderWhatAPurgeIsDeleting() throws SQLException {
        long org = organization("lab", platform());
        long version = version(schema(org, "risk"), 1);
        run("UPDATE schema SET purging_at = now() WHERE id = (SELECT schema_id FROM schema_version WHERE id = " + version + ")");

        assertRefused("ck_schema_bookmark_not_purging", "INSERT INTO schema_bookmark (schema_id, schema_version_id, name,"
                + " created_by_principal_id, updated_by_principal_id, created_at, updated_at) SELECT schema_id, id, 'late', "
                + PLATFORM + ", " + PLATFORM + ", now(), now() FROM schema_version WHERE id = " + version);
        run("UPDATE organization SET purging_at = now() WHERE id = " + org);
        assertRefused("ck_schema_not_purging", "INSERT INTO schema (organization_id, name, created_by_principal_id,"
                + " updated_by_principal_id, created_at, updated_at) VALUES (" + org + ", 'late', " + PLATFORM + ", "
                + PLATFORM + ", now(), now())");
    }

    @Test
    void aSnapshotBindsAtLeastOneModel() throws SQLException {
        version(schema(organization("lab", platform()), "risk"), 1);

        assertRefused("ck_schema_version_bound", "SET CONSTRAINTS ALL IMMEDIATE");
    }

    @Test
    void aPurgeListsOnlyTheSnapshotsOfItsRunningTarget() throws SQLException {
        long org = organization("lab", platform());
        long schema = schema(org, "risk");
        long version = version(schema, 1);
        long other = version(schema(org, "other"), 1);
        long job = number("INSERT INTO purge_job (scope, target_id, target_label, organization_id, created_by_principal_id,"
                + " updated_by_principal_id, status, phase, lease_owner, lease_expires_at, created_at, updated_at) VALUES"
                + " ('SCHEMA', " + schema + ", 'risk', " + org + ", " + PLATFORM + ", " + PLATFORM
                + ", 'RUNNING', 'PREPARE', 'worker', now(), now(), now()) RETURNING id");
        String list = "INSERT INTO purge_job_version (purge_job_id, schema_version_id) VALUES (" + job + ", %d)";

        run(list.formatted(version));
        assertRefused("ck_purge_job_version_target", list.formatted(other));
    }

    @Test
    void everyChangeOfAnAnswerIsKeptWithWhoMadeIt() throws SQLException {
        long org = organization("lab", platform());
        long version = version(schema(org, "risk"), 1);
        long model = model(org, "forest");
        run(binding(org, version, model));
        long result = number(result(predictionRun(version, "first"), model) + " RETURNING id");
        long answer = number("INSERT INTO prediction_result_feedback (prediction_run_id, prediction_result_id, feedback_type,"
                + " question_index, data_value, created_by_principal_id, updated_by_principal_id, created_at, updated_at)"
                + " SELECT prediction_run_id, id, 'OUTPUT', 0, '1', " + PLATFORM + ", " + PLATFORM
                + ", now(), now() FROM prediction_result WHERE id = " + result + " RETURNING id");
        run("UPDATE prediction_result_feedback SET data_value = '2' WHERE id = " + answer);

        assertRefused("ck_feedback_revision_actor", "DELETE FROM prediction_result_feedback WHERE id = " + answer);
        run("SELECT set_config('app.principal_id', " + PLATFORM + "::text, true)");
        run("DELETE FROM prediction_result_feedback WHERE id = " + answer);
        assertEquals("CREATED:1 UPDATED:2 DELETED:", text("SELECT string_agg(change_kind || ':' || coalesce(data_value::text, ''),"
                + " ' ' ORDER BY id) FROM prediction_result_feedback_revision WHERE feedback_id = " + answer));
        assertEquals(version, number("SELECT DISTINCT schema_version_id FROM prediction_result_feedback_revision"
                + " WHERE feedback_id = " + answer));
    }

    @Test
    void everyChangeOfAnAnswerMarksItsRunStale() throws SQLException {
        long org = organization("lab", platform());
        long version = version(schema(org, "risk"), 1);
        long model = model(org, "forest");
        run(binding(org, version, model));
        long run = predictionRun(version, "first");
        long result = number(result(run, model) + " RETURNING id");
        String changes = "SELECT answer_changes FROM prediction_run_projection WHERE prediction_run_id = " + run;

        long answer = number("INSERT INTO prediction_result_feedback (prediction_run_id, prediction_result_id, feedback_type,"
                + " question_index, data_value, created_by_principal_id, updated_by_principal_id, created_at, updated_at)"
                + " VALUES (" + run + ", " + result + ", 'OUTPUT', 0, '1', " + PLATFORM + ", " + PLATFORM
                + ", now(), now()) RETURNING id");
        assertEquals(1, number(changes));
        run("UPDATE prediction_result_feedback SET data_value = '2' WHERE id = " + answer);
        assertEquals(2, number(changes));
        run("SELECT set_config('app.principal_id', " + PLATFORM + "::text, true)");
        run("DELETE FROM prediction_result_feedback WHERE id = " + answer);
        assertEquals(3, number(changes));
    }

    @Test
    void aPinStandsOnlyWhileItsBookmarkIsPublic() throws SQLException {
        long org = organization("lab", platform());
        long bookmark = bookmark(version(schema(org, "risk"), 1));
        String pin = "INSERT INTO profile_pin (schema_bookmark_id, user_id, slot, created_by_principal_id,"
                + " updated_by_principal_id, created_at, updated_at) VALUES (" + bookmark + ", " + user("ada") + ", 0, "
                + PLATFORM + ", " + PLATFORM + ", now(), now())";
        run("SET CONSTRAINTS fk_profile_pin_bookmark IMMEDIATE");

        assertRefused("fk_profile_pin_bookmark", pin);
        run("UPDATE schema_bookmark SET visibility = 'PUBLIC', public_id = 'p' WHERE id = " + bookmark);
        run(pin);
        assertRefused("fk_profile_pin_bookmark", "UPDATE schema_bookmark SET visibility = 'PRIVATE' WHERE id = " + bookmark);
    }

    @Test
    void anAuditedActorIsOfItsPrincipalsKindAndAHandleHasOneSpelling() throws SQLException {
        long person = number("SELECT id FROM principal WHERE user_id = " + user("ada"));
        String event = "INSERT INTO audit_event (actor_kind, actor_principal_id, actor_label, action, target_type, ip,"
                + " created_at) VALUES ('%s', " + person + ", 'Ada', 'LOGIN', 'USER', '203.0.113.7', now())";

        run(event.formatted("USER"));
        assertRefused("fk_audit_event_actor", event.formatted("SYSTEM"));
        assertRefused("ck_app_user_username_handle", "INSERT INTO app_user (username, email, full_name, password_hash,"
                + " enabled, system_role, created_at, updated_at) VALUES ('Ada', 'other@example.test', 'Ada', 'x', true,"
                + " 'USER', now(), now())");
    }
}
