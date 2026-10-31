package dev.ulloasp.mlsuite.admin.purge;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationPurgingException;
import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.schema.PublicPredictionFixture;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResult;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedback;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedbackChange;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedbackRevision;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedbackType;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultStatus;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRunStatus;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaDraft;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReview;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewAssignee;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewRun;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewRunSubmission;
import dev.ulloasp.mlsuite.user.domain.model.DeletedUser;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;

/** The purge on PostgreSQL, with its real foreign keys, over an organization with a row of everything. */
class PurgeIntegrationTest extends PublicPredictionFixture {

    private static final List<String> ORGANIZATION_TABLES = List.of("model", "schema_artifact", "plugin_metadata",
            "schema_review", "invitation", "organization_membership", "role_definition", "api_client", "api_request",
            "prediction_job");

    @Autowired PurgeRequestService purges;
    @Autowired PurgeWorker worker;
    @Autowired PurgeLedger ledger;
    @Autowired PurgeSteps steps;
    @Autowired WorkspaceAccessService access;

    private JdbcTemplate jdbc;
    private User superadmin;
    private User member;
    private RoleDefinition ownerRole;

    @BeforeEach
    void populate() {
        jdbc = new JdbcTemplate(dataSource);
        ownerRole = authorizeOwner();
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        inTransaction(() -> {
            superadmin = new User("root-" + suffix, "root-" + suffix + "@example.test", "x", "Root", SystemRole.SUPERADMIN);
            member = new User("member-" + suffix, "member-" + suffix + "@example.test", "x", "Member", SystemRole.USER);
            entityManager.persist(superadmin);
            entityManager.persist(member);
            entityManager.persist(new OrganizationMembership(organization, member,
                    entityManager.getReference(RoleDefinition.class, ownerRole.getId()), MembershipStatus.ACTIVE));
            entityManager.createQuery("update OrganizationMembership m set m.roleDefinition = :role where m.user.id = :id")
                    .setParameter("role", ownerRole).setParameter("id", member.getId()).executeUpdate();
            answeredRun("first", owner);
            entityManager.persist(new SchemaDraft(schema, version, "wip", Map.of("fields", List.of()), List.of()));
        });
        Long job = jdbc.queryForObject("""
                INSERT INTO prediction_job (organization_id, schema_bookmark_id, schema_version_id, created_by_user_id,
                    status, total_rows, created_at, updated_at) VALUES (?, ?, ?, ?, 'RUNNING', 1, now(), now())
                RETURNING id""", Long.class, organization.getId(), bookmark.getId(), version.getId(), owner.getId());
        jdbc.update("""
                INSERT INTO prediction_job_row (job_id, row_index, name, input_data, model_inputs, status)
                VALUES (?, 0, 'row', '{}', '[]', 'PENDING')""", job);
        jdbc.update("""
                INSERT INTO plugin_metadata (id, organization_id, plugin_type, file_name, content_type, object_key,
                    size_bytes, created_at, updated_at) VALUES (?, ?, 'field', 'p.ts', 'text/plain', ?, 1, now(), now())""",
                suffix, organization.getId(), "organizations/" + organization.getId() + "/plugins/items/" + suffix + ".json");
        jdbc.update("""
                INSERT INTO invitation (organization_id, invited_by_user_id, role_definition_id, email, status,
                    expires_at, created_at, updated_at)
                VALUES (?, ?, ?, 'x@example.test', 'REVOKED', now(), now(), now())""",
                organization.getId(), owner.getId(), ownerRole.getId());
        Long client = jdbc.queryForObject("""
                INSERT INTO api_client (organization_id, name, created_by_name, created_at, updated_at)
                VALUES (?, ?, 'Owner', now(), now()) RETURNING id""", Long.class, organization.getId(), "client-" + suffix);
        jdbc.update("INSERT INTO api_client_bookmark (api_client_id, schema_bookmark_id) VALUES (?, ?)", client, bookmark.getId());
        jdbc.update("""
                INSERT INTO api_request (request_id, organization_id, api_client_id, client_name, key_prefix, status,
                    duration_ms, created_at) VALUES (?, ?, ?, 'c', 'k', 200, 1, now())""",
                UUID.randomUUID(), organization.getId(), client);
    }

    private void answeredRun(String name, User reviewer) {
        PredictionRun run = new PredictionRun(bookmark, version, name + "-" + UUID.randomUUID(), Map.of("Age", 1),
                PredictionRunStatus.SUCCESS);
        entityManager.persist(run);
        PredictionResult result = new PredictionResult(run, entityManager.find(forestModel.getClass(), forestModel.getId()),
                Map.of(), Map.of(), PredictionResultStatus.SUCCESS, null, null);
        entityManager.persist(result);
        SchemaReview review = new SchemaReview(entityManager.getReference(Organization.class, organization.getId()),
                schema, version, reviewer, OffsetDateTime.now().plusDays(1));
        entityManager.persist(review);
        entityManager.persist(new SchemaReviewAssignee(review, reviewer));
        SchemaReviewRun reviewRun = new SchemaReviewRun(review, run);
        entityManager.persist(reviewRun);
        entityManager.persist(new SchemaReviewRunSubmission(reviewRun, reviewer, OffsetDateTime.now()));
        PredictionResultFeedback answer = new PredictionResultFeedback(result, reviewer, review,
                PredictionResultFeedbackType.OUTPUT, 0, objectMapper.valueToTree(Map.of("a", 1)));
        entityManager.persist(answer);
        entityManager.flush();
        entityManager.persist(new PredictionResultFeedbackRevision(answer, PredictionResultFeedbackChange.CREATED,
                reviewer.getId(), OffsetDateTime.now()));
    }

    private PurgeJobDto purge(PurgeScope scope, Long id, String confirmation) {
        return purges.request(superadmin.getId(), new RequestPurgeRequest(scope, id, confirmation));
    }

    private long rows(String table, String column, Object value) {
        return jdbc.queryForObject("SELECT count(*) FROM " + table + " WHERE " + column + " = ?", Long.class, value);
    }

    private PurgeJobDto job(PurgeJobDto job) {
        return ledger.find(job.id()).orElseThrow();
    }

    @Test
    void anOrganizationGoesInForeignKeyOrderAndLeavesTheGlobalDataAndItsRecord() {
        long environments = jdbc.queryForObject("SELECT count(*) FROM runtime_environment", Long.class);
        Long organizationId = organization.getId();
        Long versionId = version.getId();
        PurgeJobDto job = purge(PurgeScope.ORGANIZATION, organizationId, "Acme Health");

        worker.work();

        PurgeJobDto done = job(job);
        assertEquals(PurgeStatus.COMPLETED, done.status());
        assertEquals(1L, done.counts().get("runs"));
        assertEquals(2L, done.counts().get("models"));
        ORGANIZATION_TABLES.forEach(table -> assertEquals(0, rows(table, "organization_id", organizationId), table));
        assertEquals(0, rows("organization", "id", organizationId));
        assertEquals(0, rows("prediction_run", "schema_version_id", versionId));
        assertEquals(0, rows("prediction_result_feedback_revision", "schema_version_id", versionId));
        assertEquals(environments, jdbc.queryForObject("SELECT count(*) FROM runtime_environment", Long.class));
        assertNotNull(jdbc.queryForObject("SELECT organization_label FROM audit_event WHERE action = 'PURGE_COMPLETED'"
                + " AND target_id = ?", String.class, done.id().toString()));
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM audit_event WHERE action = 'PURGE_REQUEST'"
                + " AND target_id = ?", Long.class, done.id().toString()));
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM notification WHERE kind = 'PURGE_COMPLETED'"
                + " AND recipient_user_id = ?", Long.class, superadmin.getId()));
        assertEquals(2, jdbc.queryForObject("SELECT count(*) FROM notification WHERE kind = 'ORGANIZATION_PURGED'"
                + " AND target_id = ?", Long.class, organizationId.toString()));
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM storage_deletion_task WHERE organization_id = ?"
                + " AND object_key = ? AND object_version_id = 'v1'", Long.class, organizationId,
                forestModel.getStorageObjectKey()));
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM storage_deletion_task WHERE organization_id = ?"
                + " AND object_key LIKE '%/plugins/%' AND object_version_id IS NULL", Long.class, organizationId));
        assertEquals(1, rows("app_user", "id", owner.getId()));
    }

    @Test
    void aPurgeGoesOnFromWhereACrashLeftIt() {
        PurgeJobDto asked = purge(PurgeScope.ORGANIZATION, organization.getId(), "Acme Health");
        PurgeJob dead = ledger.claim("dead-worker", 120).orElseThrow();
        steps.of(PurgePhase.PREPARE, dead).forEach(step -> step.batch().applyAsInt(1));
        steps.of(PurgePhase.JOBS, dead).forEach(step -> step.batch().applyAsInt(1));
        steps.of(PurgePhase.FEEDBACK, dead).getFirst().batch().applyAsInt(1);
        ledger.reach(asked.id(), PurgePhase.FEEDBACK);
        assertEquals(Optional.empty(), ledger.claim("other-worker", 120));

        jdbc.update("UPDATE purge_job SET lease_expires_at = now() - interval '1 second' WHERE id = ?", asked.id());
        worker.work();

        assertEquals(PurgeStatus.COMPLETED, job(asked).status());
        assertEquals(0, rows("organization", "id", organization.getId()));
        assertFalse(ledger.renew(asked.id(), "dead-worker", 120));
    }

    /** A bulk job holds the thread fixed-delay scheduled tasks share, and a purge must neither wait for it nor hold it. */
    @Test
    void purgesRunOnAThreadOfTheirOwn() {
        PurgeLedger idle = org.mockito.Mockito.mock(PurgeLedger.class);
        var thread = new java.util.concurrent.CompletableFuture<String>();
        org.mockito.Mockito.when(idle.claim(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyInt()))
                .thenAnswer(call -> {
                    thread.complete(Thread.currentThread().getName());
                    return Optional.empty();
                });
        PurgeWorker running = new PurgeWorker(idle, steps, null, org.mockito.Mockito.mock(
                org.springframework.transaction.PlatformTransactionManager.class), 10, 120, 5);

        running.start();
        try {
            assertEquals("purge-worker", thread.orTimeout(5, java.util.concurrent.TimeUnit.SECONDS).join());
        } finally {
            running.stop();
        }
    }

    @Test
    void concurrentWorkersNeverTakeTheSameJob() throws Exception {
        purge(PurgeScope.SCHEMA, schema.getId(), "Cardio risk");
        var pool = Executors.newFixedThreadPool(8);
        try {
            List<Callable<Optional<PurgeJob>>> claims = java.util.stream.IntStream.range(0, 8)
                    .<Callable<Optional<PurgeJob>>>mapToObj(n -> () -> ledger.claim("worker-" + n, 120)).toList();
            long claimed = 0;
            for (Future<Optional<PurgeJob>> claim : pool.invokeAll(claims)) {
                if (claim.get().isPresent()) claimed++;
            }
            assertEquals(1, claimed);
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void aPurgedModelTakesEverySnapshotThatBindsItAndLeavesTheSchema() {
        Long keptVersion = jdbc.queryForObject("""
                INSERT INTO schema_version (schema_id, version_number, name, form_schema_json, created_at)
                VALUES (?, 9, 'other', '{"fields":[]}', now()) RETURNING id""", Long.class, schema.getId());
        jdbc.update("INSERT INTO schema_model_binding (schema_version_id, model_id, created_at) VALUES (?, ?, now())",
                keptVersion, netModel.getId());
        Long purgedVersion = version.getId();
        PurgeJobDto asked = purge(PurgeScope.MODEL, forestModel.getId(), "risk-forest");

        worker.work();

        assertEquals(PurgeStatus.COMPLETED, job(asked).status());
        assertEquals(0, rows("model", "id", forestModel.getId()));
        assertEquals(1, rows("model", "id", netModel.getId()));
        assertEquals(0, rows("schema_version", "id", purgedVersion));
        assertEquals(0, rows("schema_bookmark", "id", bookmark.getId()));
        assertEquals(1, rows("schema_version", "id", keptVersion));
        assertEquals(1, rows("schema_artifact", "id", schema.getId()));
    }

    @Test
    void aPurgedSchemaLeavesItsModels() {
        PurgeJobDto asked = purge(PurgeScope.SCHEMA, schema.getId(), "Cardio risk");

        worker.work();

        assertEquals(PurgeStatus.COMPLETED, job(asked).status());
        assertEquals(0, rows("schema_artifact", "id", schema.getId()));
        assertEquals(2, rows("model", "organization_id", organization.getId()));
    }

    @Test
    void aPersonLeavesTheirTeamsDataAuthoredByNobodyAndTheirPersonalAccountGoes() throws Exception {
        Long[] personal = new Long[1];
        inTransaction(() -> {
            Organization account = Organization.personal(member);
            entityManager.persist(account);
            personal[0] = account.getId();
            answeredRun("by-member", entityManager.find(User.class, member.getId()));
            entityManager.createQuery("update PredictionRun r set r.createdByName = 'Member' where r.schemaVersion.id = :v")
                    .setParameter("v", version.getId()).executeUpdate();
        });
        jdbc.update("UPDATE prediction_run SET created_by_email = ? WHERE schema_version_id = ?", member.getEmail(), version.getId());
        jdbc.update("UPDATE model SET user_id = ? WHERE id = ?", member.getId(), forestModel.getId());
        jdbc.update("UPDATE schema_review SET created_by_user_id = ? WHERE organization_id = ?", member.getId(), organization.getId());

        PurgeJobDto asked = purge(PurgeScope.USER, member.getId(), member.getUsername());
        assertFalse(jdbc.queryForObject("SELECT enabled FROM app_user WHERE id = ?", Boolean.class, member.getId()));
        worker.work();

        assertEquals(PurgeStatus.COMPLETED, job(asked).status(), () -> Objects.toString(job(asked).error()));
        assertEquals(0, rows("app_user", "id", member.getId()));
        assertEquals(0, rows("organization", "id", personal[0]));
        assertEquals(1, rows("organization", "id", organization.getId()));
        assertNull(jdbc.queryForObject("SELECT user_id FROM model WHERE id = ?", Long.class, forestModel.getId()));
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM prediction_result_feedback f JOIN prediction_result x"
                + " ON x.id = f.prediction_result_id JOIN prediction_run r ON r.id = x.prediction_run_id"
                + " WHERE r.schema_version_id = ? AND f.user_id IS NULL AND f.visitor_id IS NULL", Long.class, version.getId()));
        assertEquals(DeletedUser.NAME, jdbc.queryForList(
                "SELECT created_by_name FROM prediction_run WHERE schema_version_id = ?", String.class, version.getId()).get(0));
        assertEquals(0, rows("prediction_run", "created_by_email", member.getEmail()));
        assertEquals(2, rows("schema_review", "organization_id", organization.getId()));
        assertEquals(0, rows("organization_membership", "user_id", member.getId()));
        mockMvc.perform(signedIn(get("/api/models/{id}", forestModel.getId()), owner.getId()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.updatedByName").value(DeletedUser.NAME));
    }

    @Test
    void aFailedPurgeShowsItsErrorKeepsItsTargetClosedAndCanBeRetried() {
        jdbc.execute("""
                CREATE FUNCTION refuse_purge() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'storage of bookmarks refused'; END $$
                LANGUAGE plpgsql""");
        jdbc.execute("CREATE TRIGGER refuse BEFORE DELETE ON schema_bookmark FOR EACH ROW EXECUTE FUNCTION refuse_purge()");
        PurgeJobDto asked;
        try {
            asked = purge(PurgeScope.SCHEMA, schema.getId(), "Cardio risk");
            worker.work();
        } finally {
            jdbc.execute("DROP TRIGGER refuse ON schema_bookmark");
            jdbc.execute("DROP FUNCTION refuse_purge");
        }

        PurgeJobDto failed = job(asked);
        assertEquals(PurgeStatus.FAILED, failed.status());
        assertTrue(failed.error().contains("storage of bookmarks refused"), failed.error());
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM notification WHERE kind = 'PURGE_FAILED'"
                + " AND recipient_user_id = ?", Long.class, superadmin.getId()));
        assertEquals(HttpStatus.CONFLICT, assertThrows(ResponseStatusException.class,
                () -> purge(PurgeScope.SCHEMA, schema.getId(), "Cardio risk")).getStatusCode());

        purges.retry(superadmin.getId(), asked.id());
        worker.work();

        assertEquals(PurgeStatus.COMPLETED, job(asked).status());
        assertEquals(HttpStatus.CONFLICT, assertThrows(ResponseStatusException.class,
                () -> purges.retry(superadmin.getId(), asked.id())).getStatusCode());
    }

    @Test
    void nothingStartsInATargetBeingPurged() throws Exception {
        purge(PurgeScope.ORGANIZATION, organization.getId(), "Acme Health");

        assertThrows(OrganizationPurgingException.class, () -> access.requireMembership(owner.getId(), organization.getId()));
        mockMvc.perform(signedIn(get("/api/workspace/context"), owner.getId())
                .header(WorkspaceAccessService.ORGANIZATION_HEADER, organization.getId()))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.message").value("Acme Health is being deleted."));
        mockMvc.perform(get("/api/public/bookmarks/{id}", bookmark.getPublicId())).andExpect(status().isNotFound());
    }

    @Test
    void refusesWhatMayNotBePurged() {
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> purge(PurgeScope.MODEL, forestModel.getId(), "risk-fores")).getStatusCode());
        inTransaction(() -> {
            entityManager.persist(Organization.personal(member));
            entityManager.persist(Organization.personal(superadmin));
        });
        assertEquals(HttpStatus.CONFLICT, assertThrows(ResponseStatusException.class,
                () -> purge(PurgeScope.USER, superadmin.getId(), superadmin.getUsername())).getStatusCode());
        Long personal = jdbc.queryForObject("SELECT id FROM organization WHERE owner_user_id = ?", Long.class, member.getId());
        assertEquals(HttpStatus.CONFLICT, assertThrows(ResponseStatusException.class,
                () -> purge(PurgeScope.ORGANIZATION, personal, member.getFullName())).getStatusCode());
        assertNull(purges.preview(superadmin.getId(), PurgeScope.USER, member.getId()).refusal(),
                "both the owner and the member hold the owner role, so neither is the only owner");
        jdbc.update("DELETE FROM organization_membership WHERE organization_id = ? AND user_id = ?",
                organization.getId(), owner.getId());
        String refusal = purges.preview(superadmin.getId(), PurgeScope.USER, member.getId()).refusal();
        assertTrue(refusal.contains("only owner of Acme Health"), refusal);
    }

    @Test
    void onlySuperadminsPreviewAndAskOverHttp() throws Exception {
        String body = objectMapper.writeValueAsString(
                new RequestPurgeRequest(PurgeScope.SCHEMA, schema.getId(), "Cardio risk"));
        mockMvc.perform(signedIn(get("/api/admin/purges"), owner.getId())).andExpect(status().isForbidden());
        mockMvc.perform(signedIn(post("/api/admin/purges").contentType(MediaType.APPLICATION_JSON).content(body), owner.getId()))
                .andExpect(status().isForbidden());

        mockMvc.perform(signedIn(get("/api/admin/purges/preview").param("scope", "SCHEMA")
                .param("targetId", schema.getId().toString()), superadmin.getId(), SystemRole.SUPERADMIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.confirmation").value("Cardio risk"))
                .andExpect(jsonPath("$.counts.runs").value(1))
                .andExpect(jsonPath("$.counts.answers").value(1))
                .andExpect(jsonPath("$.counts.bookmarks").value(1));
        mockMvc.perform(signedIn(post("/api/admin/purges").contentType(MediaType.APPLICATION_JSON).content(body),
                superadmin.getId(), SystemRole.SUPERADMIN))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("QUEUED"));
        mockMvc.perform(signedIn(get("/api/admin/purges"), superadmin.getId(), SystemRole.SUPERADMIN))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items[0].targetLabel").value("Cardio risk"));
        worker.work();
    }
}
