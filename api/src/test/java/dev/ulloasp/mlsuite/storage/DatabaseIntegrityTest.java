package dev.ulloasp.mlsuite.storage;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.sql.SQLException;

import org.junit.jupiter.api.Test;

/**
 * What the database keeps true by itself, whatever writes to it: every author is a principal that
 * outlives its account, a row names its parents' keys and a composite key refuses a wrong one, references
 * stay within one organization, schema, snapshot or review, and a queue's state agrees
 * with its columns.
 */
class DatabaseIntegrityTest extends DatabaseFixture {

    @Test
    void aPersonIsAPrincipalThatOutlivesTheirAccount() throws SQLException {
        long user = user("ada");
        long principal = number("SELECT id FROM principal WHERE user_id = " + user);
        long org = organization("lab", principal);

        run("DELETE FROM app_user WHERE id = " + user);

        assertNull(text("SELECT user_id::text FROM principal WHERE id = " + principal));
        assertEquals("Deleted user", text("SELECT former_label FROM principal WHERE id = " + principal));
        assertEquals(principal, number("SELECT created_by_principal_id FROM organization WHERE id = " + org));
    }

    @Test
    void anApiClientIsAPrincipalLeftWithItsName() throws SQLException {
        long org = organization("lab", platform());
        long client = number("INSERT INTO api_client (organization_id, name, created_by_principal_id, updated_by_principal_id,"
                + " created_at, updated_at) VALUES (" + org + ", 'Lab2Pressure', " + PLATFORM + ", " + PLATFORM
                + ", now(), now()) RETURNING id");
        long principal = number("SELECT id FROM principal WHERE api_client_id = " + client);

        run("DELETE FROM api_client WHERE id = " + client);

        assertEquals("Lab2Pressure", text("SELECT former_label FROM principal WHERE id = " + principal));
    }

    @Test
    void rowsNameTheirParentsKeysAndCannotPointAcrossThem() throws SQLException {
        long org = organization("lab", platform());
        long schema = schema(org, "risk");
        long elsewhere = organization("elsewhere", platform());
        assertRefused("fk_schema_version_schema", "INSERT INTO schema_version (organization_id, schema_id, version_number,"
                + " form_schema, created_by_principal_id, created_at) VALUES (" + elsewhere + ", " + schema + ", 1, '{}', "
                + PLATFORM + ", now())");
        long version = version(schema, 1);

        long otherVersion = version(schema(org, "other"), 1);
        assertRefused("fk_schema_bookmark_version", "INSERT INTO schema_bookmark (schema_id, schema_version_id, name,"
                + " created_by_principal_id, updated_by_principal_id, created_at, updated_at) VALUES (" + schema + ", "
                + otherVersion + ", 'production', " + PLATFORM + ", " + PLATFORM + ", now(), now())");

        long model = model(org, "forest");
        long unbound = model(org, "tree");
        assertRefused("fk_schema_binding_model", binding(org, version, model(elsewhere, "forest")));
        run(binding(org, version, model));

        long run = predictionRun(version, "first");
        assertRefused("fk_prediction_result_binding", result(run, unbound));
        run(result(run, model));
    }

    @Test
    void anAnswerInAReviewIsOnARunItCoversByOneOfItsMembers() throws SQLException {
        long org = organization("lab", platform());
        long version = version(schema(org, "risk"), 1);
        long model = model(org, "forest");
        run(binding(org, version, model));
        long covered = number(result(predictionRun(version, "covered"), model) + " RETURNING id");
        long other = number(result(predictionRun(version, "other"), model) + " RETURNING id");
        long review = number("INSERT INTO schema_review (public_id, organization_id, schema_id, schema_version_id, expires_at,"
                + " created_by_principal_id, updated_by_principal_id, created_at, updated_at) SELECT 'r', organization_id,"
                + " schema_id, id, now() + interval '1 day', " + PLATFORM + ", " + PLATFORM + ", now(), now()"
                + " FROM schema_version WHERE id = " + version + " RETURNING id");
        long reviewRun = number("INSERT INTO schema_review_run (public_id, schema_version_id, schema_review_id,"
                + " prediction_run_id, created_by_principal_id, created_at) SELECT 'rr', schema_version_id, " + review
                + ", prediction_run_id, " + PLATFORM + ", now() FROM prediction_result WHERE id = " + covered + " RETURNING id");
        long member = user("ada");
        long stranger = user("eve");
        run("INSERT INTO organization_membership (organization_id, user_id, role_definition_id, status, created_by_principal_id,"
                + " updated_by_principal_id, created_at, updated_at) VALUES (" + org + ", " + member + ", " + role(org)
                + ", 'ACTIVE', " + PLATFORM + ", " + PLATFORM + ", now(), now())");
        String assign = "INSERT INTO schema_review_assignee (organization_id, schema_review_id, user_id,"
                + " created_by_principal_id, created_at) VALUES (" + org + ", " + review + ", %d, " + PLATFORM + ", now())";
        run(assign.formatted(member));
        assertRefused("fk_review_assignee_member", assign.formatted(stranger));

        String submit = "INSERT INTO schema_review_run_submission (schema_review_id, schema_review_run_id, user_id,"
                + " submitted_at) VALUES (" + review + ", " + reviewRun + ", %d, now())";
        run(submit.formatted(member));
        assertRefused("fk_schema_review_submission_assignee", submit.formatted(stranger));

        String answer = "INSERT INTO prediction_result_feedback (prediction_run_id, prediction_result_id, schema_review_id,"
                + " feedback_type, question_index, data_value, created_by_principal_id, updated_by_principal_id, created_at,"
                + " updated_at) SELECT x.prediction_run_id, x.id, " + review + ", 'OUTPUT', 0, '1', p.id, p.id, now(), now()"
                + " FROM prediction_result x, principal p WHERE x.id = %d AND p.user_id = %d";
        run(answer.formatted(covered, member));
        assertRefused("fk_result_feedback_review_run", answer.formatted(other, member));
        assertRefused("ck_result_feedback_reviewer", answer.formatted(covered, stranger));
        assertRefused("ck_result_feedback_fixed", "UPDATE prediction_result_feedback SET question_index = 1");

        // A review goes whole: its reviewers, runs, submissions, answers and their history.
        run("DELETE FROM schema_review WHERE id = " + review);
        assertEquals(0, number("SELECT (SELECT count(*) FROM prediction_result_feedback) + (SELECT count(*) FROM"
                + " prediction_result_feedback_revision) + (SELECT count(*) FROM schema_review_run)"));
    }

    @Test
    void aRoleIsGrantedOnlyInItsOwnOrganization() throws SQLException {
        long lab = organization("lab", platform());
        long foreignRole = number("INSERT INTO role_definition (organization_id, name, slug, locked, created_by_principal_id,"
                + " updated_by_principal_id, created_at, updated_at) VALUES (" + organization("elsewhere", platform())
                + ", 'Member', 'member', true, " + PLATFORM + ", " + PLATFORM + ", now(), now()) RETURNING id");
        assertRefused("fk_org_membership_role_definition", "INSERT INTO organization_membership (organization_id, user_id,"
                + " role_definition_id, status, created_by_principal_id, updated_by_principal_id, created_at, updated_at)"
                + " VALUES (" + lab + ", " + user("ada") + ", " + foreignRole + ", 'ACTIVE', " + PLATFORM + ", " + PLATFORM
                + ", now(), now())");
    }

    @Test
    void anAddressHasOneAccountAndOnePendingInvitationPerOrganization() throws SQLException {
        user("ada");
        assertRefused("uq_app_user_email_lower", "INSERT INTO app_user (username, email, full_name, password_hash, enabled,"
                + " system_role, created_at, updated_at) VALUES ('ada2', 'ADA@example.test', 'Ada', 'x', true, 'USER',"
                + " now(), now())");

        long lab = organization("lab", platform());
        long role = role(lab);
        String invite = "INSERT INTO invitation (organization_id, role_definition_id, email, status, expires_at,"
                + " created_by_principal_id, updated_by_principal_id, created_at, updated_at) VALUES (" + lab + ", " + role
                + ", '%s', '%s', now() + interval '1 day', " + PLATFORM + ", " + PLATFORM + ", now(), now())";
        run(invite.formatted("grace@example.test", "PENDING"));
        run(invite.formatted("grace@example.test", "REVOKED"));
        assertRefused("uq_invitation_pending_email", invite.formatted("Grace@Example.test", "PENDING"));
    }

    @Test
    void aJobIsLeasedOnlyWhileItRunsAndFinishedExactlyWhenItEnded() throws SQLException {
        long org = organization("lab", platform());
        long version = version(schema(org, "risk"), 1);
        long bookmark = bookmark(version);
        long schema = number("SELECT schema_id FROM schema_version WHERE id = " + version);
        String job = "INSERT INTO prediction_job (organization_id, schema_id, schema_bookmark_id, schema_version_id, status,"
                + " total_rows, lease_owner, lease_expires_at, finished_at, created_by_principal_id, updated_by_principal_id,"
                + " created_at, updated_at) VALUES (" + org + ", " + schema + ", " + bookmark + ", " + version
                + ", '%s', 1, %s, %s, %s, " + PLATFORM + ", " + PLATFORM + ", now(), now())";
        run(job.formatted("RUNNING", "'worker'", "now()", "NULL"));
        assertRefused("ck_prediction_job_lease", job.formatted("QUEUED", "'worker'", "now()", "NULL"));
        assertRefused("ck_prediction_job_lease", job.formatted("RUNNING", "NULL", "NULL", "NULL"));
        assertRefused("ck_prediction_job_finished", job.formatted("CANCELLED", "NULL", "NULL", "NULL"));
        assertRefused("ck_prediction_job_completed", job.formatted("COMPLETED", "NULL", "NULL", "now()"));

        long otherVersion = version(schema(org, "other"), 1);
        assertRefused("fk_prediction_job_version", job.replace(", " + version + ", '%s'", ", " + otherVersion + ", '%s'")
                .formatted("RUNNING", "'worker'", "now()", "NULL"));
    }

    @Test
    void aClientRunsOnlyItsOrganizationsBookmarks() throws SQLException {
        long org = organization("lab", platform());
        long client = number("INSERT INTO api_client (organization_id, name, created_by_principal_id, updated_by_principal_id,"
                + " created_at, updated_at) VALUES (" + org + ", 'Lab2Pressure', " + PLATFORM + ", " + PLATFORM
                + ", now(), now()) RETURNING id");
        String grant = "INSERT INTO api_client_bookmark (organization_id, schema_id, api_client_id, schema_bookmark_id,"
                + " created_by_principal_id, created_at) SELECT " + org + ", schema_id, " + client + ", id, " + PLATFORM
                + ", now() FROM schema_bookmark WHERE id = %d";

        run(grant.formatted(bookmark(version(schema(org, "risk"), 1))));
        long foreign = bookmark(version(schema(organization("elsewhere", platform()), "risk"), 1));
        assertRefused("fk_api_client_bookmark_schema", grant.formatted(foreign));
    }
}
